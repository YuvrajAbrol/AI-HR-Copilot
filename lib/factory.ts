// ---------------------------------------------------------------------------
// Mock data factory.
//
// Builds a realistic, RELATIONAL HR dataset entirely in memory using a seeded
// PRNG so the output is deterministic (stable across SSR + client hydration).
// Generates 52 employees across 5 departments with a real org hierarchy, comp
// history, 12 months of paystubs, PTO, performance, training, plus candidates,
// payroll runs, expenses and audit logs.
//
// Swap `buildDataset()` for a FastAPI/Azure SQL fetch later; the shapes match
// `lib/types.ts` exactly.
// ---------------------------------------------------------------------------

import type {
  AuditLog,
  AuditSystem,
  Candidate,
  CandidateStage,
  CompChange,
  Department,
  Employee,
  EmployeeStatus,
  Expense,
  Goal,
  HrDataset,
  Paystub,
  PayrollRun,
  PtoRequest,
  Role,
  Scorecard,
  Timesheet,
  TrainingCourse,
} from "./types";

// Fixed "today" keeps generation deterministic between server and client.
const NOW = new Date("2026-07-31T00:00:00Z");

// -------------------------------- PRNG -------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260731);
const rand = () => rng();
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;

// ------------------------------- Pools -------------------------------------
const FIRST = [
  "Sarah", "Marcus", "Priya", "David", "Fatima", "Tom", "Grace", "Liam", "Nina", "Sofia",
  "Elena", "Raj", "Mia", "Ahmed", "Chen", "Olivia", "Noah", "Emma", "James", "Ava",
  "William", "Isabella", "Lucas", "Sophia", "Henry", "Amara", "Ethan", "Layla", "Mateo", "Zoe",
  "Kai", "Aisha", "Diego", "Yuki", "Omar", "Hannah", "Leo", "Freya", "Arjun", "Nadia",
  "Felix", "Ruby", "Samuel", "Chloe", "Ivan", "Maya", "Theo", "Lena", "Caleb", "Anya",
  "Jonah", "Talia",
];
const LAST = [
  "Chen", "Lee", "Nair", "Alvarez", "Khan", "Becker", "Okafor", "O'Brien", "Petrova", "Rivera",
  "Volkov", "Patel", "Rodriguez", "Hassan", "Nguyen", "Kim", "Johnson", "Williams", "Brown", "Garcia",
  "Martinez", "Davis", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Schmidt", "Rossi", "Ivanov", "Yamamoto", "Haddad", "Fischer", "Kowalski", "Andersson", "Sharma", "Osei",
];
const CITIES = [
  "Seattle, WA", "Austin, TX", "New York, NY", "Chicago, IL", "Remote", "San Francisco, CA",
  "Denver, CO", "Boston, MA", "Atlanta, GA", "Remote (EU)",
];
const STREETS = ["Pine St", "Maple Ave", "Cedar Ln", "Oak Blvd", "Birch Way", "Elm Ct", "Willow Rd"];

interface DeptSpec {
  department: Department;
  headTitle: string;
  managerTitle: string;
  teams: string[];
  icTitles: string[];
  managers: number;
  ics: number;
  salaryBand: [number, number];
}

const DEPT_SPECS: DeptSpec[] = [
  {
    department: "Engineering",
    headTitle: "VP of Engineering",
    managerTitle: "Engineering Manager",
    teams: ["Platform", "Payments", "Infrastructure", "Frontend", "Data"],
    icTitles: ["Software Engineer", "Senior Software Engineer", "Staff Software Engineer", "Backend Engineer", "Frontend Engineer", "SRE"],
    managers: 3,
    ics: 20,
    salaryBand: [118000, 235000],
  },
  {
    department: "Sales",
    headTitle: "VP of Sales",
    managerTitle: "Sales Manager",
    teams: ["Enterprise", "Mid-Market", "SMB"],
    icTitles: ["Account Executive", "Senior AE", "Sales Development Rep", "Solutions Engineer"],
    managers: 2,
    ics: 9,
    salaryBand: [85000, 190000],
  },
  {
    department: "Human Resources",
    headTitle: "Chief People Officer",
    managerTitle: "People Operations Manager",
    teams: ["People Ops", "Talent", "L&D"],
    icTitles: ["HR Business Partner", "Recruiter", "People Ops Specialist", "Payroll Specialist"],
    managers: 1,
    ics: 4,
    salaryBand: [78000, 165000],
  },
  {
    department: "Marketing",
    headTitle: "VP of Marketing",
    managerTitle: "Marketing Manager",
    teams: ["Growth", "Brand", "Product Marketing"],
    icTitles: ["Marketing Specialist", "Content Strategist", "Growth Marketer", "Designer"],
    managers: 1,
    ics: 6,
    salaryBand: [72000, 158000],
  },
];

