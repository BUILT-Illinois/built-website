#!/usr/bin/env bash
#
# Build and publish the site. Use this for every deploy after launch, until
# the GitHub Actions OIDC pipeline replaces it.
#
#   ./deploy.sh            build, upload, invalidate
#   ./deploy.sh --no-build  upload the existing frontend/out as-is

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.sh"

require_aws

BUCKET="$(state_get BUCKET || echo "$BUCKET")"
DIST_ID="$(state_get DIST_ID)" || die "No DIST_ID in state — has the distribution been created?"

if [ "${1:-}" != "--no-build" ]; then
  say "Building"
  ( cd "${REPO_ROOT}/frontend" && npm run build )
fi

[ -f "${SITE_DIR}/index.html" ] || die "No build at ${SITE_DIR}"

say "Uploading to s3://${BUCKET}/"
# Hashed assets under _next/ are immutable and safe to cache hard. Everything
# else (the HTML) must revalidate, or visitors keep seeing the old pages.
awscli s3 sync "$(awspath "$SITE_DIR")" "s3://${BUCKET}/" --delete \
  --exclude "_next/static/*" \
  --cache-control "public, max-age=0, must-revalidate"

awscli s3 sync "$(awspath "${SITE_DIR}/_next/static")" "s3://${BUCKET}/_next/static/" --delete \
  --cache-control "public, max-age=31536000, immutable"

say "Invalidating CloudFront"
ID="$(awscli cloudfront create-invalidation --distribution-id "$DIST_ID" \
  --paths "/*" --query 'Invalidation.Id' --output text)"
info "invalidation: $ID (usually under a minute)"

say "Done"
info "https://${DOMAIN}/"
