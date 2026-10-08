#!/usr/bin/env bash
#
# Phase 2, Stage A (part 2): the CloudFront distribution itself, plus the
# first deploy.
#
# Requires ./01-prereqs.sh to have run and the certificate to be ISSUED.
#
# Still invisible to visitors — no DNS points at this yet. At the end you get
# a *.cloudfront.net URL to test against before anything goes live.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

say "Checking AWS access"
require_aws

CERT_ARN="$(state_get CERT_ARN)" || die "No CERT_ARN in state. Run ./01-prereqs.sh first."
OAC_ID="$(state_get OAC_ID)"     || die "No OAC_ID in state. Run ./01-prereqs.sh first."
POLICY_ID="$(state_get POLICY_ID)" || die "No POLICY_ID in state. Run ./01-prereqs.sh first."
FN_ARN="$(state_get FN_ARN)"     || die "No FN_ARN in state. Run ./01-prereqs.sh first."

# ------------------------------------------------------ certificate gate
say "Certificate"
CERT_STATUS="$(awscli acm describe-certificate --certificate-arn "$CERT_ARN" \
  --region "$REGION" --query 'Certificate.Status' --output text)"
info "status: $CERT_STATUS"

if [ "$CERT_STATUS" != "ISSUED" ]; then
  die "Certificate is not ISSUED yet ($CERT_STATUS).
  Add the validation CNAMEs printed by 01-prereqs.sh to Squarespace, then:
    aws acm wait certificate-validated --certificate-arn $CERT_ARN --region $REGION"
fi

# ------------------------------------------------------- site build check
say "Site build"
[ -f "${SITE_DIR}/index.html" ] || die "No build at ${SITE_DIR}. Run: cd frontend && npm ci && npm run build"
info "found $(find "$SITE_DIR" -type f | wc -l) files in frontend/out"

# --------------------------------------------------------- distribution
say "CloudFront distribution"

DIST_ID="$(awscli cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, '${DOMAIN}')].Id | [0]" \
  --output text 2>/dev/null || echo "None")"

if [ "$DIST_ID" != "None" ] && [ -n "$DIST_ID" ]; then
  info "distribution already exists for ${DOMAIN}: $DIST_ID"
else
  CFG="$(mktemp)"
  cat > "$CFG" <<JSON
{
  "CallerReference": "${CALLER_REF_PREFIX}-$(date +%s)",
  "Comment": "B[U]ILT website (built-illinois.org)",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "Aliases": { "Quantity": 2, "Items": ["${DOMAIN}", "${WWW_DOMAIN}"] },
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "s3-site-origin",
        "DomainName": "${BUCKET}.s3.${REGION}.amazonaws.com",
        "OriginAccessControlId": "${OAC_ID}",
        "S3OriginConfig": { "OriginAccessIdentity": "" }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-site-origin",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "${POLICY_ID}",
    "FunctionAssociations": {
      "Quantity": 1,
      "Items": [
        { "FunctionARN": "${FN_ARN}", "EventType": "viewer-request" }
      ]
    }
  },
  "CustomErrorResponses": {
    "Quantity": 2,
    "Items": [
      { "ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 10 },
      { "ErrorCode": 404, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 10 }
    ]
  },
  "ViewerCertificate": {
    "ACMCertificateArn": "${CERT_ARN}",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "HttpVersion": "http2and3",
  "PriceClass": "PriceClass_100"
}
JSON

  info "creating distribution (PriceClass_100 = US/CA/EU edges, the cheapest tier)"
  confirm "Create the CloudFront distribution now?"

  DIST_ID="$(awscli cloudfront create-distribution \
    --distribution-config "file://$(awspath "$CFG")" \
    --query 'Distribution.Id' --output text)"
  rm -f "$CFG"
  info "created: $DIST_ID"
fi

state_set DIST_ID "$DIST_ID"

DIST_DOMAIN="$(awscli cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.DomainName' --output text)"
state_set DIST_DOMAIN "$DIST_DOMAIN"
info "domain: $DIST_DOMAIN"

# -------------------------------------------------------- bucket policy
say "Bucket policy (let this distribution read the bucket)"

POL="$(mktemp)"
cat > "$POL" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipalReadOnly",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET}/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::${EXPECTED_ACCOUNT}:distribution/${DIST_ID}"
        }
      }
    }
  ]
}
JSON

awscli s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$(awspath "$POL")"
rm -f "$POL"
info "only this distribution can read the bucket; it stays private to the world"

# -------------------------------------------------------- first upload
say "Uploading the site"
awscli s3 sync "$(awspath "$SITE_DIR")" "s3://${BUCKET}/" --delete
info "uploaded"

# ------------------------------------------------------------- wait
say "Waiting for the distribution to finish deploying (5–15 min)"
warn "Safe to Ctrl-C — the deploy continues without you. Re-check with:"
info "  aws cloudfront get-distribution --id ${DIST_ID} --query 'Distribution.Status' --output text"
awscli cloudfront wait distribution-deployed --id "$DIST_ID" || true

# ------------------------------------------------------------- verify
say "Test it — before any DNS points here"
cat <<TXT

    Open in a browser:   https://${DIST_DOMAIN}/

    Or check from here:

      curl -I https://${DIST_DOMAIN}/
      curl -I https://${DIST_DOMAIN}/about/
      curl -I https://${DIST_DOMAIN}/get-involved/
      curl -I https://${DIST_DOMAIN}/calendar/

      # security headers should all be present:
      curl -sI https://${DIST_DOMAIN}/ | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy'

    Everything must be 200 and the headers must be there before you touch DNS.
    The live site is still on GitHub Pages and completely unaffected.

    Next: ./03-route53-zone.sh
TXT