const TRAINING_CATALOG = [
  "Security Awareness 2026",
  "Code of Conduct",
  "Data Privacy & GDPR",
  "Anti-Harassment",
  "Inclusive Leadership",
];

const GOAL_OBJECTIVES = [
  ["Improve service reliability", "Reduce p99 latency by 30%"],
  ["Grow enterprise pipeline", "Source $2.5M in new qualified opps"],
  ["Elevate employer brand", "Increase offer-accept rate to 85%"],
  ["Launch onboarding revamp", "Cut time-to-productivity by 2 weeks"],
  ["Expand market presence", "Deliver 4 product launches"],
  ["Strengthen data governance", "Achieve 100% SOC2 control coverage"],
];

// --------------------------- Helpers ---------------------------------------
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 86400000);
}
function round(n: number, step = 1): number {
  return Math.round(n / step) * step;
}

let empCounter = 0;
function nextEmpId(): string {
  empCounter += 1;
  return `EMP-${String(empCounter).padStart(4, "0")}`;
}

function makePaystubs(baseSalary: number): Paystub[] {
  const monthlyGross = baseSalary / 12;
  const stubs: Paystub[] = [];
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  for (let i = 11; i >= 0; i -= 1) {
    const payDate = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    const label = `${months[11 - i]} ${payDate.getFullYear()}`;
    const gross = round(monthlyGross, 0.01);
    const federalTax = round(gross * 0.16, 0.01);
    const stateTax = round(gross * 0.05, 0.01);
    const fica = round(gross * 0.062, 0.01);
    const medicare = round(gross * 0.0145, 0.01);
    const healthDeduction = round(210, 0.01);
    const retirement401k = round(gross * 0.06, 0.01);
    const net = round(
      gross - federalTax - stateTax - fica - medicare - healthDeduction - retirement401k,
      0.01
    );
    stubs.push({
      id: `PS-${payDate.getFullYear()}${String(payDate.getMonth() + 1).padStart(2, "0")}`,
      period: label,
      periodStart: iso(new Date(payDate.getFullYear(), payDate.getMonth() - 1, 1)),
      periodEnd: iso(new Date(payDate.getFullYear(), payDate.getMonth(), 0)),
      payDate: iso(payDate),
      gross,
      federalTax,
      stateTax,
      fica,
      medicare,
      healthDeduction,
      retirement401k,
      net,
    });
  }
  return stubs;
}

function makeCompHistory(startDate: Date, currentSalary: number): CompChange[] {
  const history: CompChange[] = [];
  let salary = round(currentSalary * 0.78, 1000);
  let date = new Date(startDate);
  const reasons = ["New hire", "Annual merit increase", "Promotion", "Market adjustment", "Annual merit increase"];
  let idx = 0;
  while (date < NOW && idx < reasons.length) {
    history.push({ effectiveDate: iso(date), baseSalary: idx === reasons.length - 1 ? currentSalary : salary, reason: reasons[idx] });
    salary = round(salary * (1 + (0.05 + rand() * 0.08)), 1000);
    date = new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    idx += 1;
  }
  if (history.length) history[history.length - 1].baseSalary = currentSalary;
  return history;
}

function makePto(employeeId: string): Employee["pto"] {
  const vacationTotal = randInt(15, 25);
  const sickTotal = randInt(6, 10);
  const personalTotal = randInt(3, 5);
  const requests: PtoRequest[] = [];
  const nReq = randInt(2, 5);
  const types: PtoRequest["type"][] = ["Vacation", "Sick", "Personal"];
  for (let i = 0; i < nReq; i += 1) {
    const offset = randInt(-120, 60);
    const start = daysAgo(-offset);
    const len = randInt(1, 6);
    const end = new Date(start.getTime() + (len - 1) * 86400000);
    requests.push({
      id: `PTO-${employeeId.slice(4)}-${i}`,
      employeeId,
      type: pick(types),
      start: iso(start),
      end: iso(end),
      days: len,
      status: offset < 0 ? "Approved" : chance(0.6) ? "Approved" : chance(0.5) ? "Pending" : "Rejected",
      reason: pick(["Family time", "Vacation", "Medical", "Personal matters", "Travel", "Rest"]),
    });
  }
  return {
    vacationTotal,
    vacationUsed: randInt(0, vacationTotal),
    sickTotal,
    sickUsed: randInt(0, sickTotal),
    personalTotal,
    personalUsed: randInt(0, personalTotal),
    requests,
  };
}

