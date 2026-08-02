// ---------------------------------------------------------------------------
// RBAC-aware mock Copilot engine.
//
// Streams an agentic reasoning trace where the FIRST step is always a security
// check — the assistant verifies clearance before querying any system and masks
// or denies results per the caller's role. This mirrors a production agent that
// wraps Azure OpenAI tool-calling with row/column-level authorization.
// ---------------------------------------------------------------------------

import type { Employee, Role } from "./types";
import { ROLE_META, reportsOf } from "./rbac";
import { formatCurrency } from "./format";

export type StepSystem = "rbac" | "sql" | "search" | "graph" | "mask" | "synth" | "guardrail";
export type StepStatus = "running" | "done" | "denied";

export interface ReasoningStep {
  id: string;
  label: string;
  system: StepSystem;
  status: StepStatus;
}

export type ModuleId =
  | "dashboard"
  | "core-hr"
  | "payroll"
  | "time"
  | "ats"
  | "performance"
  | "compliance";

export interface CopilotAction {
  module: ModuleId;
}

export interface FollowUp {
  id: string;
  label: string;
  prompt: string;
}

export interface CopilotTurn {
  response: string;
  steps: ReasoningStep[];
  systems: StepSystem[];
  followUps: FollowUp[];
  action?: CopilotAction;
  denied?: boolean;
  blocked?: boolean;
}

