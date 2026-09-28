# Phase 2 runbook — getting built-illinois.org onto AWS

Working document for the actual cutover. The checklist lives in
`aws-migration-plan.md` §7 Phase 2; this is the how-to that goes with it.

**Account:** `builtuiuc` (242201276922) · **DNS:** Route 53 (decided 2026-09-28)
· **Registration:** stays at Squarespace (~$20/yr, unchanged)

## The safety property

The work splits into three stages, and **the live site keeps serving from GitHub
Pages until stage C**. Nothing before that is visible to visitors, and each stage
is independently verifiable.

- **Stage A** — build the AWS side. Zero DNS impact. Fully testable.
- **Stage B** — move DNS *control* to Route 53 with records **identical** to
  today's. Visitors see no change; only the nameservers differ.
- **Stage C** — swap the origin from GitHub Pages to CloudFront.

Splitting B from C is the point. If you change nameservers and origin at once
and something breaks, you cannot tell which caused it.

## Not on the critical path

- **EOH teardown.** It's a prerequisite for the *tracker* (member PII sharing an
  account with the audited Cognito/IoT infra), not for a static site. Carry the
  `eoh` record over unchanged and tear it down before Phase 3.
- **GitHub Actions OIDC deploy.** Deploy by hand with `aws s3 sync` for the first
  launch; wire up CI once you're live.

---

## Pre-flight: get the repo committed

`origin/main` is 2 commits ahead and the whole Phase 1 migration is uncommitted.

1. Commit the Phase 1 work.
2. `git merge origin/main` → **modify/delete conflict on
   `src/components/embGoogleCal.js`**. **Keep the deletion** (`git rm` it) — the
   updated calendar id is already carried into
   `frontend/components/EmbGoogleCal.tsx`.
3. `cd frontend && npm ci && npm run build` → confirm `out/` builds clean.

---

## Stage A — build the AWS side (no DNS impact)

### A1. ACM certificate — do this first, it can run while you do everything else

**Must be in `us-east-1`** regardless of where anything else lives; CloudFront
only reads certs from there.

- ACM → Request public certificate
- Domains: `built-illinois.org` **and** `www.built-illinois.org`
- Validation: **DNS**

ACM gives you CNAME validation records. **Add them in the Squarespace panel
now** — they're ordinary subdomain CNAMEs, which Squarespace handles fine, so
this needs no nameserver change. Wait for status **Issued** before A4.

### A2. S3 bucket

- Private. Block all public access **on** (CloudFront reaches it via OAC, not
  public reads).
- Name it something obvious, e.g. `built-illinois-org-site`.

### A3. CloudFront Function — required, the site is broken without it

The frontend builds with `trailingSlash: true`, so routes are `about/index.html`.
An S3 origin behind OAC serves exact keys only and won't resolve a directory to
its index document — without this function every route except `/` returns an
error.

- CloudFront → Functions → Create function, runtime **cloudfront-js-2.0**
- Paste `infra/cloudfront-index-rewrite.js` from this repo
- Publish. Associate in A4 on **Viewer request**.

Verified against the real build output — `/`, `/about`, `/about/`,
`/calendar/`, `/get-involved/`, plus `_next` assets and images all resolve.

### A4. CloudFront distribution

- Origin: the A2 bucket, **Origin access control (OAC)**. Let the console update
  the bucket policy for you.
