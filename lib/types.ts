// ---------------------------------------------------------------------------
// Domain & UI types for the HR Copilot Workspace.
//
// These are intentionally explicit so the mock state can be swapped for real
// FastAPI / Azure SQL REST responses with zero component changes — the network
// layer just needs to return objects that satisfy these interfaces.
// ---------------------------------------------------------------------------

export type SecurityRole = "admin" | "recruiter";

export interface RoleProfile {
  id: SecurityRole;
  label: string;
  rbacTier: string;
  clearance: string;
  canViewPayroll: boolean;
  canViewPII: boolean;
}

export type ViewId =
  | "dashboard"
  | "directory"
  | "payroll"
  | "onboarding"
  | "resume-screener"
  | "policy"
  | "audit"
  | "employee-detail";

export interface Employee {
  id: string;
  name: string;
  title: string;
  department: string;
  managerName: string;
  email: string;
  phone: string;
  location: string;
  initials: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  startDate: string;
  status: "Active" | "On Leave" | "Onboarding";
  ptoRemainingHours: number;
  ptoUsedHours: number;
  ptoAccruedHours: number;
  upcomingLeave: { start: string; end: string; type: string } | null;
  nextPayday: string;
  annualSalary: number; // sensitive — masked below RBAC tier
  payRate: string; // sensitive
}

export interface DepartmentHeadcount {
  department: string;
  headcount: number;
  openReqs: number;
}

export interface PtoTrendPoint {
  month: string;
  requested: number;
  approved: number;
}

export interface PayrollDistribution {
  band: string;
  employees: number;
  totalCost: number;
}

export interface PolicyDocument {
  id: string;
  title: string;
  filename: string;
  topic: string;
  section: string;
  snippet: string;
  updated: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  matchScore: number;
  yearsExperience: number;
  education: string;
  location: string;
  topSkills: string[];
  missingSkills: string[];
  compliance: "Cleared" | "Pending" | "Flagged";
  summary: string;
  resumeFile: string;
}

export interface OnboardingTask {
  id: string;
  label: string;
  owner: string;
  category: "Paperwork" | "IT" | "Compliance" | "Culture";
  status: "complete" | "in-progress" | "pending";
  due: string;
}

export interface OnboardingHire {
  id: string;
  name: string;
  role: string;
  startDate: string;
  initials: string;
  tasks: OnboardingTask[];
}

export type BackendSystem =
  | "Azure SQL"
  | "Azure AI Search"
  | "Microsoft Graph API"
  | "MCP Tool"
  | "Guardrail Engine";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  rbacTier: string;
  action: string;
  system: BackendSystem;
  resource: string;
  status: "success" | "blocked" | "warning";
}

// -------------------------- Copilot / agent types --------------------------

export type StepSystem =
  | "intent"
  | "sql"
  | "search"
  | "graph"
  | "mcp"
  | "guardrail"
  | "synth";

export type StepStatus = "running" | "done" | "blocked";

export interface ReasoningStep {
  id: string;
  label: string;
  system: StepSystem;
  status: StepStatus;
  detail?: string;
  badge?: BackendSystem;
}

export interface Citation {
  title: string;
  filename: string;
  section: string;
}

export interface FollowUp {
  id: string;
  label: string;
  /** 'prompt' re-sends text to the agent; 'action' triggers a UI side-effect. */
  kind: "prompt" | "action";
  payload: string;
}

export interface CanvasAction {
  view: ViewId;
  employeeId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps: ReasoningStep[];
  citations: Citation[];
  followUps: FollowUp[];
  systems: BackendSystem[];
  blocked?: boolean;
  pending?: boolean;
}

export interface AgentTurn {
  response: string;
  steps: ReasoningStep[];
  citations: Citation[];
  followUps: FollowUp[];
  systems: BackendSystem[];
  canvasAction?: CanvasAction;
  blocked?: boolean;
}
