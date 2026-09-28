// Shared content shapes for statically-ported site data.
// See docs/aws-migration-plan.md §11 rule 3: this data is maintained by the RSO
// and must never be invented or refreshed unprompted by an implementer.

export interface EboardMember {
  /** Omitted when the RSO has not supplied a photo yet — the card renders without one. */
  image?: string;
  title: string;
  name: string;
  email: string;
  /** Empty when the member did not provide an introduction. */
  description: string;
}

export interface Committee {
  name: string;
  lead: string;
  /** Full contact email, or PLACEHOLDER_EMAIL when unverified — see utils/placeholder.ts */
  email: string;
  description: string;
  meeting: string;
  channel: string;
}

export interface Sponsor {
  name: string;
  logo: string;
  className?: string;
}
