# DNS inventory — built-illinois.org

**Source:** live public DNS queries (`Resolve-DnsName`), captured 2026-09-28.
This is the externally-observable half of the Phase 0 DNS inventory
(`docs/aws-migration-plan.md` §7 Phase 0, §10 unknown #2). It independently
confirms the baseline in the plan's §2 table — nothing has drifted.

**Still needed to close out the Phase 0 checklist item:** open the
Squarespace DNS panel itself and copy (not screenshot) every row's exact
type/host/value/TTL into the table below, replacing "TBD". The panel is the
only place that can reveal a record that *isn't* currently resolving to
anything public — e.g. an unused verification TXT record — which an external
query like this one can't discover if you don't already know to ask for it
at the right subdomain.

## Records confirmed live (external query)

| Host | Type | Value | TTL |
|---|---|---|---|
| `built-illinois.org` | A | 185.199.108.153 | 14400 |
| `built-illinois.org` | A | 185.199.109.153 | 14400 |
| `built-illinois.org` | A | 185.199.110.153 | 14400 |
| `built-illinois.org` | A | 185.199.111.153 | 14400 |
| `www.built-illinois.org` | CNAME | `b-u-i-l-t-uiuc.github.io` | 14400 |
| `eoh.built-illinois.org` | CNAME | `d3vvzsqcqggbfd.cloudfront.net` | 1800 |
| `built-illinois.org` | NS (registry-level, not editable in the panel) | `ns-cloud-d1..d4.googledomains.com` | 3600 |

## Confirmed absent (queried, zero results)

| Host | Type | Result |
|---|---|---|
| `built-illinois.org` | TXT | none |
| `built-illinois.org` | MX | none |

## Found in the panel only (not externally discoverable)

| Host | Type | Value | TTL | Carry over? |
|---|---|---|---|---|
| `_domainconnect` | CNAME | `_domainconnect.domains.squarespace.com` | 1 hr | **No — intentionally dropped** |

`_domainconnect` is a Squarespace "DNS Preset" record. It advertises where
Squarespace's Domain Connect API lives, which is the protocol third-party
services use to auto-configure DNS *at Squarespace*. Once the nameservers move,
Squarespace no longer serves this zone and the record does nothing. Recorded here
so a future reader can see it was dropped deliberately rather than missed.

This is also the record that justifies the manual panel pass: no external query
could have found it without already knowing to ask for that exact subdomain.

## TBD — fill in from the Squarespace panel directly

- [ ] Any *other* record type/host not listed above that appears in the panel (a CAA record, a stale verification TXT, a redirect-only entry).