- Alternate domain names (CNAMEs): `built-illinois.org`, `www.built-illinois.org`
- Custom SSL certificate: the A1 cert
- Default root object: `index.html`
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Function association → Viewer request → the A3 function
- **Response headers policy** — this is the reason for the whole migration.
  Create one with: `Strict-Transport-Security`, `Content-Security-Policy`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`.
- Custom error response: 403 and 404 → `/404.html`, response code 404.

### A5. Deploy and test — before any DNS exists

```bash
cd frontend && npm run build
aws s3 sync out/ s3://built-illinois-org-site/ --delete
```

Then test against the distribution's own domain:

```bash
curl -I https://dXXXXXXXXXXXXX.cloudfront.net/
curl -I https://dXXXXXXXXXXXXX.cloudfront.net/about/
curl -I https://dXXXXXXXXXXXXX.cloudfront.net/get-involved/
```

All should be `200`, and the security headers from A4 should be present. Open it
in a browser and click through all four pages. **Do not proceed until this is
right** — every problem is cheaper to fix here than after DNS moves.

---

## Stage B — move DNS control (visitors see nothing)

### B1. Create the hosted zone

Route 53 → Create hosted zone → `built-illinois.org`, **Public**. (~$0.50/mo.)

### B2. Recreate today's records EXACTLY

Do **not** point anything at CloudFront yet. The goal is an identical zone on a
different host. From `dns-inventory.md`:

| Name | Type | Value | TTL |
|---|---|---|---|
| `built-illinois.org` | A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (all four in one record) | 300 |
| `www` | CNAME | `b-u-i-l-t-uiuc.github.io` | 300 |
| `eoh` | CNAME | `d3vvzsqcqggbfd.cloudfront.net` | 300 |

Use **300** rather than the current 14400 — short TTLs make stage C reversible in
minutes instead of hours. Skip `_domainconnect` (Squarespace-only, deliberately
dropped). Keep the ACM validation CNAMEs from A1 if the cert isn't issued yet.

### B3. Verify the new zone before delegating to it

Query Route 53's nameservers directly — nothing is live yet, so this is the only
way to catch a typo before it matters:

```bash
dig @ns-XXXX.awsdns-XX.org built-illinois.org A +short
dig @ns-XXXX.awsdns-XX.org www.built-illinois.org CNAME +short
dig @ns-XXXX.awsdns-XX.org eoh.built-illinois.org CNAME +short
```

Each must match the table above. On Windows:
`nslookup -type=A built-illinois.org ns-XXXX.awsdns-XX.org`

### B4. Lower TTLs at Squarespace, then wait

Drop the existing records' TTLs in the Squarespace panel and **wait for the old
TTL to expire** (currently 14400s = 4h, so wait ~4h) before B5. This shortens the
rollback window if anything goes wrong.

### B5. Switch nameservers

Squarespace → domain → **Use custom nameservers** → the four Route 53 NS values.

**Delegation is all-or-nothing.** Anything not in the zone goes dark the moment
this takes effect. That's what B2 and B3 were for.

### B6. Verify nothing changed

Propagation can take minutes to ~48h. Then:

```bash
dig built-illinois.org NS +short        # should show awsdns
curl -I https://built-illinois.org      # still GitHub Pages, still 200
curl -I https://www.built-illinois.org
curl -I https://eoh.built-illinois.org  # EOH still alive
```

The site should be **exactly as before**. If so, DNS control has moved cleanly and
nothing user-visible happened.

---

## Stage C — swap the origin

### C1. Point apex and www at CloudFront

In Route 53, replace:

- `built-illinois.org` A record → **Alias** → CloudFront distribution
- `www` CNAME → **Alias** → the same distribution (or leave as CNAME to the
  distribution domain)

Alias records are the whole reason for this migration — CloudFront has no static
IPs, and Squarespace DNS could not do this.

### C2. Verify the cutover

```bash
curl -I https://built-illinois.org        # expect CloudFront headers, not GitHub
curl -sI https://built-illinois.org | grep -i "strict-transport\|x-frame\|content-security"
curl -I https://built-illinois.org/about/
```

Confirm you're hitting CloudFront (the `via:` / `x-cache:` headers) and that the
security headers are present — today's GitHub Pages response has none of them.

### C3. Visual parity check

Click through all four pages against the current GitHub Pages site. Per §11
rule 2, **any unintended difference is a bug, not a new baseline**. Two known
deltas to expect:

- The carousel now shows all 39 photos in `event-photos/` rather than a
  hand-picked 29 — needs a human eye on whether those extra 10 belong.
- `PLACEHOLDER_EMAIL@illinois.edu` appears on Get Involved for the External and
  Fundraising committees. **`grep -rn PLACEHOLDER_EMAIL frontend/` must be
  resolved or knowingly accepted before you call this launched.**

### C4. Retire the old pipeline

Only once DNS has settled and the site is confirmed good:

1. Disable GitHub Pages in the repo settings.
2. Delete `frontend/public/CNAME`.
3. Retire `.github/workflows/deployment.yml` (replace with the S3 deploy
   workflow when you wire up OIDC).

## Rollback

Before C1 — nothing to roll back; the site never moved.
After C1 — revert the apex/`www` records to the GitHub Pages A/CNAME values from
B2. With 300s TTLs that's live within ~5 minutes.
