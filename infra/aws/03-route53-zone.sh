#!/usr/bin/env bash
#
# Phase 2, Stage B: create the Route 53 hosted zone and fill it with records
# IDENTICAL to what Squarespace serves today.
#
# Deliberately does NOT point anything at CloudFront. The goal of this stage
# is to move DNS *control* with zero user-visible change, so that if the
# nameserver switch goes wrong you know DNS is the cause and nothing else.
# The origin swap is a separate script (04-cutover.sh).
#
# Creates only. Changes nothing that is currently live — the zone is inert
# until you delegate to it at Squarespace.

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

say "Checking AWS access"
require_aws

# Today's live values — from docs/dns-inventory.md, verified 2026-09-28.
#
# NOTE: www is A records, NOT a CNAME to GitHub Pages, and must stay that way.
# CAA checks follow CNAMEs to their target, and github.io's CAA policy permits
# only Let's Encrypt / Sectigo / DigiCert — so while www CNAMEd there, ACM was
# forbidden from issuing for www (FailureReason: CAA_ERROR). A records point at
# the same IPs, behave identically (GitHub routes on the Host header), and keep
# the CAA chain clear. ACM re-checks CAA on auto-renewal, so reverting this
# would break renewal later.
GH_PAGES_IPS=("185.199.108.153" "185.199.109.153" "185.199.110.153" "185.199.111.153")
EOH_TARGET="d3vvzsqcqggbfd.cloudfront.net"
TTL=300   # short on purpose: makes the Stage C cutover reversible in minutes

# ------------------------------------------------------------- the zone
say "Hosted zone for ${DOMAIN}"

ZONE_ID="$(awscli route53 list-hosted-zones-by-name --dns-name "${DOMAIN}." \
  --query "HostedZones[?Name=='${DOMAIN}.'].Id | [0]" --output text 2>/dev/null || echo "None")"

if [ "$ZONE_ID" = "None" ] || [ -z "$ZONE_ID" ]; then
  info "creating hosted zone (~\$0.50/month)"
  confirm "Create the hosted zone for ${DOMAIN}?"
  ZONE_ID="$(awscli route53 create-hosted-zone \
    --name "$DOMAIN" \
    --caller-reference "${CALLER_REF_PREFIX}-zone-$(date +%s)" \
    --hosted-zone-config "Comment=built-illinois.org Phase 2 migration" \
    --query 'HostedZone.Id' --output text)"
else
  info "reusing existing zone"
fi

ZONE_ID="${ZONE_ID##*/}"   # strip the /hostedzone/ prefix
state_set ZONE_ID "$ZONE_ID"
info "zone id: $ZONE_ID"

# ---------------------------------------------------------- the records
say "Recreating today's records (NOT CloudFront — identical to Squarespace)"

RR_ITEMS=""
for ip in "${GH_PAGES_IPS[@]}"; do
  RR_ITEMS="${RR_ITEMS}{\"Value\":\"${ip}\"},"
done
RR_ITEMS="${RR_ITEMS%,}"

BATCH="$(mktemp)"
cat > "$BATCH" <<JSON
{
  "Comment": "Phase 2 Stage B — mirror of the current Squarespace zone",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN}.",
        "Type": "A",
        "TTL": ${TTL},
        "ResourceRecords": [${RR_ITEMS}]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${WWW_DOMAIN}.",
        "Type": "A",
        "TTL": ${TTL},
        "ResourceRecords": [${RR_ITEMS}]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "eoh.${DOMAIN}.",
        "Type": "CNAME",
        "TTL": ${TTL},
        "ResourceRecords": [{ "Value": "${EOH_TARGET}" }]
      }
    }
  ]
}
JSON

awscli route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --change-batch "file://$(awspath "$BATCH")" --query 'ChangeInfo.Status' --output text
rm -f "$BATCH"

