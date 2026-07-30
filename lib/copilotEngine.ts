// ---------------------------------------------------------------------------
// Mock agentic Copilot engine.
//
// Simulates an enterprise perception-action loop that will later be powered by
// Azure OpenAI (planner + tool calling), Azure SQL (system of record), Azure AI
// Search (RAG), and Microsoft Graph (email). The engine streams a reasoning
// trace to the UI via `onStep`, then returns a full AgentTurn describing the
// response, citations, follow-up chips, backend systems touched, and any canvas
// side-effect (e.g. focus an employee, open the resume screener).
//
// To make this real:
//   - Replace `plan()` with an Azure OpenAI tool-calling request.
//   - Replace each step body with a fetch to your FastAPI/Azure backend.
//   - Keep the AgentTurn shape and the UI stays identical.
// ---------------------------------------------------------------------------

import { EMPLOYEES, POLICY_DOCS } from "./mockData";
import type {
  AgentTurn,
  BackendSystem,
  Citation,
  FollowUp,
  ReasoningStep,
  StepSystem,
} from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RunOptions {
  onStep?: (steps: ReasoningStep[]) => void;
}

// Small emitter that lets scenarios push steps and flip their status while the
// UI receives an immutable snapshot after every mutation.
class Trace {
  steps: ReasoningStep[] = [];
  private counter = 0;
  constructor(private onStep?: (steps: ReasoningStep[]) => void) {}

  private emit() {
    this.onStep?.(this.steps.map((s) => ({ ...s })));
  }

  async run(
    partial: Omit<ReasoningStep, "id" | "status">,
    ms = 650,
    finalStatus: ReasoningStep["status"] = "done"
  ) {
    const id = `step-${this.counter++}`;
    this.steps.push({ id, status: "running", ...partial });
    this.emit();
    await wait(ms);
    const target = this.steps.find((s) => s.id === id)!;
    target.status = finalStatus;
    this.emit();
  }
}

const SYSTEM_BADGE: Partial<Record<StepSystem, BackendSystem>> = {
  sql: "Azure SQL",
  search: "Azure AI Search",
  graph: "Microsoft Graph API",
  mcp: "MCP Tool",
  guardrail: "Guardrail Engine",
};

function findEmployeeByName(text: string) {
  const t = text.toLowerCase();
  return EMPLOYEES.find((e) => {
    const [first] = e.name.toLowerCase().split(" ");
    return t.includes(e.name.toLowerCase()) || (first.length > 3 && t.includes(first));
  });
}

const OFF_TOPIC = [
  "quadratic",
  "equation",
  "solve",
  "formula",
  "x^2",
  "integral",
  "derivative",
  "weather",
  "recipe",
  "poem",
  "capital of",
  "translate",
  "stock price",
  "movie",
  "football",
];

