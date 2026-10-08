#!/usr/bin/env bash
#
# Phase 2, Stage A (part 1): everything that can exist before the TLS
# certificate is validated.
#
#   - requests the ACM certificate and prints the DNS records you must add
#     at Squarespace
#   - creates the private S3 bucket
#   - uploads + publishes the CloudFront Function
#   - creates the Origin Access Control
#   - creates the security response-headers policy
#
# Creates only. Deletes nothing. Safe to re-run — every step checks for an
# existing resource first.
#
# Nothing here is visible to visitors. The live site is untouched.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

say "Checking AWS access"
require_aws

# ---------------------------------------------------------------- 1. ACM
say "1/5  TLS certificate (ACM, ${REGION})"

CERT_ARN="$(awscli acm list-certificates --region "$REGION" \
  --query "CertificateSummaryList[?DomainName=='${DOMAIN}'].CertificateArn | [0]" \
  --output text 2>/dev/null || echo "None")"

if [ "$CERT_ARN" = "None" ] || [ -z "$CERT_ARN" ]; then
  info "requesting certificate for ${DOMAIN} + ${WWW_DOMAIN}"
  CERT_ARN="$(awscli acm request-certificate \
    --domain-name "$DOMAIN" \
    --subject-alternative-names "$WWW_DOMAIN" \
    --validation-method DNS \
    --region "$REGION" \
    --query CertificateArn --output text)"
  info "requested: $CERT_ARN"
  sleep 5   # validation options are not populated instantly
else
  info "reusing existing certificate: $CERT_ARN"
fi
state_set CERT_ARN "$CERT_ARN"

CERT_STATUS="$(awscli acm describe-certificate --certificate-arn "$CERT_ARN" \
  --region "$REGION" --query 'Certificate.Status' --output text)"
info "status: $CERT_STATUS"

# --------------------------------------------------------------- 2. S3
say "2/5  S3 bucket (private)"

if awscli s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  info "bucket already exists: $BUCKET"
else
  info "creating bucket: $BUCKET"
  # us-east-1 is the one region that must NOT be given a LocationConstraint.
  awscli s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
fi

awscli s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
info "public access: fully blocked (CloudFront reaches it via OAC)"
state_set BUCKET "$BUCKET"

# -------------------------------------------------- 3. CloudFront Function
say "3/5  CloudFront Function (directory-index rewrite)"
[ -f "$FUNCTION_FILE" ] || die "missing $FUNCTION_FILE"

if awscli cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  info "function already exists: $FUNCTION_NAME"
else
  info "creating function: $FUNCTION_NAME"
  awscli cloudfront create-function \
    --name "$FUNCTION_NAME" \
    --function-config "Comment=Map directory URLs to index.html for the Next.js static export,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://$(awspath "$FUNCTION_FILE")" >/dev/null
fi

FN_ETAG="$(awscli cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'ETag' --output text)"
FN_STAGE="$(awscli cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'FunctionSummary.FunctionMetadata.Stage' --output text)"

if [ "$FN_STAGE" != "LIVE" ]; then
  info "publishing function to LIVE"
  awscli cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$FN_ETAG" >/dev/null
else
  info "already published (LIVE)"
fi

FN_ARN="$(awscli cloudfront describe-function --name "$FUNCTION_NAME" \
  --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)"
state_set FN_ARN "$FN_ARN"
info "arn: $FN_ARN"

# ---------------------------------------------------------------- 4. OAC
say "4/5  Origin Access Control"

OAC_ID="$(awscli cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='${OAC_NAME}'].Id | [0]" \
  --output text 2>/dev/null || echo "None")"

if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  info "creating OAC: $OAC_NAME"
  OAC_ID="$(awscli cloudfront create-origin-access-control \
    --origin-access-control-config \
    "Name=${OAC_NAME},Description=Private S3 origin for the BUILT website,OriginAccessControlOriginType=s3,SigningBehavior=always,SigningProtocol=sigv4" \
    --query 'OriginAccessControl.Id' --output text)"
else
  info "reusing OAC: $OAC_ID"
fi
state_set OAC_ID "$OAC_ID"

# ------------------------------------------------- 5. Response headers
say "5/5  Security response-headers policy"

POLICY_ID="$(awscli cloudfront list-response-headers-policies --type custom \
  --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='${HEADERS_POLICY_NAME}'].ResponseHeadersPolicy.Id | [0]" \
  --output text 2>/dev/null || echo "None")"

if [ "$POLICY_ID" = "None" ] || [ -z "$POLICY_ID" ]; then
  info "creating policy: $HEADERS_POLICY_NAME"

  # NOTE on CSP: a Next.js static export hydrates via inline <script> blocks,
  # and there is no server to issue per-request nonces — so script-src must
  # allow 'unsafe-inline'. The policy still constrains *where* resources may
  # come from, which is the bulk of the value. Revisit if the site ever gains
  # a server-rendered surface.
  CSP="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src https://calendar.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"

  cat > /tmp/headers-policy.json <<JSON
{
  "Name": "${HEADERS_POLICY_NAME}",
  "Comment": "CSP/HSTS/etc for built-illinois.org",
  "SecurityHeadersConfig": {
    "StrictTransportSecurity": {
      "Override": true,
      "IncludeSubdomains": true,
      "Preload": false,
      "AccessControlMaxAgeSec": 31536000
    },
    "ContentTypeOptions": { "Override": true },
    "FrameOptions": { "Override": true, "FrameOption": "DENY" },
    "ReferrerPolicy": { "Override": true, "ReferrerPolicy": "strict-origin-when-cross-origin" },
    "ContentSecurityPolicy": { "Override": true, "ContentSecurityPolicy": "${CSP}" }
  },
  "CustomHeadersConfig": {
    "Quantity": 1,
    "Items": [
      {
        "Header": "Permissions-Policy",
        "Value": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        "Override": true
      }
    ]
  }
}
JSON

  POLICY_ID="$(awscli cloudfront create-response-headers-policy \
    --response-headers-policy-config file://$(awspath /tmp/headers-policy.json) \
    --query 'ResponseHeadersPolicy.Id' --output text)"
  rm -f /tmp/headers-policy.json
else
  info "reusing policy: $POLICY_ID"
fi
state_set POLICY_ID "$POLICY_ID"

# ------------------------------------------------------------- next steps
say "Done — now validate the certificate"

if [ "$CERT_STATUS" = "ISSUED" ]; then
  info "Certificate is already ISSUED. Go straight to ./02-distribution.sh"
else
  cat <<'TXT'

    The certificate is PENDING_VALIDATION. Add these CNAME records in the
    Squarespace DNS panel (they are ordinary subdomain records — no
    nameserver change needed, and nothing about the live site changes):

TXT
  awscli acm describe-certificate --certificate-arn "$CERT_ARN" --region "$REGION" \
    --query 'Certificate.DomainValidationOptions[].ResourceRecord' \
    --output table

  cat <<'TXT'
    Both entries are often identical — if so, add it once.

    Then wait for issuance (usually minutes, sometimes longer):

      awscli acm wait certificate-validated --certificate-arn <arn> --region us-east-1

    ...and run ./02-distribution.sh
TXT
fi

echo
info "state written to: $STATE_FILE"
