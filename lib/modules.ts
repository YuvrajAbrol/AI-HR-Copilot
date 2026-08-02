import type { ModuleId } from "./copilot";

export interface ModuleDef {
  id: ModuleId;
  label: string;
  group: "Overview" | "People" | "Finance" | "Talent" | "Governance";
  description: string;
}

// Ordered nav manifest. Sidebar, breadcrumbs, command palette, and the copilot
// all resolve module metadata from here.
export const MODULES: ModuleDef[] = [
  { id: "dashboard", label: "Dashboard", group: "Overview", description: "Role-aware overview & analytics" },
  { id: "core-hr", label: "Employee Database", group: "People", description: "Company directory & full profiles" },
  { id: "time", label: "Time & Attendance", group: "People", description: "Leave calendar & timesheets" },
  { id: "performance", label: "Performance & OKRs", group: "People", description: "9-box grid & goal tracking" },
  { id: "payroll", label: "Payroll & Compensation", group: "Finance", description: "Runs, taxes & reimbursements" },
  { id: "ats", label: "Talent Acquisition", group: "Talent", description: "Candidate pipeline & screening" },
  { id: "compliance", label: "Compliance & Security", group: "Governance", description: "Access audit trail" },
];

export const MODULE_LABEL: Record<ModuleId, string> = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.label }),
  {} as Record<ModuleId, string>
);
