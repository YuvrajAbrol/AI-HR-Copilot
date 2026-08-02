// ---------------------------------------------------------------------------
// Domain model for the HR Copilot Workspace.
//
// Strictly typed so the in-memory factory dataset can be swapped for a real
// FastAPI / Azure SQL backend without touching components — the API just needs
// to return objects that satisfy these interfaces.
// ---------------------------------------------------------------------------

export type Role = "admin" | "manager" | "employee";

export type Department =
  | "Engineering"
  | "Sales"
  | "Human Resources"
  | "Marketing"
  | "Executive";

export type EmployeeStatus = "Active" | "On Leave" | "Onboarding" | "Terminated";
export type EmploymentType = "Full-time" | "Part-time" | "Contract";

export interface CompChange {
  effectiveDate: string;
  baseSalary: number;
  reason: string;
}

export interface Paystub {
  id: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  gross: number;
  federalTax: number;
  stateTax: number;
  fica: number;
  medicare: number;
  healthDeduction: number;
  retirement401k: number;
  net: number;
}

export type PtoType = "Vacation" | "Sick" | "Personal";
export type RequestStatus = "Approved" | "Pending" | "Rejected";

export interface PtoRequest {
  id: string;
  employeeId: string;
  type: PtoType;
  start: string;
  end: string;
  days: number;
  status: RequestStatus;
  reason: string;
}

export type GoalStatus = "On Track" | "At Risk" | "Behind" | "Completed";

export interface Goal {
  id: string;
  objective: string;
  keyResult: string;
  progress: number;
  status: GoalStatus;
  dueDate: string;
}

export type CourseStatus = "Completed" | "In Progress" | "Overdue" | "Not Started";

export interface TrainingCourse {
  name: string;
  status: CourseStatus;
  completedDate: string | null;
}

export interface EmployeeDocument {
  name: string;
  type: string;
  uploaded: string;
  size: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  dob: string;
  location: string;
  address: string;
  title: string;
  department: Department;
  team: string;
  level: string;
  managerId: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  startDate: string;
  tenureYears: number;
  comp: {
    baseSalary: number;
    bonusTarget: number;
    equityUnits: number;
    history: CompChange[];
  };
  paystubs: Paystub[];
  pto: {
    vacationTotal: number;
    vacationUsed: number;
    sickTotal: number;
    sickUsed: number;
    personalTotal: number;
    personalUsed: number;
    requests: PtoRequest[];
  };
  performance: {
    rating: number; // 1..5
    potential: "Low" | "Medium" | "High";
    nineBox: number; // 1..9
    lastReview: string;
    reviewer: string;
    goals: Goal[];
  };
  training: {
    compliancePct: number;
    courses: TrainingCourse[];
  };
  documents: EmployeeDocument[];
}

// ------------------------------ ATS ----------------------------------------

export type CandidateStage =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Hired";

export interface Candidate {
  id: string;
  name: string;
  initials: string;
  role: string;
  department: Department;
  stage: CandidateStage;
  matchScore: number;
  appliedDate: string;
  source: string;
  yearsExp: number;
  location: string;
  compliance: "Cleared" | "Pending" | "Flagged";
}

// --------------------------- Payroll ----------------------------------------

export interface PayrollRun {
  id: string;
  period: string;
  payDate: string;
  headcount: number;
  grossTotal: number;
  taxTotal: number;
  netTotal: number;
  status: "Processed" | "Pending" | "Draft";
}

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  category: string;
  amount: number;
  date: string;
  status: RequestStatus;
}

// --------------------------- Compliance -------------------------------------

export type AuditSystem =
  | "Azure SQL"
  | "Azure AI Search"
  | "Microsoft Graph"
  | "MCP Gateway"
  | "Auth / RBAC";

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  system: AuditSystem;
  resource: string;
  ip: string;
  status: "success" | "denied" | "warning";
}

// ------------------------------ Dataset -------------------------------------

export interface HrDataset {
  employees: Employee[];
  candidates: Candidate[];
  payrollRuns: PayrollRun[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  holidays: { date: string; name: string }[];
  roleUsers: Record<Role, string>; // role -> employeeId acting as the session user
}