const HR_KEYWORDS = [
  "pto",
  "leave",
  "vacation",
  "sick",
  "policy",
  "benefit",
  "payroll",
  "pay",
  "salary",
  "employee",
  "resume",
  "candidate",
  "onboard",
  "hire",
  "headcount",
  "department",
  "email",
  "holiday",
  "directory",
  "audit",
];

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export async function runAgentTurn(query: string, opts: RunOptions = {}): Promise<AgentTurn> {
  const trace = new Trace(opts.onStep);
  const text = query.toLowerCase();

  await trace.run({ label: "Understanding user intent", system: "intent" }, 600);

  // --- Scenario C: Off-topic guardrail -------------------------------------
  const isOffTopic =
    OFF_TOPIC.some((w) => text.includes(w)) ||
    (/[0-9]\s*x\s*\^?\s*2/.test(text) && !HR_KEYWORDS.some((w) => text.includes(w)));

  if (isOffTopic) {
    await trace.run(
      {
        label: "Security Gate: Topic Guardrail Triggered",
        system: "guardrail",
        badge: "Guardrail Engine",
        detail: "Query outside approved HR domain",
      },
      800,
      "blocked"
    );
    return {
      response:
        "Query blocked by Security Guardrails. The HR Copilot is restricted to workforce, policy, and HR administrative tasks. Please ask about employees, PTO, payroll, benefits, hiring, or policy.",
      steps: trace.steps,
      citations: [],
      followUps: [
        chip("View PTO policy", "prompt", "What is our consecutive leave policy?"),
        chip("Open Employee Directory", "action", "directory"),
      ],
      systems: ["Guardrail Engine"],
      blocked: true,
    };
  }

  // --- Scenario B: Resume screening ----------------------------------------
  if (
    (text.includes("resume") || text.includes("candidate") || text.includes("screen")) &&
    (text.includes("backend") || text.includes("screen") || text.includes("developer") || text.includes("candidate"))
  ) {
    await trace.run({ label: "Retrieving uploaded resumes (4 documents)", system: "search", badge: SYSTEM_BADGE.search }, 700);
    await trace.run({ label: "Executing MCP Tool: rank_candidates(role='Senior Backend Developer')", system: "mcp", badge: SYSTEM_BADGE.mcp }, 800);
    await trace.run({ label: "Running compliance & background scan", system: "guardrail", badge: SYSTEM_BADGE.guardrail }, 700);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 600);

    return {
      response:
        "I screened **4 candidates** for the Senior Backend Developer role. **Elena Volkov (94%)** is the strongest match — deep distributed-systems and Azure experience, compliance cleared. Raj Patel (88%) is a strong runner-up. I flagged **Ahmed Hassan** for an employment-gap compliance review. The full ranked comparison is open on the canvas.",
      steps: trace.steps,
      citations: [],
      followUps: [
        chip("Draft interview invite", "action", "email"),
        chip("Compare top 2 candidates", "prompt", "Compare Elena Volkov and Raj Patel side by side"),
        chip("View flagged candidate", "prompt", "Why was Ahmed Hassan flagged?"),
      ],
      systems: ["Azure AI Search", "MCP Tool", "Guardrail Engine"],
      canvasAction: { view: "resume-screener" },
    };
  }

  // --- Scenario A + general employee PTO / policy RAG ----------------------
  const employee = findEmployeeByName(text);
  const asksPolicy =
    text.includes("policy") || text.includes("consecutive") || text.includes("handbook") || text.includes("allowed");

  if (employee && (text.includes("pto") || text.includes("leave") || text.includes("vacation") || text.includes("time off") || asksPolicy)) {
    await trace.run(
      { label: `Executing SQL Tool: get_pto_balance(emp_id=${employee.id})`, system: "sql", badge: SYSTEM_BADGE.sql },
      750
    );

    const citations: Citation[] = [];
    const systems: BackendSystem[] = ["Azure SQL"];

    if (asksPolicy) {
      await trace.run(
        { label: "Querying Azure AI Search: RAG Policy Handbook (PTO_2026.pdf)", system: "search", badge: SYSTEM_BADGE.search },
        800
      );
      const doc = POLICY_DOCS.find((d) => d.topic === "pto")!;
      citations.push({ title: doc.title, filename: doc.filename, section: doc.section });
      systems.push("Azure AI Search");
    }

    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 600);

    const policyLine = asksPolicy
      ? ` On consecutive leave: employees may take **up to 10 consecutive business days** without extra approval; anything beyond that needs written manager approval and 3 weeks' notice.`
      : "";

    return {
      response:
        `**${employee.name}** has **${employee.ptoRemainingHours} PTO hours** remaining (${(employee.ptoRemainingHours / 8).toFixed(1)} days) of ${employee.ptoAccruedHours} accrued.` +
        policyLine +
        ` Their card is now open on the canvas.`,
      steps: trace.steps,
      citations,
      followUps: [
        chip("Draft Approval Email", "action", "email"),
        chip("View Holiday Calendar", "prompt", "Show the company holiday calendar"),
        chip("Request Time Off", "prompt", `Start a time-off request for ${employee.name}`),
      ],
      systems,
      canvasAction: { view: "employee-detail", employeeId: employee.id },
    };
  }

  // --- General routing ------------------------------------------------------
  if (text.includes("payroll") || text.includes("salary") || text.includes("compensation") || text.includes("pay ")) {
    await trace.run({ label: "Executing SQL Tool: get_payroll_summary()", system: "sql", badge: SYSTEM_BADGE.sql }, 750);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
    return simpleTurn(
      "Opening **Payroll & Benefits**. Total monthly payroll cost is distributed across four compensation bands — sensitive figures are masked for anyone below RBAC Level 4.",
      trace.steps,
      ["Azure SQL"],
      { view: "payroll" },
      [chip("Show payroll distribution", "action", "dashboard"), chip("Draft comp letter", "action", "email")]
    );
  }

  if (text.includes("onboard") || text.includes("new hire") || text.includes("checklist")) {
    await trace.run({ label: "Executing SQL Tool: get_onboarding_status()", system: "sql", badge: SYSTEM_BADGE.sql }, 700);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
    return simpleTurn(
      "Opening the **Onboarding Tracker**. Liam O'Brien starts Aug 4 — 2 of 6 tasks complete, IT provisioning in progress.",
      trace.steps,
      ["Azure SQL"],
      { view: "onboarding" },
      [chip("Draft welcome email", "action", "email"), chip("Notify IT", "prompt", "Remind IT to provision Liam's laptop")]
    );
  }

  if (text.includes("policy") || text.includes("handbook") || text.includes("rag") || text.includes("knowledge")) {
    await trace.run({ label: "Querying Azure AI Search: HR Policy Knowledge Base", system: "search", badge: SYSTEM_BADGE.search }, 800);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
    const doc = POLICY_DOCS[0];
    return {
      response:
        "Opening the **Policy Knowledge Base**. I indexed 5 policy documents via Azure AI Search — you can browse citations and grounded snippets on the canvas.",
      steps: trace.steps,
      citations: [{ title: doc.title, filename: doc.filename, section: doc.section }],
      followUps: [chip("What is the sick-leave rule?", "prompt", "What is our sick leave policy?")],
      systems: ["Azure AI Search"],
      canvasAction: { view: "policy" },
    };
  }

  if (text.includes("who") || text.includes("find") || text.includes("directory") || text.includes("department") || text.includes("headcount")) {
    await trace.run({ label: "Executing SQL Tool: search_directory()", system: "sql", badge: SYSTEM_BADGE.sql }, 700);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
    return simpleTurn(
      "Opening the **Employee Directory** with the full org roster. You can filter by department or search by name and role.",
      trace.steps,
      ["Azure SQL"],
      { view: "directory" },
      [chip("Engineering headcount", "prompt", "How many people are in Engineering?")]
    );
  }

  if (text.includes("audit") || text.includes("security") || text.includes("log")) {
    await trace.run({ label: "Executing MCP Tool: fetch_audit_trail()", system: "mcp", badge: SYSTEM_BADGE.mcp }, 700);
    await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
    return simpleTurn(
      "Opening the **Security Audit Logs**. Every tool dispatch — SQL reads, RAG retrievals, blocked actions — is recorded with RBAC tier and outcome.",
      trace.steps,
      ["MCP Tool"],
      { view: "audit" },
      []
    );
  }

  // Fallback
  await trace.run({ label: "Synthesizing guardrailed response", system: "synth" }, 500);
  return simpleTurn(
    "I'm your HR Operations Copilot. I can pull employee data (Azure SQL), ground answers in policy (Azure AI Search), screen resumes, and draft emails (Microsoft Graph). Try: *\"How many PTO hours does Sarah Chen have left, and what is our policy on consecutive leave?\"*",
    trace.steps,
    [],
    undefined,
    [
      chip("How much PTO does Sarah Chen have?", "prompt", "How many PTO hours does Sarah Chen have left, and what is our policy on consecutive leave?"),
      chip("Screen backend candidates", "prompt", "Screen the incoming candidate resumes for the Senior Backend Developer position"),
    ]
  );
}

function chip(label: string, kind: FollowUp["kind"], payload: string): FollowUp {
  return { id: `fu-${label.replace(/\s+/g, "-").toLowerCase()}`, label, kind, payload };
}

function simpleTurn(
  response: string,
  steps: ReasoningStep[],
  systems: BackendSystem[],
  canvasAction: AgentTurn["canvasAction"],
  followUps: FollowUp[]
): AgentTurn {
  return { response, steps, citations: [], followUps, systems, canvasAction };
}

// Prompts surfaced in the empty console state to drive the demo scenarios.
export const SUGGESTED_PROMPTS = [
  "How many PTO hours does Sarah Chen have left, and what is our policy on consecutive leave?",
  "Screen the incoming candidate resumes for the Senior Backend Developer position",
  "Can you solve this quadratic formula: 3x^2 + 5x - 2 = 0?",
];
