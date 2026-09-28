#!/usr/bin/env bash
#
# Phase 2, Stage C: point built-illinois.org and www at CloudFront.
#
# THIS IS THE ONE THAT CHANGES THE LIVE SITE. Everything before it was
# invisible to visitors.
#
# Rollback is built in: ./04-cutover.sh --rollback restores the GitHub Pages
# records. With 300s TTLs that takes effect in about five minutes.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

# CloudFront's fixed hosted-zone id for alias records — the same for every
# distribution in every account. Not a typo.
CF_HOSTED_ZONE_ID="Z2FDTNDATAQYW2"

GH_PAGES_IPS=("185.199.108.153" "185.199.109.153" "185.199.110.153" "185.199.111.153")
TTL=300
# Rollback restores www as A records, never a CNAME to github.io — that CNAME
# is what blocked ACM from issuing for www (CAA_ERROR). See 03-route53-zone.sh.

ROLLBACK=false
[ "${1:-}" = "--rollback" ] && ROLLBACK=true

say "Checking AWS access"
require_aws

ZONE_ID="$(state_get ZONE_ID)" || die "No ZONE_ID in state. Run ./03-route53-zone.sh first."

# ------------------------------------------------------------- rollback
if $ROLLBACK; then
  say "ROLLBACK — restoring the GitHub Pages records"

  RR_ITEMS=""
  for ip in "${GH_PAGES_IPS[@]}"; do RR_ITEMS="${RR_ITEMS}{\"Value\":\"${ip}\"},"; done
  RR_ITEMS="${RR_ITEMS%,}"

  B="$(mktemp)"
  cat > "$B" <<JSON
{
  "Comment": "Rollback to GitHub Pages",
  "Changes": [
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "${DOMAIN}.", "Type": "A", "TTL": ${TTL},
        "ResourceRecords": [${RR_ITEMS}] } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "${WWW_DOMAIN}.", "Type": "A", "TTL": ${TTL},
        "ResourceRecords": [${RR_ITEMS}] } }
  ]
}
JSON
  confirm "Restore apex + www to GitHub Pages?"
  awscli route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
    --change-batch "file://$(awspath "$B")" --query 'ChangeInfo.Status' --output text
  rm -f "$B"
  info "rolled back — live again within ~${TTL}s"
  exit 0
fi

# ------------------------------------------------------------ pre-flight
DIST_ID="$(state_get DIST_ID)" || die "No DIST_ID in state. Run ./02-distribution.sh first."
DIST_DOMAIN="$(state_get DIST_DOMAIN)" || die "No DIST_DOMAIN in state."

say "Pre-flight"

STATUS="$(awscli cloudfront get-distribution --id "$DIST_ID" \
  --query 'Distribution.Status' --output text)"
[ "$STATUS" = "Deployed" ] || die "Distribution is '$STATUS', not Deployed. Wait, then re-run."
info "distribution : $DIST_ID ($STATUS)"

# Is the domain actually being served by Route 53 yet? If Squarespace is still
# authoritative, editing this zone changes nothing and you will think it failed.
CURRENT_NS="$(dig +short NS "${DOMAIN}" 2>/dev/null | head -1 || true)"
if [ -n "$CURRENT_NS" ]; then
  info "current NS   : $CURRENT_NS"
  case "$CURRENT_NS" in
    *awsdns*) info "delegation   : Route 53 (good)" ;;
    *) warn "delegation   : NOT Route 53 yet — Squarespace is still authoritative."
       warn "               Changing records here will have NO effect until you"
       warn "               switch nameservers (Stage B, step 3)." ;;
  esac
fi

HTTP="$(curl -s -o /dev/null -w '%{http_code}' "https://${DIST_DOMAIN}/" || echo 000)"
[ "$HTTP" = "200" ] || die "https://${DIST_DOMAIN}/ returned ${HTTP}, expected 200.
  Fix the distribution before pointing real traffic at it."
info "origin check : https://${DIST_DOMAIN}/ -> 200"

# --------------------------------------------------------------- cutover
say "Cutover"
cat <<TXT

    This repoints:

      ${DOMAIN}        A     -> ALIAS ${DIST_DOMAIN}
      ${WWW_DOMAIN}    CNAME -> ALIAS ${DIST_DOMAIN}

    Visitors start hitting CloudFront within ~${TTL}s.
    Undo at any time with:  ./04-cutover.sh --rollback

TXT
confirm "Point the live domain at CloudFront?"

B="$(mktemp)"
cat > "$B" <<JSON
{
  "Comment": "Phase 2 Stage C — apex + www to CloudFront",
  "Changes": [
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "${DOMAIN}.", "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${CF_HOSTED_ZONE_ID}",
          "DNSName": "${DIST_DOMAIN}.",
          "EvaluateTargetHealth": false } } },
    { "Action": "UPSERT", "ResourceRecordSet": {
        "Name": "${WWW_DOMAIN}.", "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "${CF_HOSTED_ZONE_ID}",
          "DNSName": "${DIST_DOMAIN}.",
          "EvaluateTargetHealth": false } } }
  ]
}
JSON

awscli route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file://$(awspath "$B")" --query 'ChangeInfo.Status' --output text
rm -f "$B"

say "Done — verify"
cat <<TXT

    Give it ~${TTL}s, then:

      curl -sI https://${DOMAIN}/ | head -1
      curl -sI https://${DOMAIN}/ | grep -iE 'strict-transport|content-security|x-frame'
      curl -sI https://${DOMAIN}/about/ | head -1

    You should now see the CloudFront security headers, which GitHub Pages
    never sent. Click through all four pages in a browser.

    If anything is wrong:   ./04-cutover.sh --rollback

    Once you are happy, finish Stage C by hand:
      1. Disable GitHub Pages in the repo settings
      2. Delete frontend/public/CNAME
      3. Retire .github/workflows/deployment.yml
TXT