export interface CopilotContext {
  role: Role;
  currentUser: Employee;
  employees: Employee[];
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Trace {
  steps: ReasoningStep[] = [];
  private n = 0;
  constructor(private onStep?: (s: ReasoningStep[]) => void) {}
  private emit() {
    this.onStep?.(this.steps.map((s) => ({ ...s })));
  }
  async run(label: string, system: StepSystem, ms = 550, final: StepStatus = "done") {
    const id = `s${this.n++}`;
    this.steps.push({ id, label, system, status: "running" });
    this.emit();
    await wait(ms);
    this.steps[this.steps.length - 1].status = final;
    this.emit();
  }
}

const OFF_TOPIC = ["quadratic", "equation", "weather", "recipe", "poem", "capital of", "movie", "football", "translate"];

function fu(label: string, prompt: string): FollowUp {
  return { id: `fu-${label.replace(/\W+/g, "-").toLowerCase()}`, label, prompt };
}

export async function runCopilot(
  query: string,
  ctx: CopilotContext,
  opts: { onStep?: (s: ReasoningStep[]) => void } = {}
): Promise<CopilotTurn> {
  const t = new Trace(opts.onStep);
  const text = query.toLowerCase();
  const { role, currentUser, employees } = ctx;

  // Always verify clearance first.
  await t.run("Verifying RBAC clearance…", "rbac", 600);

  // Guardrail
  if (OFF_TOPIC.some((w) => text.includes(w)) || /\d\s*x\s*\^?\s*2/.test(text)) {
    await t.run("Topic guardrail triggered", "guardrail", 650, "denied");
    return {
      response:
        "That request is outside the HR domain, so I've blocked it. I can help with people data, payroll, time off, hiring, performance, and compliance.",
      steps: t.steps,
      systems: ["guardrail"],
      followUps: [fu("My PTO balance", "How much PTO do I have left?"), fu("My paystubs", "Show my recent paystubs")],
      blocked: true,
    };
  }

  // Payroll / compensation
  if (/(pay|payroll|salary|paystub|paycheck|compensation|comp)/.test(text)) {
    const asksOther = /(everyone|company|all employees|team's|their salary|others)/.test(text);
    if (role === "employee" && asksOther) {
      await t.run("Authorization denied for company payroll", "rbac", 600, "denied");
      return deniedTurn(t.steps, role);
    }
    await t.run("Querying Payroll DB…", "sql", 700);
    if (role !== "admin") await t.run("Applying column-level data mask…", "mask", 550);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    const latest = currentUser.paystubs[currentUser.paystubs.length - 1];
    const scope =
      role === "admin"
        ? "You have full payroll access."
        : role === "manager"
          ? "You can see your own and your team's compensation; company-wide figures are masked."
          : "You can see only your own payroll data.";
    return {
      response: `Your latest net pay was **${formatCurrency(latest.net)}** for ${latest.period}. ${scope} I've opened the Payroll & Compensation module.`,
      steps: t.steps,
      systems: role === "admin" ? ["sql"] : ["sql", "mask"],
      followUps: [fu("Tax breakdown", "Break down my tax deductions"), fu("Comp history", "Show my compensation history")],
      action: { module: "payroll" },
    };
  }

  // Time off / PTO
  if (/(pto|leave|vacation|sick|time off|day off|holiday|timesheet)/.test(text)) {
    await t.run("Querying Time & Attendance DB…", "sql", 700);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    const p = currentUser.pto;
    return {
      response: `You have **${p.vacationTotal - p.vacationUsed} vacation** and **${p.sickTotal - p.sickUsed} sick** days remaining. Per policy, leave beyond 10 consecutive business days needs manager approval. Opening Time & Attendance.`,
      steps: t.steps,
      systems: ["sql", "search"],
      followUps: [fu("Request time off", "I want to request vacation next month"), fu("Company calendar", "Who is out this week?")],
      action: { module: "time" },
    };
  }

  // Performance / goals
  if (/(performance|goal|okr|review|rating|9-box|nine box|potential)/.test(text)) {
    await t.run("Querying Performance DB…", "sql", 650);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    const g = currentUser.performance;
    return {
      response: `Your current review rating is **${g.rating}/5** with **${g.potential.toLowerCase()} potential**, and you have ${g.goals.length} active goals. ${role !== "employee" ? "I've loaded the team 9-box grid." : "Opening your goals."}`,
      steps: t.steps,
      systems: ["sql"],
      followUps: [fu("My goals", "How are my goals tracking?"), ...(role !== "employee" ? [fu("Team 9-box", "Show the team performance matrix")] : [])],
      action: { module: "performance" },
    };
  }

  // Hiring / ATS
  if (/(candidate|resume|hiring|pipeline|recruit|interview|ats|applicant)/.test(text)) {
    if (role === "employee") {
      await t.run("Authorization denied for recruiting data", "rbac", 600, "denied");
      return deniedTurn(t.steps, role);
    }
    await t.run("Querying Applicant Tracking System…", "sql", 700);
    await t.run("Ranking candidates (MCP tool)…", "search", 650);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    return {
      response: "Your active pipeline has candidates across Applied → Offer, ranked by AI match score with compliance flags surfaced. Opening the Talent Acquisition board.",
      steps: t.steps,
      systems: ["sql", "search"],
      followUps: [fu("Top matches", "Who are the strongest backend candidates?"), fu("Compliance flags", "Which candidates are flagged?")],
      action: { module: "ats" },
    };
  }

  // Compliance / audit
  if (/(audit|compliance|security|access log|who accessed)/.test(text)) {
    if (role !== "admin") {
      await t.run("Authorization denied — compliance is admin-only", "rbac", 600, "denied");
      return deniedTurn(t.steps, role);
    }
    await t.run("Querying immutable audit trail…", "sql", 700);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    return {
      response: "Loaded the audit log — every data access is recorded with actor, RBAC tier, system, and outcome, including any denied attempts. Opening Compliance & Security.",
      steps: t.steps,
      systems: ["sql"],
      followUps: [fu("Denied access", "Show any denied access attempts"), fu("Recent exports", "Who exported payroll recently?")],
      action: { module: "compliance" },
    };
  }

  // People / directory / headcount
  if (/(who|find|employee|directory|headcount|team|department|report|org)/.test(text)) {
    await t.run("Querying Core HR (Employee DB)…", "sql", 700);
    const visibleCount =
      role === "admin" ? employees.length : role === "manager" ? reportsOf(currentUser.id, employees).size + 1 : 1;
    if (role !== "admin") await t.run("Applying row-level scope filter…", "mask", 550);
    await t.run("Synthesizing guardrailed response…", "synth", 500);
    return {
      response: `Based on your ${ROLE_META[role].label} clearance you can view **${visibleCount}** employee record${visibleCount === 1 ? "" : "s"} (${ROLE_META[role].scope}). Opening the Employee Database.`,
      steps: t.steps,
      systems: role === "admin" ? ["sql"] : ["sql", "mask"],
      followUps: [fu("Engineering team", "Show the engineering department"), fu("My reports", "Who reports to me?")],
      action: { module: "core-hr" },
    };
  }

  // Fallback
  await t.run("Synthesizing guardrailed response…", "synth", 450);
  return {
    response: `I'm your RBAC-aware HR copilot, currently acting for a **${ROLE_META[role].label}** (${ROLE_META[role].tier}). I can query people, payroll, time off, hiring, performance, and compliance — always checking clearance first. What would you like to do?`,
    steps: t.steps,
    systems: ["synth"],
    followUps: [
      fu("My PTO balance", "How much PTO do I have left?"),
      fu("Company headcount", "How many people work here?"),
      fu("Try a blocked query", "Can you solve 3x^2 + 5x - 2 = 0?"),
    ],
  };
}

function deniedTurn(steps: ReasoningStep[], role: Role): CopilotTurn {
  return {
    response: `Access denied. Your current role (**${ROLE_META[role].label}**, ${ROLE_META[role].tier}) is not cleared for that data. This attempt has been recorded in the audit log. Try a request scoped to ${ROLE_META[role].scope.toLowerCase()}.`,
    steps,
    systems: ["rbac"],
    followUps: [fu("My PTO balance", "How much PTO do I have left?"), fu("My paystubs", "Show my recent paystubs")],
    denied: true,
  };
}

export const SUGGESTED_PROMPTS = [
  "How much PTO do I have left?",
  "Show my recent paystubs",
  "How many people work here?",
  "Show the candidate pipeline",
];