function makeGoals(department: Department): Goal[] {
  const n = randInt(2, 4);
  const goals: Goal[] = [];
  const statuses: Goal["status"][] = ["On Track", "At Risk", "Behind", "Completed"];
  for (let i = 0; i < n; i += 1) {
    const [obj, kr] = pick(GOAL_OBJECTIVES);
    const progress = randInt(10, 100);
    goals.push({
      id: `G-${i}-${randInt(1000, 9999)}`,
      objective: obj,
      keyResult: kr,
      progress,
      status: progress === 100 ? "Completed" : progress > 65 ? "On Track" : progress > 40 ? "At Risk" : pick(statuses),
      dueDate: iso(daysAgo(-randInt(10, 120))),
    });
  }
  return goals;
}

function makeTraining(): Employee["training"] {
  const courses: TrainingCourse[] = TRAINING_CATALOG.map((name) => {
    const done = chance(0.72);
    const overdue = !done && chance(0.3);
    return {
      name,
      status: done ? "Completed" : overdue ? "Overdue" : chance(0.5) ? "In Progress" : "Not Started",
      completedDate: done ? iso(daysAgo(randInt(10, 200))) : null,
    };
  });
  const completed = courses.filter((c) => c.status === "Completed").length;
  return { compliancePct: Math.round((completed / courses.length) * 100), courses };
}

function makeDocuments() {
  return [
    { name: "Signed Offer Letter.pdf", type: "Offer", uploaded: iso(daysAgo(randInt(200, 1500))), size: `${randInt(120, 320)} KB` },
    { name: "I-9 Verification.pdf", type: "Compliance", uploaded: iso(daysAgo(randInt(200, 1500))), size: `${randInt(80, 200)} KB` },
    { name: "Direct Deposit Form.pdf", type: "Payroll", uploaded: iso(daysAgo(randInt(100, 900))), size: `${randInt(60, 140)} KB` },
    { name: "2025 Performance Review.pdf", type: "Performance", uploaded: iso(daysAgo(randInt(120, 300))), size: `${randInt(180, 400)} KB` },
  ];
}

function potentialFromRating(rating: number): "Low" | "Medium" | "High" {
  const roll = rand();
  if (rating >= 4.2) return roll > 0.3 ? "High" : "Medium";
  if (rating >= 3.4) return roll > 0.6 ? "High" : roll > 0.2 ? "Medium" : "Low";
  return roll > 0.7 ? "Medium" : "Low";
}
function nineBoxFor(rating: number, potential: "Low" | "Medium" | "High"): number {
  const perfTier = rating >= 4 ? 2 : rating >= 3.3 ? 1 : 0;
  const potTier = potential === "High" ? 2 : potential === "Medium" ? 1 : 0;
  return potTier * 3 + perfTier + 1; // 1..9
}