# ------------------------------------------------ ACM validation records
# These MUST be carried across. ACM keeps using them for automatic renewal for
# the life of the certificate — drop them and the cert silently fails to renew
# roughly a year later, which is a miserable thing to debug. Sourced from ACM
# rather than hardcoded, so a reissued certificate stays correct.
say "ACM validation records (required for auto-renewal)"

# Covers EVERY live certificate on this domain, not just the site's — the EOH
# certificate has one too, and missing it would break that renewal just as
# silently.
VB="$(mktemp)"
python - "$DOMAIN" "$REGION" "$VB" <<'PY'
import json, subprocess, sys
domain, region, out = sys.argv[1], sys.argv[2], sys.argv[3]

arns = subprocess.run(
    ["aws", "acm", "list-certificates", "--region", region,
     "--query", "CertificateSummaryList[].CertificateArn", "--output", "text"],
    capture_output=True, text=True).stdout.split()

changes = {}
for arn in arns:
    raw = subprocess.run(
        ["aws", "acm", "describe-certificate", "--region", region,
         "--certificate-arn", arn, "--output", "json"],
        capture_output=True, text=True).stdout
    cert = json.loads(raw)["Certificate"]
    if cert["Status"] not in ("ISSUED", "PENDING_VALIDATION"):
        continue
    for dv in cert.get("DomainValidationOptions", []):
        rr = dv.get("ResourceRecord")
        if not rr or not rr["Name"].rstrip(".").endswith(domain):
            continue
        changes[rr["Name"]] = {"Action": "UPSERT", "ResourceRecordSet": {
            "Name": rr["Name"], "Type": rr["Type"], "TTL": 300,
            "ResourceRecords": [{"Value": rr["Value"]}]}}

json.dump({"Comment": "ACM validation - keep for renewal",
           "Changes": list(changes.values())}, open(out, "w"))
print(len(changes))
PY
VCOUNT="$(python -c "import json,sys;print(len(json.load(open(sys.argv[1]))['Changes']))" "$VB" 2>/dev/null || echo 0)"
if [ "$VCOUNT" -gt 0 ]; then
  awscli route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" \
    --change-batch "file://$(awspath "$VB")" --query 'ChangeInfo.Status' --output text >/dev/null
  info "carried over ${VCOUNT} validation record(s) from live certificates"
else
  warn "no ACM validation records found — if certificates exist, renewal may break"
fi
rm -f "$VB"

info "apex A  -> GitHub Pages (4 IPs)"
info "www     -> GitHub Pages (4 IPs, A records not CNAME - see CAA note above)"
info "eoh     -> ${EOH_TARGET}"
warn "_domainconnect is intentionally NOT carried over (Squarespace-only)"

# --------------------------------------------------------- nameservers
say "Verify, then delegate"

NS="$(awscli route53 get-hosted-zone --id "$ZONE_ID" \
  --query 'DelegationSet.NameServers' --output text | tr '\t' '\n')"

echo
echo "    Nameservers for Squarespace:"
echo "$NS" | sed 's/^/      /'
echo

FIRST_NS="$(echo "$NS" | head -1)"
cat <<TXT
    1) Verify the new zone answers correctly BEFORE delegating to it:

         dig @${FIRST_NS} ${DOMAIN} A +short
         dig @${FIRST_NS} ${WWW_DOMAIN} A +short
         dig @${FIRST_NS} eoh.${DOMAIN} CNAME +short

       (Windows: nslookup -type=A ${DOMAIN} ${FIRST_NS})

       These must match the live values exactly. A typo here goes dark the
       moment delegation takes effect.

    2) Lower the TTLs in the Squarespace panel and WAIT OUT the old TTL
       (currently 14400s = 4h) before step 3.

    3) In Squarespace: Use custom nameservers -> the four values above.

    4) After propagation, confirm NOTHING changed for visitors:

         dig ${DOMAIN} NS +short          # should show awsdns
         curl -I https://${DOMAIN}        # still GitHub Pages, still 200
         curl -I https://eoh.${DOMAIN}    # EOH still alive

    Only when all of that is clean: ./04-cutover.sh
TXT
