# Phase 2 provisioning scripts

AWS CLI scripts for putting built-illinois.org on S3 + CloudFront. They match
`docs/phase-2-runbook.md` step for step — read that for the *why*; this is the
*how*.

**These have not been run against real AWS.** They were written but never
executed (no credentials on the authoring machine), so treat the first run as a
review: read each script before running it, and expect to fix a typo or two.

## Before you start

```bash
aws configure           # or your SSO login — for the builtuiuc account
cd frontend && npm ci && npm run build && cd ..
```

Every script refuses to run unless `aws sts get-caller-identity` reports
account **242201276922** (`builtuiuc`), so a stale profile can't accidentally
provision into `tech-committee`.

## Order

| # | Script | What it does | Visible to visitors? |
|---|---|---|---|
| 1 | `01-prereqs.sh` | ACM cert request, S3 bucket, CloudFront Function, OAC, security headers policy | No |
| — | *you* | Add the printed validation CNAMEs at Squarespace, wait for ISSUED | No |
| 2 | `02-distribution.sh` | CloudFront distribution, bucket policy, first upload | No |
| — | *you* | Test the `*.cloudfront.net` URL it prints | No |
| 3 | `03-route53-zone.sh` | Hosted zone + today's records, **unchanged** | No |
| — | *you* | Lower TTLs, wait out the old TTL, switch nameservers at Squarespace | No¹ |
| 4 | `04-cutover.sh` | Points apex + www at CloudFront | **YES** |

¹ The nameserver switch moves DNS *control* without changing any answer, so
visitors see nothing — that separation is the whole point. If something breaks
at that step you know it was DNS, not the origin.

Ids are passed between scripts via `.provision-state` (gitignored). Every
script is safe to re-run; they check for existing resources first and never
delete anything.

## Rollback

```bash
./04-cutover.sh --rollback     # apex + www back to GitHub Pages, live in ~5 min
```

Records use a 300s TTL specifically so this is fast. Before step 4 there is
nothing to roll back — the live site never moved.

## After launch

```bash
./deploy.sh              # build, upload, invalidate
./deploy.sh --no-build   # upload frontend/out as-is
```

`deploy.sh` sets cache headers deliberately: hashed `_next/static/` assets get
a one-year immutable cache, HTML must revalidate. Get that backwards and
visitors keep seeing stale pages after a deploy.

This is a stopgap — the plan replaces it with GitHub Actions + OIDC so no
long-lived AWS keys exist anywhere.

## What these scripts deliberately do not do

- **Anything at Squarespace.** No API access: the validation CNAMEs, the TTL
  change and the nameserver switch are all manual. The nameserver switch is the
  only genuinely consequential moment in the migration and should be a
  deliberate human act.
- **Delete anything**, including the EOH resources. That teardown gates Phase 3
  (member PII sharing the account), not this launch.
- **Disable GitHub Pages.** Do that by hand once you're happy with the cutover,
  so there's a working fallback until the last moment.

## Notes on choices

- `PriceClass_100` (US/Canada/Europe edges) — the cheapest tier, appropriate
  for a campus audience. Change in `02-distribution.sh` if that's ever wrong.
- The CSP allows `script-src 'unsafe-inline'` because a Next.js static export
  hydrates via inline scripts and there's no server to issue nonces. The policy
  still restricts *where* resources may load from, which is most of the value.
- `CachePolicyId 658327ea-…` is the AWS-managed **CachingOptimized** policy.