function buildEmployee(params: {
  department: Department;
  team: string;
  title: string;
  level: string;
  managerId: string | null;
  salary: number;
  status?: EmployeeStatus;
}): Employee {
  const id = nextEmpId();
  const firstName = pick(FIRST);
  const lastName = pick(LAST);
  const name = `${firstName} ${lastName}`;
  const initials = `${firstName[0]}${lastName[0]}`;
  const startDate = daysAgo(randInt(120, 2600));
  const tenureYears = +((NOW.getTime() - startDate.getTime()) / (365 * 86400000)).toFixed(1);
  const rating = +(2.6 + rand() * 2.4).toFixed(1);
  const potential = potentialFromRating(rating);
  const baseSalary = round(params.salary, 500);

  return {
    id,
    employeeId: id,
    firstName,
    lastName,
    name,
    initials,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/[^a-z]/g, "")}@closedai.com`,
    phone: `+1 (${randInt(200, 989)}) 555-${String(randInt(100, 9999)).padStart(4, "0")}`,
    dob: iso(new Date(1975 + randInt(0, 25), randInt(0, 11), randInt(1, 28))),
    location: pick(CITIES),
    address: `${randInt(100, 9999)} ${pick(STREETS)}`,
    title: params.title,
    department: params.department,
    team: params.team,
    level: params.level,
    managerId: params.managerId,
    employmentType: chance(0.9) ? "Full-time" : chance(0.5) ? "Part-time" : "Contract",
    status: params.status ?? (chance(0.88) ? "Active" : chance(0.5) ? "On Leave" : "Onboarding"),
    startDate: iso(startDate),
    tenureYears,
    comp: {
      baseSalary,
      bonusTarget: round(baseSalary * (0.08 + rand() * 0.17), 500),
      equityUnits: randInt(0, 8000),
      history: makeCompHistory(startDate, baseSalary),
    },
    paystubs: makePaystubs(baseSalary),
    pto: makePto(id),
    performance: {
      rating,
      potential,
      nineBox: nineBoxFor(rating, potential),
      lastReview: iso(daysAgo(randInt(60, 200))),
      reviewer: "Pending assignment",
      goals: makeGoals(params.department),
    },
    training: makeTraining(),
    documents: makeDocuments(),
  };
}

function levelForTitle(title: string): string {
  if (/Chief|VP|Officer/.test(title)) return "L7 · Executive";
  if (/Manager/.test(title)) return "L5 · Manager";
  if (/Staff|Senior|Principal/.test(title)) return "L4 · Senior";
  return `L${randInt(2, 3)} · IC`;
}

export function buildDataset(): HrDataset {
  const employees: Employee[] = [];

  // 1. Executive layer
  const ceo = buildEmployee({
    department: "Executive",
    team: "Leadership",
    title: "Chief Executive Officer",
    level: "L8 · CEO",
    managerId: null,
    salary: 480000,
    status: "Active",
  });
  employees.push(ceo);
  const cfo = buildEmployee({
    department: "Executive",
    team: "Leadership",
    title: "Chief Financial Officer",
    level: "L7 · Executive",
    managerId: ceo.id,
    salary: 360000,
    status: "Active",
  });
  employees.push(cfo);

  const roleUsers: Record<Role, string> = { admin: "", manager: "", employee: "" };

  // 2. Departments
  for (const spec of DEPT_SPECS) {
    const head = buildEmployee({
      department: spec.department,
      team: "Leadership",
      title: spec.headTitle,
      level: levelForTitle(spec.headTitle),
      managerId: ceo.id,
      salary: spec.salaryBand[1],
      status: "Active",
    });
    employees.push(head);
    if (spec.department === "Human Resources") roleUsers.admin = head.id;

    const managerIds: string[] = [];
    for (let m = 0; m < spec.managers; m += 1) {
      const mgr = buildEmployee({
        department: spec.department,
        team: pick(spec.teams),
        title: spec.managerTitle,
        level: "L5 · Manager",
        managerId: head.id,
        salary: round((spec.salaryBand[0] + spec.salaryBand[1]) / 2 + 15000, 500),
        status: "Active",
      });
      employees.push(mgr);
      managerIds.push(mgr.id);
      if (spec.department === "Engineering" && !roleUsers.manager) roleUsers.manager = mgr.id;
    }

    for (let i = 0; i < spec.ics; i += 1) {
      const title = pick(spec.icTitles);
      const mgrId = managerIds[i % managerIds.length];
      const ic = buildEmployee({
        department: spec.department,
        team: pick(spec.teams),
        title,
        level: levelForTitle(title),
        managerId: mgrId,
        salary: randInt(spec.salaryBand[0], spec.salaryBand[1] - 20000),
      });
      employees.push(ic);
      // First engineering IC reporting to our chosen manager becomes the demo employee.
      if (spec.department === "Engineering" && !roleUsers.employee && mgrId === roleUsers.manager) {
        roleUsers.employee = ic.id;
        ic.status = "Active";
      }
    }
  }

  // Backfill reviewer names from managers.
  const byId = new Map(employees.map((e) => [e.id, e]));
  for (const e of employees) {
    const mgr = e.managerId ? byId.get(e.managerId) : null;
    e.performance.reviewer = mgr ? mgr.name : "Board of Directors";
  }

  // Fallbacks in case wiring above missed (keeps types honest).
  if (!roleUsers.admin) roleUsers.admin = employees.find((e) => e.department === "Human Resources")?.id ?? ceo.id;
  if (!roleUsers.manager) roleUsers.manager = employees.find((e) => /Manager/.test(e.title))?.id ?? ceo.id;
  if (!roleUsers.employee)
    roleUsers.employee = employees.find((e) => e.level.includes("IC"))?.id ?? employees[employees.length - 1].id;

  return {
    employees,
    candidates: buildCandidates(),
    payrollRuns: buildPayrollRuns(employees),
    expenses: buildExpenses(employees),
    timesheets: buildTimesheets(employees),
    auditLogs: buildAuditLogs(employees),
    holidays: [
      { date: "2026-09-07", name: "Labor Day" },
      { date: "2026-11-26", name: "Thanksgiving" },
      { date: "2026-11-27", name: "Day after Thanksgiving" },
      { date: "2026-12-25", name: "Christmas Day" },
      { date: "2027-01-01", name: "New Year's Day" },
    ],
    roleUsers,
  };
}

// ------------------------------ ATS ----------------------------------------
function buildCandidates(): Candidate[] {
  const roles: { role: string; dept: Department }[] = [
    { role: "Senior Backend Developer", dept: "Engineering" },
    { role: "Staff Frontend Engineer", dept: "Engineering" },
    { role: "Enterprise Account Executive", dept: "Sales" },
    { role: "Product Marketing Manager", dept: "Marketing" },
    { role: "Technical Recruiter", dept: "Human Resources" },
    { role: "Site Reliability Engineer", dept: "Engineering" },
  ];
  const stages: CandidateStage[] = ["Applied", "Screening", "Interview", "Offer", "Hired"];
  const sources = ["LinkedIn", "Referral", "Careers Page", "Recruiter", "Hackathon"];
  const skillPool: Record<Department, string[]> = {
    Engineering: ["TypeScript", "Go", "Kubernetes", "PostgreSQL", "React", "AWS", "gRPC", "Terraform", "Python", "Distributed Systems"],
    Sales: ["Enterprise Sales", "SaaS", "Negotiation", "Salesforce", "Pipeline Mgmt", "Forecasting", "MEDDIC"],
    Marketing: ["Positioning", "SEO", "Content", "Analytics", "Brand", "Demand Gen", "Figma"],
    "Human Resources": ["Sourcing", "ATS", "Employer Branding", "Interviewing", "HRIS", "Compliance"],
    Executive: ["Leadership", "Strategy", "P&L", "Operations"],
  };
  const focuses = ["System Design", "Coding", "Behavioral", "Culture Fit", "Domain Expertise", "Leadership"];
  const noteBank = [
    "Strong communicator, clear ownership of past projects.",
    "Solid fundamentals; probe deeper on scale in next round.",
    "Great culture add, collaborative and humble.",
    "Impressive depth, moved fast through the exercise.",
    "Some gaps in recent stack; coachable and eager.",
    "Excellent stakeholder management examples.",
  ];
  const candidates: Candidate[] = [];
  for (let i = 0; i < 22; i += 1) {
    const r = pick(roles);
    const first = pick(FIRST);
    const last = pick(LAST);
    const pool = skillPool[r.dept];
    const skills = Array.from(new Set(Array.from({ length: randInt(4, 6) }, () => pick(pool))));
    const nScores = randInt(1, 4);
    const scorecards: Scorecard[] = Array.from({ length: nScores }, () => ({
      interviewer: `${pick(FIRST)} ${pick(LAST)[0]}.`,
      focus: pick(focuses),
      rating: randInt(3, 5),
      note: pick(noteBank),
    }));
    candidates.push({
      id: `CAND-${String(i + 1).padStart(3, "0")}`,
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      role: r.role,
      department: r.dept,
      stage: pick(stages),
      matchScore: randInt(58, 97),
      appliedDate: iso(daysAgo(randInt(2, 60))),
      source: pick(sources),
      yearsExp: randInt(2, 14),
      location: pick(CITIES),
      compliance: chance(0.7) ? "Cleared" : chance(0.5) ? "Pending" : "Flagged",
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@email.com`,
      phone: `+1 (${randInt(200, 989)}) 555-${String(randInt(100, 9999)).padStart(4, "0")}`,
      expectedSalary: round(randInt(95000, 240000), 1000),
      summary: `Experienced ${r.dept.toLowerCase()} professional, most recently focused on ${skills[0]} and ${skills[1] ?? "delivery"}. Seeking a ${r.role} position with high ownership and impact.`,
      skills,
      scorecards,
    });
  }
  return candidates;
}

