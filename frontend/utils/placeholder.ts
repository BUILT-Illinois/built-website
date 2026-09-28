/**
 * Shared placeholder for contact details that are known to be unverified or
 * contradictory in the source content, rather than guessed.
 *
 * Per docs/aws-migration-plan.md §11 rule 1: two committee netids conflict
 * with the per-person email shown on the About page (External: achav8 vs
 * ag131@illinois.edu; Fundraising: alara2 vs adrian11@illinois.edu). Both are
 * rendered from this constant instead of picking one arbitrarily. It is
 * greppable on purpose — Phase 2's pre-launch content check greps for it to
 * make sure no unresolved placeholder reaches production silently.
 */
export const PLACEHOLDER_EMAIL = "PLACEHOLDER_EMAIL@illinois.edu";
