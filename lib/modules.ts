// App-level navigation module ids. This is a SUPERSET of the copilot's own
// `ModuleId` (defined independently in lib/copilot.ts), so new HR modules can be
// added here without modifying any AI/copilot files. The copilot's ids remain a
// compatible subset, so copilot navigation actions still type-check.
export type AppModuleId =
  | "dashboard"
  | "core-hr"
  | "time"
  | "performance"
  | "benefits"
  | "training"
  | "payroll"
  | "ats"
  | "compliance";

export interface ModuleDef {
  id: AppModuleId;
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
  { id: "benefits", label: "Benefits", group: "People", description: "Health, dental & 401(k) enrollment" },
  { id: "training", label: "Training & LMS", group: "People", description: "Compliance & skill development" },
  { id: "payroll", label: "Payroll & Compensation", group: "Finance", description: "Runs, taxes & reimbursements" },
  { id: "ats", label: "Talent Acquisition", group: "Talent", description: "Candidate pipeline & screening" },
  { id: "compliance", label: "Compliance & Security", group: "Governance", description: "Access audit trail" },
];

export const MODULE_LABEL: Record<AppModuleId, string> = MODULES.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.label }),
  {} as Record<AppModuleId, string>
);