// -------------------------- Timesheets -------------------------------------
function buildTimesheets(employees: Employee[]): Timesheet[] {
  const weeks = ["2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27"];
  const sheets: Timesheet[] = [];
  // Roughly the first ~26 active employees submit timesheets across recent weeks.
  const submitters = employees.filter((e) => e.status === "Active").slice(0, 26);
  let n = 0;
  for (const e of submitters) {
    for (let w = 0; w < weeks.length; w += 1) {
      // Skip some weeks to make the approval queue realistic.
      if (w < weeks.length - 1 && chance(0.35)) continue;
      const regular = 38 + randInt(0, 4);
      const overtime = chance(0.4) ? randInt(1, 8) : 0;
      const pto = chance(0.2) ? randInt(4, 8) : 0;
      const isCurrent = w === weeks.length - 1;
      sheets.push({
        id: `TS-${String(++n).padStart(4, "0")}`,
        employeeId: e.id,
        employeeName: e.name,
        initials: e.initials,
        department: e.department,
        weekOf: weeks[w],
        regular,
        overtime,
        pto,
        total: regular + overtime + pto,
        status: isCurrent ? (chance(0.6) ? "Pending" : "Approved") : chance(0.85) ? "Approved" : chance(0.5) ? "Pending" : "Rejected",
        submittedDate: iso(daysAgo(randInt(1, 20))),
      });
    }
  }
  return sheets;
}

