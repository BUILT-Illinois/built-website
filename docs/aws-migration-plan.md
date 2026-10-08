# B[U]ILT Website → AWS Migration & Attendance Tracker Integration Plan

**Status:** In progress — website live on AWS (Phase 2 cutover 2026-10-08); Phase 2 cleanup and Phase 0 EOH teardown outstanding
**Last updated:** 2026-10-08
**Owner:** Infrastructure / Tech Committee

> **Picking this up to implement it? Read §11 (Execution notes) first** — it marks
> which steps need a human at a console, where to start, and the working rules the
> RSO has already decided. §10 tracks what is still open and needs a person's
> answer before the affected work can be correct.

---

## 1. Vision

One website, one codebase, one deployment. `built-illinois.org` remains the public
RSO homepage, and becomes the front door for attendance: students land on the same
site to read about B[U]ILT, sign in with their `@illinois.edu` Google account, check
into events, and view their attendance history. Executives manage events, attendance,
and site content (e-board, committees, photos) from an admin dashboard on the same site.

The website is built first. The attendance tracker is built on top of it, reusing its
frontend, hosting, auth, and deployment pipeline.

**Constraints that drive every decision below:**

- **Low cost.** Target ≈ $9–19/month. (Originally ≈ $6–12 in year one on the
  strength of an RDS free tier that turned out to be spent — see §3.)
- **Public repo.** Assume attackers read every line. No secrets in git, no security
  by obscurity, no student PII in the repository.
- **Maintainable by future students.** Boring, well-documented architecture.

---

## 2. Verified current state (checked 2026-08-25)

Measured, not assumed. Re-verify before Phase 2 — this is the baseline the DNS
cutover depends on.

| Host | Record | Serves |
|---|---|---|
| `built-illinois.org` | A → `185.199.108–111.153` | GitHub Pages (`Server: GitHub.com`), the CRA bundle, HTTP 200 |
| `www.built-illinois.org` | CNAME → `b-u-i-l-t-uiuc.github.io` | GitHub Pages |
| `eoh.built-illinois.org` | CNAME → `d3vvzsqcqggbfd.cloudfront.net` | S3 + CloudFront, the "Air Canvas" EOH 2026 app, HTTP 200 |
| `built-illinois.org` NS | `ns-cloud-d1..d4.googledomains.com` | **Squarespace's default nameservers** for this domain — see note 2 below |
| MX / apex TXT | none | No email or apex domain-verification to preserve |

**Three corrections to earlier assumptions, all load-bearing:**

1. **Nothing is URL-masked.** Both sites are served directly at their real origins.
   A masked domain would return a wrapper page or a redirect; neither does. The
   `public/CNAME` file in this repo confirms it — that file only functions with real
   DNS records pointing at GitHub.
2. **Squarespace is the registrar *and* manages DNS — but is not in the request
   path.** The `googledomains.com` nameserver hostnames are legacy branding carried
   over when Squarespace acquired Google Domains in 2023; they are Squarespace's
   default nameservers for migrated domains, not a separate Google account. DNS
   records are edited in the Squarespace DNS panel, and the domain is currently
   *not* using custom nameservers. Separately, Squarespace does not proxy or mask
   traffic — verified by response headers showing GitHub serving the apex directly.
3. **The RSO already runs real AWS infrastructure — in the same account.** The EOH
   bundle ships the AWS **Cognito Identity** and **AWS IoT** SDKs with `wss://`
   endpoints: a Cognito Identity Pool vending temporary AWS credentials to browsers,
   talking to IoT Core over MQTT-in-WebSocket, alongside S3 + CloudFront. The EOH
   bucket and distribution live in `builtuiuc` (242201276922) — **confirmed
   2026-09-28 to be both the Organization's management account and the account
   chosen to hold the website and member PII** (§3).

   **Audited 2026-08-26.** The Identity Pool (`us-east-1:c084c197-…`, hardcoded in
   the public bundle, as it must be) issues guest credentials to anyone. Its
   unauthenticated role carried the inline policy `eoh-air-canvas-unauth-iot-policy`:
   `iot:Connect/Subscribe/Receive/Publish/AttachPolicy` on `"Resource": "*"`. Scope
   was IoT-only — **no S3, RDS, or broader IAM reach, so member data was never
   exposed through it.** But `iot:AttachPolicy` on `*` is a documented
   privilege-escalation path (an anonymous visitor could attach any IoT policy in
   the account to their own identity), and the unscoped data-plane actions allowed
   reading and writing every IoT topic in the account and hijacking any client ID.
   **Permissions were neutered as a stopgap on 2026-08-26**; **full teardown was
   decided 2026-09-28** and is now a Phase 0 prerequisite rather than optional
   cleanup, because this is the account the tracker's member data will live in.
   See §7 Phase 0 and §8.

---

## 3. Target architecture

```text
AWS Organization  (consolidated billing)
|
+-- Account: builtuiuc            <- MANAGEMENT/PAYER *and* website + tracker + PII
|     242201276922 | cs-built@mx.uillinois.edu
|     EOH / Air Canvas (S3 + CloudFront, Cognito Identity Pool, IoT Core)
|     currently lives here and is being TORN DOWN — see §7 Phase 0
|
+-- Account: tech-committee       <- all other student project work
      128793515151 | builtinfra0212@gmail.com

                     Students / Executives
                               |
                  https://built-illinois.org
                               |
               +-------------------------------+
               |  Next.js (static export)      |
               |  S3 + CloudFront (OAC)        |
               |  - Public pages               |
               |  - Student dashboard          |
               |  - Exec dashboard             |
               |  - /checkin page              |
               +-------------------------------+
                               |
                 https://api.built-illinois.org
                               |
               +-------------------------------+
               |  FastAPI container            |
               |  AWS App Runner               |
               |  - Google OAuth (server-side) |
               |  - Content API (public reads) |
               |  - Events / attendance / audit|
               |  - RBAC + rate limiting       |
               +---------------+---------------+
                      |                |
            +---------+-----+   +------+----------------+
            | Aurora Svls v2|   | S3 media + CloudFront |
            | (scale-to-0)  |   | (photos, headshots)   |
            | (private VPC) |   +-----------------------+
            +---------------+

  Secrets: SSM Parameter Store (SecureString)   Logs: CloudWatch
  CI/CD: GitHub Actions -> AWS via OIDC (no stored AWS keys)
  Cost guardrail: AWS Budgets alert at $10 and $20/month
```

### Key decisions (and why)

