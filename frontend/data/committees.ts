import type { Committee } from "../types/content";

// 2026–27 committees, supplied by the RSO 2026-09-28. Fundraising was removed
// at the RSO's request 2026-10-08.
//
// Per docs/aws-migration-plan.md §11 rule 3, this content is maintained by the
// RSO and must not be refreshed or invented by an implementer — only edited
// here when the RSO supplies updated values.
//
// Each `email` should match the same person's entry in eboard.ts. If one ever
// conflicts with the other and the correct value is unknown, use
// PLACEHOLDER_EMAIL from utils/placeholder.ts rather than guessing (§11 rule 1)
// — Phase 2's pre-launch check greps for it.
export const committees: Committee[] = [
  {
    name: "Tech",
    lead: "Eduardo Aranda",
    email: "earanda2@illinois.edu",
    description: "Build technical projects supporting B[U]ILT’s mission!",
    meeting: "Meets 6:05-7:05 PM every Monday at Siebel CS 0220",
    channel: "tech-committee",
  },
  {
    name: "External",
    lead: "Saniya Sanders",
    email: "saniyas3@illinois.edu",
    description:
      "Build and maintain partnership opportunities between B[U]ILT and sponsors!",
    meeting: "Meets every other Monday 2:30 PM at Siebel CS 0212",
    channel: "external-committee",
  },
  {
    name: "Social",
    lead: "Kay Rivera",
    email: "krive5@illinois.edu",
    description: "Plan and organize social events to build B[U]ILT’s community!",
    meeting: "Meets every Monday 8:00-9:00 PM at Siebel CS 0212",
    channel: "social-committee",
  },
  {
    name: "Outreach",
    lead: "Erick Gutierrez",
    email: "egutie44@illinois.edu",
    description:
      "Engage with high schools to inspire future B[U]ILT members to study at UIUC!",
    meeting: "Meets every Thursday 6:30-7:30 PM at Siebel CS 0212",
    channel: "outreach-committee",
  },
];
