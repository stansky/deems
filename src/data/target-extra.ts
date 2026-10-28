import type { TargetRole, TargetCompany } from "@/lib/target-types";

export const extraTargetCompanies: TargetCompany[] = [];

// Public posting retained as a generic directory entry, without recruiter or candidate annotations.
export const extraTargetRoles: TargetRole[] = [
  {
    id: "crunchyroll-concepts-lab",
    companyId: "crunchyroll",
    title: "Senior Software Engineer, Concepts Lab",
    priority: "Explore",
    rationale: "Public role reference. Confirm the current listing and requirements at the source.",
    sourceUrl: "https://job-boards.greenhouse.io/crunchyroll/jobs/8103939?gh_jid=8103939",
    checkedAt: "2026-10-27",
    publishedProcess: [],
    stack: [],
    requirements: [],
    steps: [],
  },
];