| Decision | Choice | Rationale |
|---|---|---|
| AWS accounts | **Two, under AWS Organizations** — `builtuiuc` (242201276922; management/payer, **and** site + tracker + member PII) and `tech-committee` (128793515151; all other student project work) | Rotating chairs will keep shipping student projects under deadline, and scoping each new project's IAM policy correctly forever is a discipline problem; an account boundary is a structural one — a role in one account cannot reach resources in another. Extra accounts are free and billing still consolidates to one payer, so project work is isolated from the account holding student data. **Two knowingly accepted deviations** (decided 2026-09-28): (1) the website and member PII live in the *management* account, which AWS guidance reserves for org administration — SCPs cannot constrain the management account, so preventive guardrails ("deny public buckets", "require MFA") can't be applied to the account holding PII, and a compromise there has no containment boundary above it; (2) that account currently also holds the audited EOH/Cognito/IoT infrastructure, which is why **EOH teardown is a prerequisite, not an optional cleanup** (§7 Phase 0). The durable university root email sits on the management account, which is correct — that is the account whose recovery matters most. Revisit by moving the site + tracker into a dedicated member account if the org ever grows past two accounts. |
| Frontend hosting | **S3 + CloudFront (OAC), static Next.js export** | Same pattern already proven at `eoh.built-illinois.org`. CloudFront's perpetual free tier (~1 TB/mo egress) covers RSO traffic; Amplify bills per GB served and per build minute. Decisive factor is **response headers policies** — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy. *Fallback:* GitHub Pages is free and works today, but cannot set those headers (the current apex response has no CSP and no X-Frame-Options). Fine for a brochure site; not for one hosting an authenticated dashboard. |
| Frontend framework | **Next.js (TypeScript), static export. Existing CSS preserved; no Tailwind in Phase 1** | Replaces deprecated Create React App. Static export means CloudFront serves pure files — no SSR compute cost; all dynamic data is fetched client-side from the API. The tracker spec calls for Tailwind, but preserving the current site's appearance takes precedence (§11 rule 2), so `src/styles/*.css` ports over unchanged. Whether to introduce Tailwind for the net-new dashboard screens is deferred to Phase 4, when those surfaces are first built and there is no existing design to preserve. |
| Event source of truth | **The RSO Google Calendar, mirrored into Postgres** (Secretary's request, 2026-09-28) | The Secretary already runs events out of Google Calendar and the site already embeds it, so asking them to re-enter events in a second system would guarantee the two drift. The tracker syncs *from* the calendar rather than owning events. Mirrored locally rather than queried live for three reasons: check-in at a GBM cannot depend on an external API being fast or reachable; the `UNIQUE(event_id, user_id)` constraint and FKs need a real local row; and attendance history must survive someone deleting a calendar entry. Sync is on-demand, never a cron — a poller would hold Aurora awake and undo scale-to-zero. |
| One frontend or two? | **One.** Public site + student dashboard + exec dashboard + check-in in a single Next.js app | The website *is* the attendance tracker's frontend. One deploy, one domain, shared components/auth. Supersedes the tracker spec's separate frontend. |
| Backend compute | **App Runner (FastAPI in a container)** | Simple mental model (it runs `uvicorn`, identical to local dev), VPC connector for private RDS *and* internet egress for Google OAuth. Lambda would be nearly free but forces a VPC/NAT puzzle (NAT Gateway is $32/mo — a trap) or a publicly exposed database. ~$5–10/mo is the price of simplicity. Revisit only if budget demands. |
| Database | **Aurora Serverless v2 (PostgreSQL) with scale-to-zero, private subnet, SSL required** — decided 2026-09-28, replacing the originally specced RDS `db.t4g.micro` | The original pick rested on a 12-month RDS free tier that is confirmed spent, so the decision was reopened on cost. This workload is idle almost all the time — a burst of check-ins at a GBM, light dashboard reads otherwise — and Serverless v2 pays nothing for compute while paused, with consumption-based storage instead of RDS's fixed 20 GB floor. Expect ~$2–6/mo against ~$14 for RDS on-demand. Chosen *now* specifically because the backend is unbuilt: the constraint below gets designed in rather than retrofitted, and there is no migration to pay for. **The failure mode is real and must be designed against** — a persistent SQLAlchemy pool, a DB-touching health check, or any cron holding the database awake bills ~$44/mo, worse than what it replaced. Keep single-AZ; Multi-AZ roughly doubles cost and is not warranted. Aurora PostgreSQL is wire-compatible, so SQLAlchemy/Alembic are unchanged and reverting to RDS is a snapshot restore. |
| Auth/session | **Server-side Google OAuth (code flow) → host-only httpOnly session cookie on `api.built-illinois.org`** | Backend runs the whole OAuth exchange and verifies the domain claim server-side; the frontend never touches tokens. Cookie is **host-only — no `Domain` attribute** — so it is never sent to `eoh.` or any future subdomain we do not control. `SameSite=Lax` still works because site and API share the registrable domain (same-site, though cross-origin). Frontend uses `credentials: 'include'`; CORS allowlists the exact site origin (never `*` with credentials). CSRF token on state-changing routes. |
| Identity service | **Hand-rolled: FastAPI verifies the Google ID token, issues its own session** | ~100 lines, no lock-in, easy for future students to read. Note the EOH app uses Cognito *Identity* Pools (AWS credential vending), a different service from Cognito *User* Pools (auth) — so there is no existing team familiarity to leverage here. |
| Secrets | **SSM Parameter Store (SecureString)** — *changed from tracker spec's Secrets Manager* | Parameter Store standard tier is free; Secrets Manager is $0.40/secret/month. Same posture for our needs. App Runner reads parameters at startup via IAM role. |
| CI/CD | **GitHub Actions with OIDC role assumption** | No long-lived AWS keys in a public repo. Frontend: build → `aws s3 sync` → CloudFront invalidation. Backend: build image → ECR → App Runner deploy. |
| Rate limiting | **In-process (`slowapi`)** — single App Runner instance | No Redis, per spec's "simplest appropriate mechanism". |
| DNS | **Registration stays at Squarespace; authoritative DNS moves to a Route 53 hosted zone (~$0.50/mo) at Phase 2** | Squarespace manages the records today, via the default nameservers it inherited from Google Domains. The move is needed because **CloudFront has no static IPs**, so the apex needs an *alias* record — Squarespace DNS does not support ALIAS/ANAME, and a plain `CNAME` is illegal at a zone apex. (This is not a problem today only because GitHub Pages publishes fixed A-record IPs.) Route 53 alias records solve it and keep DNS in the same account as the infrastructure. Switching is the one-click "Use custom nameservers" option at Squarespace — no domain transfer. *Free alternative:* Cloudflare DNS does apex CNAME flattening at $0, but adds another vendor to the handover. |

### Estimated monthly cost

> **There is no free-tier year.** Confirmed 2026-09-28: `builtuiuc`'s RDS free
> tier is fully spent. The original plan's "$0 for year one" assumed a new
> account; that premise is gone, so the bill starts at full price on day one.
> This is what promoted the database from "revisit at the 12-month mark" to a
> live decision (§10 #5, now resolved).

| Item | Monthly |
|---|---|
| S3 + CloudFront (site + media) | ~$0–1 |
| App Runner (0.25 vCPU / 0.5 GB, low traffic) | ~$5–10 |
| Database — Aurora Serverless v2, scale-to-zero (chosen, see below) | ~$2–6 |
| Parameter Store, CloudWatch (30-day retention), Budgets | ~$0 |
| DNS hosting (Route 53 hosted zone in `builtuiuc`) | $0.50 |
| Domain registration (stays at Squarespace, not an AWS cost) | ~$1.67 (~$20/yr) |
| Second AWS account (Organizations) | $0 |
| **Total** | **≈ $9–19** |

Options considered for the database, which was the largest single swing in the
bill (decided 2026-09-28 — Aurora Serverless v2):

| Option | Monthly | Notes |
|---|---|---|
| **Aurora Serverless v2, scale-to-zero** | **~$2–6** | **Chosen.** Pays nothing while paused; consumption-based storage (~$0.10/mo at this data volume) instead of a 20 GB floor. **Bills ~$44/mo if it never pauses** — see the constraint below. |
| RDS `db.t4g.micro` on-demand (originally specced) | ~$14 | ~$11.50 instance + ~$2.30 storage. Storage is a fixed 20 GB floor whether used or not. |
| RDS `db.t4g.micro` + 1-yr Reserved Instance | ~$10 | ~30–40% off the instance portion. No new concepts, no failure mode; commits for 12 months. The fallback if Aurora's constraint proves unmanageable. |
| External free Postgres (Neon, Supabase, …) | $0 | Rejected: moves member PII to a third-party vendor and makes the DB publicly reachable, against §8's posture. A board-level call, not a cost one. |

> **The Aurora constraint is a Phase 3 design requirement, not a tuning
> exercise.** A persistent SQLAlchemy connection pool in App Runner can hold the
> database awake indefinitely, and so can any health check or cron that issues a
> query. That silently turns ~$5/mo into ~$44/mo — worse than the RDS option it
> replaced. Keep the pool small, let idle connections actually close, keep health
> checks off the database, and set the inactivity timeout generously (≈1 hour, not
> the 5-minute minimum) so it cannot pause mid-meeting. The $10/$20 Budgets alerts
> are the backstop that makes this mistake loud instead of silent. Rates above are
> approximate and regional — confirm against the AWS Pricing Calculator.

Set AWS Budgets alerts at $10/$20 on day one. If cost needs to come down further,
the pressure valve is the database and App Runner (both are always-on serving a
workload that is idle almost all the time), not the architecture. The frontend can
also fall back to GitHub Pages at $0 if the club ever needs to cut everything
non-essential. Pursuing university/AWS credits (§10 #1) is now the highest-leverage
item on the list, since it could zero the whole bill for a year or more.

---

## 4. Changes to the attendance tracker spec

Recorded here so `PROJECT_SPEC.md` / CLAUDE.md can be updated to match:

1. **No separate tracker frontend.** The RSO website *is* the frontend. Student
   dashboard, exec dashboard, and check-in page are routes in the main Next.js app.
2. **Frontend is a static export** (no SSR), served from S3 + CloudFront rather than
   Amplify. All auth-gated data is fetched client-side; authorization is enforced
   entirely by the API. Hiding dashboard routes in a static bundle is UX, not
   security — the backend is authoritative.
3. **Secrets Manager → SSM Parameter Store** (cost).
4. **Session cookie is host-only on the API subdomain**, not domain-wide (§3).
5. **Two AWS accounts**, isolating member PII from student project infrastructure.
6. **Content management is in scope for the backend**: e-board, committees, and
   photo gallery get tables, public read endpoints, and exec-only CRUD — flowing
   through the same RBAC and audit-logging services as events/attendance.
7. **No Tailwind on existing pages.** The spec lists Tailwind in the stack; the RSO
   requires the current site's appearance to be preserved, so ported pages keep
   their existing CSS (§11 rule 2). Revisit only for net-new dashboard screens.
8. **RDS → Aurora Serverless v2 (PostgreSQL) with scale-to-zero** (cost;
   decided 2026-09-28, §3). Still managed Postgres in a private subnet, still
   SQLAlchemy + Alembic unchanged — but the Phase 3 database layer must be
   written so idle connections actually close, or auto-pause never engages and
   it costs more than the RDS instance it replaced.
9. **The RSO Google Calendar is the source of truth for events** (requested by
    the Secretary, 2026-09-28). The spec has execs authoring events in the app;
    instead the Secretary keeps working in Google Calendar, and the tracker
    mirrors it. Confirmed with the Secretary 2026-09-28: **every** calendar entry
    is eligible for attendance, recurring meetings are entered as series with
    **each occurrence its own event**, and the calendar is **public** (so a
    read-only API key is all the sync needs). Consequences: the `events` table
    becomes a local mirror keyed by Calendar *instance* id; there is no
    `trackable` flag, since opening attendance is the only gate; the exec
    dashboard drops event create/edit/delete and keeps sync + attendance
    controls; the spec's DRAFT→PUBLISHED→ACTIVE→CLOSED
    lifecycle collapses — existence on the calendar replaces DRAFT/PUBLISHED,
    and only attendance open/closed remains local state. **Accepted loss:** event
    edits now happen in Google, outside our audit log, so the audit trail covers
    syncs and attendance but cannot say who changed an event's time — that
    history lives in Google Calendar. Attendance, RBAC and audit are otherwise
    unchanged.
10. Everything else in the spec (FastAPI, SQLAlchemy, Alembic, App Runner,
    QR signed tokens, audit logs, RBAC, UUIDs, soft deletes) stands.

---

## 5. Explicit non-goals

1. **EOH / open-house attendance.** Open house visitors are prospective students and
   members of the public with no `@illinois.edu` account, so the domain-restricted
   check-in flow structurally cannot serve them. A guest flow would also mean
   collecting contact details from minors, carrying consent and retention
   obligations well beyond this project's scope. If outreach wants lead capture,
   use a form owned by the outreach committee.
2. **Absorbing the EOH site.** `eoh.built-illinois.org` is not being folded into
   this project — it is being **torn down** instead (decided 2026-09-28, §7
   Phase 0). Its code stays in its own repo; nothing from it carries into the
   website or tracker.
3. Everything the tracker spec lists as out of scope: RSVP, email notifications,
   NFC, geofencing, analytics, multi-org, mobile app.

---

## 6. Repository restructure

Move to the monorepo shape the tracker spec recommends. The current CRA app's
components/pages/styles are ported into `frontend/`.

```text
built-website/                  (public GitHub repo)
├── frontend/                   Next.js app (TypeScript)
│   ├── app/                    routes: /, /about, /get-involved, /calendar,
│   │                           /checkin, /dashboard, /admin/*
│   ├── components/
│   ├── data/                   static fallback content (eboard, committees)
│   ├── services/               typed API client
│   ├── styles/                 existing CSS, ported unchanged (§11 rule 2)
│   └── types/
├── backend/                    FastAPI (added in Phase 3)
│   ├── api/  auth/  models/  schemas/  services/
│   ├── repositories/  middleware/  database/
│   ├── migrations/             Alembic
│   ├── tests/
│   └── Dockerfile
├── docs/                       this plan, architecture, runbooks, content-editing guide
├── .github/workflows/          deploy-frontend.yml, deploy-backend.yml, ci.yml
├── .env.example                placeholders only — never real values
└── README.md
```

---

## 7. Phased plan

Website first (Phases 0–2), then backend foundation (3–4), then attendance (5–6).
Each phase is independently shippable; the site is never down.

### Phase 0 — Repo, accounts & guardrails (1 day)

- [x] **Restructure repo per §6** (2026-08-31). Done with `git mv` so history is
      preserved on the relocated assets and CSS. Uncommitted, like Phase 1.
- [x] **Tracker specification vendored** as `docs/PROJECT_SPEC.md` (2026-08-26).
      All "spec §N" citations in this plan refer to that file's numbered sections.
- [ ] Branch protection on `main`; PRs required; Dependabot enabled.
- [~] `.gitignore` audit **done** (2026-08-31, rewritten monorepo-aware: node_modules,
      `.next/`, `out/`, `.env*`, Python artefacts for Phase 3). `.env.example`
      **deliberately deferred to Phase 3** — inventing variable names before the
      backend exists would just create a file that's wrong on arrival.
- [ ] Secret-scanning + push protection enabled on the GitHub repo.
- [ ] **Root account durability.** The root email is the university-provided RSO
      address — durable, org-owned, and not tied to any individual, so account
      recovery survives graduations. The remaining single point of failure is the
      **root MFA device**: if it is an authenticator app on a graduating chair's
      phone, the account is exactly as unrecoverable as a dead mailbox would be.
      Store the MFA seed (or a hardware key) in the RSO vault, and confirm at least
      two current officers can both read the RSO mailbox and reach that MFA factor.
- [ ] **DNS inventory** — in progress, see `docs/dns-inventory.md`. The live
      externally-resolvable records were captured 2026-09-28 and match §2 exactly
      (no TXT, no MX at the apex). The panel-only pass found a
      `_domainconnect` CNAME (Squarespace Domain Connect preset) that external
      queries cannot discover — it is Squarespace-specific and is **intentionally
      not carried over**, since it only functions while Squarespace serves the
      zone. Finish the remaining panel-only items listed in that file.
- [ ] Record the Squarespace login and AWS access details in the transition runbook.
- [x] **AWS Organizations created** (confirmed 2026-09-28). Two accounts:
      `builtuiuc` (242201276922, cs-built@mx.uillinois.edu) — management/payer,
      and the home of the website, tracker and member PII; `tech-committee`
      (128793515151, builtinfra0212@gmail.com) — all other student project work.
      See §3 for the two knowingly accepted deviations this structure carries.
- [ ] Budgets alerts ($10/$20), MFA on root of **both** accounts, root credentials
      in the RSO password vault and never used day-to-day. One named IAM identity
      per current infra chair (no shared IAM users), removed/rotated at each
      transition.
- [ ] **Confirm `builtinfra0212@gmail.com` is genuinely org-owned** — vault
      credentials, recoverable by at least two current officers. It is the one
      root email not on a university-provided address, so it is the weakest link
      in the recovery story (§7 root-durability item above).
- [x] **RDS free-tier eligibility checked** (2026-09-28): **fully spent.** There is
      no free year. This rebased §3's cost table and reopened the database engine
      choice, now resolved to Aurora Serverless v2 with scale-to-zero.
- [x] **Audit the EOH Cognito Identity Pool's unauthenticated IAM role.** Done
      2026-08-26 — findings in §2. Permissions neutered as a stopgap.
- [ ] **Tear down the retired EOH project.** Decided 2026-09-28: full teardown,
      not archival. This is a **prerequisite, not optional cleanup** — it is what
      removes the audited anonymous-credential path from the same account that
      will hold member PII (§3). **Do this before the Phase 2 DNS cutover**, so
      Phase 2 never has to recreate an `eoh` record that is about to be deleted.
      Teardown order, security first:
      1. Disable guest access on the Identity Pool — stops credentials being issued
         at all, rather than issuing neutered ones.
      2. `aws iot list-policies` + `list-targets-for-policy` — detach any IoT policy
         attached to an identity that should not have one. The stopgap Deny blocks
         *future* `AttachPolicy` calls but does not undo past ones, and the door was
         open from ~April 2026. CloudTrail (`GetCredentialsForIdentity`,
         `AttachPolicy`) shows whether it was ever used.
      3. Back up: `aws s3 sync s3://<bucket> ./eoh-archive`; confirm source repo.
      4. Delete the `eoh` DNS record **before** the AWS resources.
      5. CloudFront: disable, wait for deploy to finish, then delete. S3: empty,
         then delete. Then IoT things/policies, then the IAM role.
      Before deleting, check for inbound links from the College of Engineering
      EOH listing and any printed QR codes, and decide whether those should get a
      redirect or be left to go dead — built-illinois.org itself does not link to
      it. Keep the `s3 sync` archive from step 3 regardless, so the project
      survives as a portfolio artifact even though the hosting does not.
      (Archiving the live page instead of deleting it was considered and
      declined, 2026-09-28.)
- [ ] Write `docs/transition-runbook.md`: what rotates at chair handover (IAM
      identities, root MFA custody, RSO mailbox access, the Google Cloud project
      behind OAuth, Squarespace login, GitHub org ownership), plus the subdomain
      inventory and decommission ordering rule.
- [ ] Pick region (us-east-2 or us-east-1). The ACM cert for CloudFront must be in
      us-east-1 regardless.

**Exit:** clean public repo skeleton; both AWS accounts safe to build in; nobody
depends on an account no one can log into.

### Phase 1 — CRA → Next.js migration (2–4 days) — **COMPLETE 2026-08-31**

Built and verified (`next build` clean, all four pages screenshot-checked against
the live site). **Not yet committed** — the whole phase sits in the working tree.

- [x] Scaffold Next.js + TypeScript in `frontend/`. **No Tailwind** — see §11 rule 2.
      Next 15, React 18, static export.
- [x] Port pages: Home, About, Get Involved, Calendar. `src/styles/*.css` carried
      over unchanged except three `url()` paths that had to become root-absolute:
      the old `../../public/…` depth broke when the files moved under `frontend/`,
      and relative image paths that worked under `HashRouter` (every page served
      at `/`) would 404 on real routes like `/about`. Appearance unchanged.
- [x] Real routes replace `HashRouter` (`/about` instead of `/#/About`).
- [x] Extract hardcoded content to `frontend/data/`: `eboard.ts`, `committees.ts`,
      `sponsors.ts`, plus a build-time auto-discovered carousel list. Values
      carried verbatim; the two contradictory committee netids render
      `PLACEHOLDER_EMAIL` (§11 rule 1).
- [x] `next.config`: `output: 'export'`, plus `trailingSlash: true` so `/about`
      resolves to `about/index.html` on a static host. Security headers remain a
      Phase 2 CloudFront concern.
- [x] Redirects for old hash URLs — `components/HashRedirect.tsx`, live-tested
      against all four legacy routes.

Also fixed in passing (§11 known defects): Bijou Leinbach's leading-space email,
the Node 18 → 20 bump in the deploy workflow, and the hardcoded 29-image carousel
(now directory-driven — note this pulled in 10 previously-unused photos, which
wants a human eye before Phase 2's visual-parity gate). `swiper` was bumped to v14
to clear a critical advisory. Dropped: the unused, fully commented-out
`MemberCard` component.

**Carried forward from upstream:** `origin/main` moved the Google Calendar embed
to a new calendar (`c_ffa94f99…`, commits `c0b55f6`/`330793d`, 2026-09-28) while
this work was uncommitted. That change landed in `src/components/embGoogleCal.js`,
which this phase deletes, so it was applied by hand to
`frontend/components/EmbGoogleCal.tsx`. **Merging `origin/main` will raise a
modify/delete conflict on that file — keep the deletion**; the content already
lives in the `.tsx`.

**Known pre-existing bug, deliberately left alone:** `aboutPage.css` references
`/public/event-photos/Speed-Friending.png`, which 404s — public assets serve at
the site root, not under `/public/`. Broken before the migration too, and fixing
it changes what renders, so it needs sign-off under §11 rule 2.

**Exit:** ✅ feature-identical site running locally as a static Next.js export.

### Phase 2 — DNS + AWS hosting cutover (1–2 days) — **CUT OVER 2026-10-08, cleanup open**

Order matters. Move DNS control first, then swap the origin — never both at once.

> **Where this stands (2026-10-08).** Nameservers moved from Squarespace to
> Route 53 and apex + `www` repointed to CloudFront distribution
> `E3G5E65UJ352H4` the same day. Verified through public DNS: all four pages
> 200, 404 page works, HTTP→HTTPS redirect, six security headers present, zero
> CSP violations in a real browser, `eoh` unaffected. Rollback remains
> `infra/aws/04-cutover.sh --rollback`.
>
> Still open, in order:
> 1. **Leave GitHub Pages on until 2026-10-09.** Squarespace served the old
>    records with TTLs up to 6h that could not be lowered; resolvers holding
>    them still send visitors to GitHub Pages until they expire.
> 2. Then disable Pages, delete `frontend/public/CNAME`, retire
>    `.github/workflows/deployment.yml`.
> 3. `www` now serves the site directly instead of 301-redirecting to the apex
>    as GitHub Pages did. Add a `www` → apex redirect to the CloudFront Function
>    before Phase 3 — CORS will allowlist the exact apex origin.
> 4. GitHub Actions OIDC deploy role. Until then deploys are
>    `infra/aws/deploy.sh` run by hand.

> **Step-by-step execution lives in `docs/phase-2-runbook.md`.** It splits this
> into three independently verifiable stages (build AWS → move DNS control →
> swap origin), with the live site untouched until the last one. The
> CloudFront Function the static export requires is in
> `infra/cloudfront-index-rewrite.js`, verified against the real build output.
>
> **EOH teardown is not on this critical path** — it gates Phase 3 (member PII),
> not a static site. Carry the `eoh` record across unchanged and tear it down
> before the backend lands.

- [x] Stand up authoritative DNS and recreate every record inventoried in Phase 0
      (`docs/dns-inventory.md`). **Route 53 hosted zone in `builtuiuc`** (decided 2026-09-28) — it supports the
      apex alias record that Squarespace cannot.
      If EOH teardown has already happened (Phase 0), there is no `eoh` record to
      carry over; if it somehow has not, carry it and delete it afterwards in the
      DNS-record-first order §8 requires.
- [ ] ~~Lower TTLs in the Squarespace DNS panel ~24h ahead of the switch.~~
      Skipped — the Squarespace panel would not save a TTL below 4h. Accepted a
      window of stale answers instead (see status note above).
- [x] In Squarespace: **Use custom nameservers** → enter the NS values for the new
      zone. Verify apex and `www` (plus `eoh`, if it still exists) all resolve and
      serve before proceeding. Nameserver delegation is all-or-nothing: any record
      not recreated goes dark the moment it takes effect.
- [x] S3 bucket (private, OAC) + CloudFront distribution + ACM cert (us-east-1)
      for the site; apex and `www` alias records. The ACM cert can be requested
      and DNS-validated **before** the nameserver switch — validation uses an
      ordinary subdomain CNAME, which Squarespace handles fine — and the whole
      distribution can be tested against its raw `*.cloudfront.net` name before
      any DNS points at it.
      **Gotcha:** the frontend builds with `trailingSlash: true`, so routes are
      `about/index.html`. An S3 origin behind OAC is a REST origin and does *not*
      resolve `/about/` to `/about/index.html` the way S3's website endpoint
      would. Add a small CloudFront Function that appends `index.html` to paths
      ending in `/` (keeps the bucket private), rather than switching to the
      website endpoint.
- [x] CloudFront response headers policy: CSP, HSTS, `X-Content-Type-Options`,
      `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy. Verify in
      production responses (the current GitHub Pages response has none of these).
- [ ] GitHub Actions OIDC role; frontend deploy = `s3 sync` + invalidation.
- [x] **Pre-launch content check.** `grep -rn PLACEHOLDER_EMAIL frontend/` — every
      remaining placeholder must be either replaced with real data or knowingly
      accepted by the user. Visible "placeholder email" text must not ship to a
      public RSO site by accident.
- [ ] **Visual parity check.** Compare the deployed pages against the current
      GitHub Pages site before retiring it. Any unintended difference is a bug
      (§11 rule 2), not a new baseline.
- [x] Cut apex/`www` from GitHub Pages to CloudFront (2026-10-08).
- [ ] Leave Pages up until DNS settles, then disable the repo's Pages deployment
      and remove `public/CNAME`.

**Exit:** built-illinois.org served from CloudFront with real security headers;
old pipeline retired. **Milestone: website migrated.**

### Phase 3 — Backend foundation + auth (1 week)

- [ ] FastAPI skeleton in `backend/` per spec layering (routes → services →
      repositories); Dockerfile; local dev via Docker Compose Postgres.
- [ ] VPC: 2 public + 2 private subnets; **Aurora Serverless v2 (PostgreSQL)** in
      private subnets with **minimum capacity 0 ACU** (scale-to-zero enabled),
      max ~1–2 ACU, inactivity timeout ≈1 hour, SSL required, app-specific DB
      user (no superuser). Confirm the Aurora PostgreSQL minor version supports
      scale-to-zero before provisioning.
- [ ] **Database layer must not defeat auto-pause** (§3). Small SQLAlchemy pool,
      short `pool_recycle`, idle connections allowed to close; no DB-touching
      health check, no polling cron. Verify after deploy that the cluster
      actually reaches 0 ACU overnight — if it never pauses, this costs ~$44/mo
      instead of ~$5 and the whole reason for choosing it is gone.
- [ ] Handle resume latency: first connection after a pause can take ~15s, so
      give the client a short connection retry/backoff rather than surfacing an
      error. (The exec's own pre-meeting actions warm the DB before students
      scan, so the exposed case is a lone student hitting a cold DB mid-week.)
- [ ] App Runner service from ECR image, VPC connector to Aurora, IAM role reading
      SSM parameters; custom domain `api.built-illinois.org`.
- [ ] Alembic baseline migration: `users`, `roles`, `user_roles` (UUID PKs).
- [ ] Google OAuth code flow on the backend; verify ID token + `@illinois.edu`
      domain server-side; auto-create user on first login; host-only httpOnly
      session cookie; logout; session expiry; CSRF token for state-changing
      requests; CORS allowlist of the exact site origin.
- [ ] Rate limiting (`slowapi`) on auth endpoints; consistent error envelope
      (`{"success": false, "message": ...}`), no stack traces.
- [ ] CloudWatch log retention 30 days (cost); log auth failures, never tokens.
- [ ] `GET /api/me`; frontend sign-in button + session-aware nav.

**Exit:** students sign in with Illinois Google accounts on the live site. **Milestone: auth live.**

### Phase 4 — Dynamic content (e-board, committees, photos) (1 week)

- [ ] Tables + Alembic migrations: `board_members`, `committees`, `photos`
      (UUIDs, soft-delete, display_order/published flags).
- [ ] Audit-log service (reusable, automatic on data-changing operations) — built
      *now* so content CRUD exercises it before attendance depends on it.
- [ ] RBAC dependency (`require_role("ExecutiveBoard")`) — roles always from DB.
- [ ] Public read endpoints: `GET /api/public/eboard`, `/committees`, `/photos`
      (cacheable, rate-limited, no auth).
- [ ] Exec-only CRUD + S3 presigned-URL upload flow; images served via CloudFront.
- [ ] Exec dashboard `/admin`: manage board members, committees, photo gallery.
- [ ] Public pages fetch from API with `frontend/data/` static fallback.

**Exit:** yearly e-board turnover and photo updates need zero code changes. **Milestone: site is dynamic.**

### Phase 5 — Events & QR attendance (1–2 weeks)

- [ ] `events` table as a **local mirror of the RSO Google Calendar** (§4.9),
      keyed by the Calendar **instance** id (`<seriesId>_<timestamp>`), never the
      series id — every occurrence of a recurring meeting is its own event with
      its own attendance (§10 #9, confirmed by the Secretary). Keep
      `recurring_event_id` alongside it for grouping in reports. Stores the synced
      fields (title, description, start, end, location) plus the tracker-owned
      state the calendar knows nothing about: attendance open/closed and a
      soft-delete tombstone. **No `trackable` flag** — every calendar entry is
      eligible (§10 #8), and the exec opening attendance is the only gate.
- [ ] Calendar sync service: read the RSO calendar via the Google Calendar API
      with **`singleEvents=true`** so recurring series expand into individual
      instances, and **bounded `timeMin`/`timeMax`** (suggest −6 months/+3 months)
      — an unbounded "repeats forever" series would otherwise expand without
      limit. Upsert by instance id. **Pull on demand** (exec opens the dashboard,
      or presses "Sync now") — **not a polling cron**, which would hold Aurora
      awake and defeat scale-to-zero (§3).
- [ ] The calendar is **public** (§10 #10, confirmed), so sync needs only a
      read-only **API key** — no OAuth flow, no service account, no domain
      delegation. Keep the key and the calendar id in Parameter Store (the
      calendar id has already changed once, 2026-09-28); restrict the key to the
      Calendar API. Public also means event titles/times are not sensitive —
      unlike attendance, which stays private per §8.
- [ ] Instances returned with `status: "cancelled"` (a single occurrence the
      Secretary deleted) must **tombstone** the local row, not be skipped.
      Likewise deleting an event in Google Calendar tombstones and never touches
      attendance — attendance history has to outlive the calendar entry.
- [ ] `attendance` table with `UNIQUE(event_id, user_id)` DB constraint.
- [ ] Exec dashboard: **no event create/edit/delete** — those move to Google
      Calendar. The dashboard syncs and opens/closes attendance — all audited.
- [ ] QR: short-lived signed token (event id + purpose + expiry, HMAC via key in
      Parameter Store); QR rendered on exec screen, auto-refreshing.
- [ ] `/checkin?token=...` page: session check → token verify → event attendance-open
      check → insert (constraint is final word) → friendly duplicate message.
      Check-in reads **only local state** — never the Calendar API — so a slow or
      unreachable Google does not break check-in at a live meeting.
- [ ] Rate limit check-in (e.g., 10/min/user).
- [ ] Student dashboard: profile, attendance history, total events attended.

**Exit:** full QR attendance flow works at a real meeting. **Milestone: attendance live.**

### Phase 6 — Reports, hardening, handoff (1 week)

- [ ] Manual attendance add/remove (exec, audited); CSV export; audit log viewer.
- [ ] `GET /api/admin/users` + role management (audited ROLE_CHANGE).
- [ ] Test pass per spec §41: domain restriction, RBAC, duplicate/closed-event
      check-in rejection, QR expiry, audit creation.
- [ ] `pip-audit` / `npm audit` in CI; fail on high severity.
- [ ] Load-test the check-in burst (a GBM is ~50–100 scans in 5 minutes — App
      Runner default handles this; verify).
- [ ] Docs: architecture, runbook (deploy, rotate secrets, restore backup),
      content-editing guide, onboarding for next year's tech committee.
- [ ] Restore-test an Aurora snapshot once.
- [ ] Confirm the cluster is actually pausing in production (CloudWatch
      `ServerlessDatabaseCapacity` should hit 0 during idle periods) and that the
      month's bill matches the ~$2–6 estimate rather than the ~$44 never-pauses
      figure.

**Exit:** tracker spec's Definition of Done satisfied; next cohort can run it.

---

## 8. Security & optics checklist (public repo, public site)

**Never in git:** OAuth client secret, DB credentials, session/QR signing keys,
AWS keys, real `.env`. CI authenticates via OIDC only.

**Server-side always:** identity from verified Google tokens, roles from DB,
authorization on every protected endpoint, input validation via Pydantic,
parameterized queries only, generic error messages.

**PII discipline:** attendance data and member records live only in Postgres, in
the `builtuiuc` account — never in the repo, logs, client bundles, or the
`tech-committee` project account. Members see only their own history. Only
e-board bios (already public content) appear on the public site. CSV exports are
exec-only and audited. Because that account is also the Organization's management
account (§3), it cannot be fenced in by SCPs — so the compensating controls are
the ones inside the account: least-privilege IAM per chair, MFA on root, root
credentials parked in the vault and unused day-to-day, and CloudTrail left on.

**Domain integrity — do not regress.** `built-illinois.org` is served directly at
its origin (GitHub Pages today, CloudFront after Phase 2). **Never enable
Squarespace domain forwarding or URL masking** on the apex, `www`, or any
auth-bearing subdomain. Masking wraps the site in an iframe, which (a) breaks
Google OAuth outright — Google refuses to render its consent screen in a frame —
and (b) makes the session cookie third-party, so Safari and Chrome drop it. This
has been mistakenly believed to be the current mechanism; it is not, and
introducing it would break sign-in in a way that is miserable to diagnose.

**Subdomain hygiene.** Every `*.built-illinois.org` name is a phishing surface once
members are trained to sign in on this domain. Decommission order is always
**DNS record first, then the AWS resource** — a dangling CNAME pointing at a
released bucket or distribution invites subdomain takeover. Keep the subdomain
inventory current in the transition runbook; `eoh` is being torn down in Phase 0.

**Neighbouring infrastructure.** The `builtuiuc` account ran a Cognito Identity
Pool vending AWS credentials to anonymous browser visitors (EOH Air Canvas → IoT
Core over WebSocket). Audited and neutered 2026-08-26; **full teardown decided
2026-09-28** and scheduled in Phase 0 — which matters more than it would have
under the original plan, because that is the same account the website and member
PII now live in (§3). The general lesson for future student projects, which now
land in `tech-committee`: **a Cognito Identity Pool with guest access puts its
IAM role on the public internet** — the pool ID ships in the JavaScript bundle
and cannot be a secret, so that role's policy is the only boundary. Scope such
roles to specific ARNs, never `"Resource": "*"`, and never grant
`iot:AttachPolicy` (or any other permission-granting action) to an
unauthenticated role. Keeping project work in `tech-committee` is what keeps
member PII out of the blast radius when this is inevitably gotten wrong again.

**Optics:** the repo should look like what it is — a well-run student org project.
README explains architecture; SECURITY.md gives a contact for reporting issues;
no commented-out secrets, no TODO hacks around auth; audit trail for every
administrative action protects both members and officers.

---

## 9. Resolved decisions

1. **AWS accounts** (confirmed 2026-09-28): two, under one Organization.
   `builtuiuc` (242201276922) is the management/payer account, rooted on the
   university-provided RSO email — a durable org address, not an individual's
   netid, so recovery survives graduations — and it also hosts the website,
   tracker and member PII. `tech-committee` (128793515151, a gmail address)
   takes all other student project work. The RSO pays the bill; university/AWS
   credits are being explored (credits apply at the payer level, so the split
   does not complicate them). Consequences: per-chair IAM identities (never
   shared logins), root MFA held by the organization rather than a person
   (Phase 0), a written transition runbook, EOH teardown promoted to a
   prerequisite, and the two accepted deviations recorded in §3 — workloads in
   the management account, and the non-university root email on
   `tech-committee`.
2. **DNS:** `built-illinois.org` is registered at Squarespace, and Squarespace also
   manages its DNS records. The `ns-cloud-*.googledomains.com` nameservers are
   Squarespace defaults inherited from its 2023 Google Domains acquisition — legacy
   branding, not a separate Google account, and the domain is not on custom
   nameservers. Squarespace is not in the request path; there is no masking or
   proxying. Authoritative DNS moves at Phase 2 solely to get apex alias records
   for CloudFront, which Squarespace cannot do — to Route 53 in `builtuiuc`
   (~$0.50/mo) or to Cloudflare's free tier ($0); that choice is still open on
   cost-vs-extra-vendor grounds (§3). **Registration stays at Squarespace either
   way** (~$20/yr) — moving DNS hosting does not move or eliminate the
   registration. The Squarespace login joins the transition runbook.
3. **Google OAuth:** the RSO Infrastructure Chair Google account owns the Google
   Cloud project. Because that account is outside the Illinois Google Workspace,
   the OAuth consent screen must be **External** (an Internal consent screen is
   only possible for apps owned inside the university workspace). This is fine: we
   only request the non-sensitive `openid email profile` scopes, so no Google
   verification review is needed — just publish the consent screen to
   "In production" so users do not see an unverified-app warning. The
   `@illinois.edu` restriction is enforced **server-side** by validating the `hd`
   claim / email domain on the verified ID token (with `hd=illinois.edu` passed as
   a login hint for UX); the consent-screen type has no bearing on security.
   Google account access joins the transition runbook.

---

## 10. Remaining unknowns (resolve in Phase 0)

1. ~~University / AWS credits~~ — **resolved 2026-09-28: none available.** The
   §3 cost estimate stands as the real, unsubsidised bill (~$9–19/mo). This is
   what makes the Aurora scale-to-zero choice (#7) load-bearing rather than
   merely nice.
2. ~~Squarespace panel records not visible externally~~ — **resolved 2026-09-28.**
   One found: the `_domainconnect` CNAME (Squarespace Domain Connect preset),
   intentionally not carried over. See `docs/dns-inventory.md`; a few panel-only
   TTL confirmations remain.
3. ~~Custody of the root MFA factor~~ — **resolved 2026-09-28: root MFA is held
   by multiple executive members** on both accounts, so neither account dies with
   one person's phone. The durable university root email on `builtuiuc` plus
   multi-officer MFA closes the account-recovery risk from §7.
4. ~~Retired EOH project~~ — **resolved 2026-09-28: full teardown**, promoted to a
   Phase 0 prerequisite because the website and member PII now share that account
   (§3, §7).
5. ~~RDS free-tier eligibility on `builtuiuc`~~ — **resolved 2026-09-28: the RDS
   free tier is fully spent.** There is no free year. The cost table in §3 has
   been rebased accordingly, and the database choice (below) is now live rather
   than deferred to the 12-month mark.
6. ~~DNS host choice~~ — **resolved 2026-09-28: Route 53 in `builtuiuc`**
   (~$0.50/mo). Cloudflare's free tier was considered and declined — keeping DNS
   in the same account as the infrastructure is worth $6/yr against adding a
   third vendor to the chair handover. Registration stays at Squarespace.
7. ~~Database engine choice~~ — **resolved 2026-09-28: Aurora Serverless v2
   (PostgreSQL) with scale-to-zero** (§3, §4.8, Phase 3). Chosen while the backend
   is still unbuilt so the connection-pool constraint is designed in rather than
   retrofitted. RDS + 1-yr Reserved Instance (~$10/mo) is the documented fallback
   if that constraint proves unmanageable in practice; reverting is a snapshot
   restore.
8. ~~Which calendar entries are attendance-tracked~~ — **resolved 2026-09-28
   (Secretary): all of them.** No `trackable` flag, no title convention, no
   toggle. Every synced entry is eligible; the exec opening attendance remains
   the only gate, so non-meeting entries (deadlines, external events) simply
   never have attendance opened and sit harmlessly in the list.
9. ~~Recurring events~~ — **resolved 2026-09-28 (Secretary): recurring series,
   and each occurrence is its own event.** Sync with `singleEvents=true` and key
   on the instance id; see Phase 5 for the bounded time-window requirement that
   comes with expanding a repeating series.
10. ~~Calendar visibility / API access~~ — **resolved 2026-09-28 (Secretary): the
    calendar is public.** Read-only API key is sufficient — no service account,
    no OAuth flow for calendar reads. (The separate Google OAuth project in §9.3
    is still needed for *user sign-in*; these are unrelated.)
11. **Calendar id is now configuration, not a constant.** It changed once already
    (2026-09-28, commit `c0b55f6`). The frontend embed and the Phase 5 sync
    service both need it; keep it in Parameter Store and have the frontend read
    it from the content API rather than hardcoding it in two places.

---

## 11. Execution notes

**Read this before starting implementation.**

### Where to start

Phase 0 is mostly console and organizational work. **Phase 1 — the Next.js
migration — is the first phase that is purely code**, and the natural starting point
for an implementer without AWS console access. Phase 1 can run in parallel with
Phase 0's human items. The one hard ordering constraint: **do not begin Phase 2
until the AWS accounts exist and the DNS records have been exported from
Squarespace.**

### Steps that require a human at a console

An implementer cannot do these; they must be requested from the infrastructure chair.

- AWS account creation, Organizations setup, Budgets alerts, root MFA custody
- The EOH Cognito/IoT teardown execution (the decision itself was made 2026-09-28)
- Squarespace: TTL changes and the nameserver switch
- Google Cloud project creation, OAuth consent screen setup and publishing
- GitHub org settings: branch protection, secret scanning, disabling Pages
- Anything requiring the RSO password vault or the RSO mailbox

### Steps an implementer can do unaided

- Repo restructure (§6); Next.js scaffold and page ports (Phase 1)
- Content extraction to `frontend/data/`; typed API client
- All backend code, Alembic migrations, tests, CI workflow files (Phases 3–6)
- Infrastructure-as-code definitions, if the team wants them — a human applies them

### Working rules (answered by the RSO, 2026-08-26)

These are decisions, not suggestions. Follow them.

1. **Contradictory contact details become placeholders, never guesses.** The two
   committee netids that conflict with the About page (`achav8` vs
   `ag131@illinois.edu` for the External lead; `alara2` vs `adrian11@illinois.edu`
   for Fundraising) are to be rendered from a shared `PLACEHOLDER_EMAIL` constant.
   Use the same constant anywhere else contact data is unverified. It is greppable
   on purpose — Phase 2 checks that none reach production unnoticed.
2. **Preserve the current CSS.** The existing `src/styles/*.css` files port over
   unchanged, and the site should look the same after migration as before.
   **Any CSS change requires the user's approval first** — including refactors,
   consolidation, or "cleanup" that is not intended to alter appearance. Propose,
   then wait. This overrides the tracker spec's Tailwind preference for all
   existing pages.
3. **Never invent e-board or committee content.** That data is maintained by the
   RSO and updated on their schedule. When a task needs current content, stop and
   prompt the user to supply or edit it rather than filling it in from the old
   values in the repo or from the live site.

### Known small defects to fix in passing

- `aboutPage.js`: Bijou Leinbach's email string has a leading space.
- `.github/workflows/deployment.yml` pins Node 18, which is end-of-life. Bump to 20
  or 22 during Phase 1; current Next.js requires 18.18+ regardless.
- The homepage carousel hardcodes 29 image paths; Phase 1 should discover them from
  the directory instead.