// ---------------------------- Payroll --------------------------------------
function buildPayrollRuns(employees: Employee[]): PayrollRun[] {
  const headcount = employees.filter((e) => e.status !== "Terminated").length;
  const monthlyGross = employees.reduce((s, e) => s + e.comp.baseSalary / 12, 0);
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const runs: PayrollRun[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const payDate = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
    const grossTotal = round(monthlyGross * (0.97 + rand() * 0.06), 1);
    const taxTotal = round(grossTotal * 0.286, 1);
    runs.push({
      id: `RUN-${payDate.getFullYear()}${String(payDate.getMonth() + 1).padStart(2, "0")}`,
      period: `${months[11 - i]} ${payDate.getFullYear()}`,
      payDate: iso(payDate),
      headcount,
      grossTotal,
      taxTotal,
      netTotal: round(grossTotal - taxTotal, 1),
      status: i === 0 ? "Pending" : "Processed",
    });
  }
  return runs.reverse();
}

function buildExpenses(employees: Employee[]): Expense[] {
  const categories = ["Travel", "Meals", "Software", "Equipment", "Conference", "Client Entertainment"];
  const expenses: Expense[] = [];
  for (let i = 0; i < 24; i += 1) {
    const e = pick(employees);
    expenses.push({
      id: `EXP-${String(i + 1).padStart(4, "0")}`,
      employeeId: e.id,
      employeeName: e.name,
      category: pick(categories),
      amount: round(randInt(40, 3200) + rand(), 0.01),
      date: iso(daysAgo(randInt(1, 90))),
      status: chance(0.6) ? "Approved" : chance(0.5) ? "Pending" : "Rejected",
    });
  }
  return expenses;
}

// --------------------------- Compliance ------------------------------------
function buildAuditLogs(employees: Employee[]): AuditLog[] {
  const systems: AuditSystem[] = ["Azure SQL", "Azure AI Search", "Microsoft Graph", "MCP Gateway", "Auth / RBAC"];
  const actions = [
    "Viewed employee record",
    "Exported payroll report",
    "Updated compensation",
    "Queried PTO balance",
    "Accessed performance review",
    "RAG policy retrieval",
    "Sent approval email",
    "Attempted salary export",
    "Verified RBAC clearance",
    "Downloaded document",
  ];
  const actors = [
    { name: "Jordan Rivera", role: "HR Administrator" },
    { name: "System Agent", role: "AI Copilot" },
    { name: "Marcus Lee", role: "Manager" },
    { name: "Grace Okafor", role: "Recruiter" },
  ];
  const logs: AuditLog[] = [];
  for (let i = 0; i < 46; i += 1) {
    const actor = pick(actors);
    const target = pick(employees);
    const denied = chance(0.12);
    const warning = !denied && chance(0.1);
    const d = daysAgo(randInt(0, 21));
    d.setHours(randInt(6, 20), randInt(0, 59), randInt(0, 59));
    logs.push({
      id: `LOG-${String(i + 1).padStart(4, "0")}`,
      timestamp: d.toISOString().slice(0, 19).replace("T", " "),
      actor: actor.name,
      actorRole: actor.role,
      action: denied ? "Attempted salary export" : pick(actions),
      system: pick(systems),
      resource: `employee:${target.employeeId}`,
      ip: `10.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`,
      status: denied ? "denied" : warning ? "warning" : "success",
    });
  }
  return logs.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}
