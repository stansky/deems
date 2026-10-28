import type { TargetCompany, TargetRole, TargetSource } from "@/lib/target-types";

const checkedAt = "2026-10-27";
const role = (id: string, companyId: string, title: string, sourceUrl: string): TargetRole => ({
  id,
  companyId,
  title,
  priority: "Explore",
  rationale: "Public role reference. Confirm the current listing and requirements at the source.",
  sourceUrl,
  checkedAt,
  publishedProcess: [],
  stack: [],
  requirements: [],
  steps: [],
});

// Public company directory entries. Candidate-specific company choices and notes live in the local overlay.
export const targetCompanies: TargetCompany[] = [
  { id: "sycamore", name: "Sycamore", summary: "Enterprise agent software company.", careersUrl: "https://sycamore.so/careers/", researchStatus: "To research", focus: "Review current public role descriptions." },
  { id: "tesla", name: "Tesla", summary: "Automotive and energy company.", careersUrl: "https://www.tesla.com/careers", researchStatus: "To research", focus: "Review current public role descriptions." },
  { id: "anthropic", name: "Anthropic", summary: "AI research and product company.", careersUrl: "https://www.anthropic.com/careers/jobs", researchStatus: "To research", focus: "Review current public role descriptions." },
  { id: "crunchyroll", name: "Crunchyroll", summary: "Anime streaming and entertainment company.", careersUrl: "https://www.crunchyroll.com/about/jobs", researchStatus: "To research", focus: "Review current public role descriptions." },
  { id: "general", name: "General", summary: "Shared engineering learning and practice.", careersUrl: "", researchStatus: "To research", focus: "Use shared learning materials across roles." },
];

// Public role references only. No candidacy stage, application link, personal fit, or interview plan is seeded here.
export const targetRoles: TargetRole[] = [
  role("sycamore-fde", "sycamore", "Forward Deployed Engineer", "https://sycamore.so/careers/forward-deployed-engineer/"),
  role("sycamore-products", "sycamore", "Member of Technical Staff, Products", "https://sycamore.so/careers/mts-products/"),
  role("sycamore-ai-services", "sycamore", "Member of Technical Staff, AI Services", "https://sycamore.so/careers/mts-ai-services/"),
  role("sycamore-core-ai", "sycamore", "Member of Technical Staff, Core AI", "https://sycamore.so/careers/mts-core-ai/"),
  role("sycamore-security", "sycamore", "Member of Technical Staff, Security", "https://sycamore.so/careers/mts-security/"),
  role("sycamore-product-staff", "sycamore", "Member of Product Staff", "https://sycamore.so/careers/member-of-product-staff/"),
  role("tesla-cloud-platforms", "tesla", "Sr. Fullstack Software Engineer, Cloud Platforms", "https://www.tesla.com/careers/search/job/sr-fullstack-software-engineer-cloud-platforms-282632"),
  role("tesla-fleetnet-sre", "tesla", "Staff Site Reliability Engineer, Robotaxi & Optimus", "https://www.tesla.com/careers/search/job/staff-site-reliability-engineer-fleetnet-vehicle-software-277647"),
  role("anthropic-fullstack", "anthropic", "Senior Software Engineer, Full-stack", "https://job-boards.greenhouse.io/anthropic/jobs/5174743008-87"),
  role("anthropic-staff-fde", "anthropic", "Staff Forward Deployed Engineer", "https://job-boards.greenhouse.io/anthropic/jobs/5449229008"),
  role("crunchyroll-infrastructure", "crunchyroll", "Senior Software Engineer, Infrastructure Engineering", "https://job-boards.greenhouse.io/crunchyroll/jobs/8168263?gh_jid=8168263"),
  role("general-senior-engineering", "general", "Senior engineering foundations", ""),
];

// Dated candidate-specific research is kept in the local private seed overlay.
export const targetSources: TargetSource[] = [];
