// ---------------------------------------------------------------------------
// Mock agentic Copilot engine.
//
// This simulates the multi-tool orchestration that will eventually be powered
// by Azure OpenAI (function/tool calling) + Azure AI Search (RAG). The shape is
// intentionally close to how a real agent loop works so it can be swapped out
// with minimal changes to the UI:
//
//   1. Detect intent from the user's message  (-> Azure OpenAI router / planner)
//   2. Select one or more TOOLS to satisfy it (-> function calling)
//   3. Execute each tool                       (-> calls into services/api.js
//                                                  or Azure AI Search)
//   4. Synthesize a final natural-language answer from the tool outputs
//
// The engine streams a "trace" of steps back to the UI via an `onStep` callback
// so we can visually demonstrate the routing + tool-calling to stakeholders.
//
// To make this real:
//   - Replace `detectIntents` with an Azure OpenAI call that returns tool calls.
//   - Replace each tool's `run()` with a fetch to your backend / Azure AI Search.
//   - Replace `synthesize` with the model's final completion.
// ---------------------------------------------------------------------------

import {
  leaveBalances,
  benefits,
  paystubs,
  nextPayday,
  trainingCourses,
  employees,
  policyDocuments,
  currentUser,
} from "../data/mockData.js";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Tool registry — mirrors an Azure OpenAI `tools` array. Each tool has a name,
// a human label + icon key for the trace UI, and a mock `run()` implementation.
// ---------------------------------------------------------------------------
export const TOOLS = {
  leave_database: {
    name: "leave_database",
    label: "Querying Leave Database",
    icon: "database",
    async run() {
      await wait(650);
      return leaveBalances.map((b) => ({
        type: b.type,
        remaining: b.total - b.used,
        total: b.total,
      }));
    },
  },
  policy_search: {
    name: "policy_search",
    label: "Searching HR Policy Documents",
    icon: "search",
    async run({ topic } = {}) {
      await wait(750);
      const matches = policyDocuments.filter(
        (doc) => !topic || doc.topic.includes(topic) || topic.includes(doc.topic)
      );
      return matches.length ? matches : policyDocuments.slice(0, 1);
    },
  },
  benefits_lookup: {
    name: "benefits_lookup",
    label: "Retrieving Benefits Records",
    icon: "shield",
    async run() {
      await wait(600);
      return benefits;
    },
  },
  payroll_service: {
    name: "payroll_service",
    label: "Calling Payroll Service",
    icon: "wallet",
    async run() {
      await wait(600);
      return { latest: paystubs[0], nextPayday };
    },
  },
  training_catalog: {
    name: "training_catalog",
    label: "Checking Training Catalog",
    icon: "graduation",
    async run() {
      await wait(600);
      return trainingCourses;
    },
  },
  directory_search: {
    name: "directory_search",
    label: "Searching Employee Directory",
    icon: "users",
    async run({ query } = {}) {
      await wait(550);
      if (!query) return employees.slice(0, 3);
      const q = query.toLowerCase();
      return employees.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      );
    },
  },
};

// ---------------------------------------------------------------------------
// Intent detection / planner (mock). Returns an ordered plan describing which
// tools to call and why. A real implementation would ask Azure OpenAI to emit
// tool calls given the message + tool schemas.
// ---------------------------------------------------------------------------
function detectIntents(message) {
  const text = message.toLowerCase();
  const has = (...words) => words.some((w) => text.includes(w));

  const plan = [];
  const wantsPolicy = has("policy", "policies", "handbook", "rule", "allowed", "entitled");

  // Leave / time off
  if (has("sick", "leave", "vacation", "time off", "pto", "day off", "days off", "holiday")) {
    let topic = "vacation";
    if (has("sick")) topic = "sick leave";
    plan.push({ tool: "leave_database", args: {} });
    plan.push({ tool: "policy_search", args: { topic } });
  }

  // Benefits
  if (has("benefit", "health", "dental", "vision", "insurance", "coverage", "copay")) {
    plan.push({ tool: "benefits_lookup", args: {} });
    if (wantsPolicy) plan.push({ tool: "policy_search", args: { topic: "benefits" } });
  }

  // Payroll
  if (has("pay", "payroll", "paystub", "paycheck", "salary", "deposit", "payday", "tax")) {
    plan.push({ tool: "payroll_service", args: {} });
    if (wantsPolicy) plan.push({ tool: "policy_search", args: { topic: "payroll" } });
  }

  // Training / career
  if (has("training", "course", "learn", "certification", "compliance", "career", "growth", "skill")) {
    plan.push({ tool: "training_catalog", args: {} });
  }

  // Directory
  if (has("who", "find", "directory", "contact", "email", "manager", "report", "team", "department")) {
    const query = extractDirectoryQuery(text);
    plan.push({ tool: "directory_search", args: { query } });
  }

  return dedupePlan(plan);
}

function extractDirectoryQuery(text) {
  const depts = ["engineering", "design", "product", "finance", "human resources", "hr"];
  const found = depts.find((d) => text.includes(d));
  if (found) return found === "hr" ? "human resources" : found;
  return "";
}

function dedupePlan(plan) {
  const seen = new Set();
  return plan.filter((step) => {
    const key = `${step.tool}:${JSON.stringify(step.args)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Answer synthesis (mock). Turns raw tool outputs into a friendly reply. A real
// implementation feeds tool results back to Azure OpenAI for the final message.
// ---------------------------------------------------------------------------
function synthesize(message, results) {
  const parts = [];
  const text = message.toLowerCase();

  const leave = results.find((r) => r.tool === "leave_database");
  const policy = results.filter((r) => r.tool === "policy_search");
  const benefitsRes = results.find((r) => r.tool === "benefits_lookup");
  const payroll = results.find((r) => r.tool === "payroll_service");
  const training = results.find((r) => r.tool === "training_catalog");
  const directory = results.find((r) => r.tool === "directory_search");

  if (leave) {
    const focus = text.includes("sick")
      ? leave.output.find((b) => b.type === "Sick")
      : text.includes("personal")
        ? leave.output.find((b) => b.type === "Personal")
        : leave.output.find((b) => b.type === "Vacation");
    if (focus) {
      parts.push(
        `You have **${focus.remaining} ${focus.type.toLowerCase()} day${focus.remaining === 1 ? "" : "s"}** remaining out of ${focus.total}.`
      );
    }
  }

  if (payroll) {
    parts.push(
      `Your most recent net pay was **$${payroll.output.latest.net.toLocaleString()}** for ${payroll.output.latest.period}. Your next payday is **${formatDate(payroll.output.nextPayday.date)}** (est. $${payroll.output.nextPayday.amount.toLocaleString()}).`
    );
  }

  if (benefitsRes) {
    const b = benefitsRes.output;
    parts.push(
      `Your health plan is **${b.health.plan}** (${b.health.provider}) and your dental plan is **${b.dental.plan}**. A primary care visit is a ${b.health.coverage[0].value}.`
    );
  }

  if (training) {
    const pending = training.output.filter((c) => c.status !== "Completed");
    parts.push(
      pending.length
        ? `You have **${pending.length} outstanding course${pending.length === 1 ? "" : "s"}**, including "${pending[0].title}" (due ${formatDate(pending[0].dueDate)}).`
        : `You're all caught up — no outstanding training. Nice work!`
    );
  }

  if (directory) {
    const people = directory.output.slice(0, 3);
    if (people.length) {
      parts.push(
        `I found ${directory.output.length} matching ${directory.output.length === 1 ? "person" : "people"}: ${people
          .map((p) => `${p.name} (${p.title})`)
          .join(", ")}.`
      );
    } else {
      parts.push(`I couldn't find anyone matching that in the directory.`);
    }
  }

  // Fold in any retrieved policy snippets (RAG citations).
  policy.forEach((p) => {
    const doc = p.output[0];
    if (doc) parts.push(`According to the handbook: *${doc.snippet}*`);
  });

  if (!parts.length) {
    return {
      text: `Hi ${currentUser.name.split(" ")[0]}! I'm your HR Copilot. I can help with **leave**, **benefits**, **payroll**, **training**, and finding people in the **directory**. Try asking: "How many sick days do I have and what is the policy?"`,
      citations: [],
    };
  }

  const citations = policy.flatMap((p) => p.output.map((d) => d.title));
  return { text: parts.join("\n\n"), citations: [...new Set(citations)] };
}

function formatDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Public entry point. Runs one Copilot turn, streaming trace steps to `onStep`.
//
//   const { answer, trace } = await runCopilotTurn(message, {
//     onStep: (step) => setTrace((t) => upsert(t, step)),
//   });
//
// Step shape: { id, kind: 'route'|'tool'|'synthesize', label, status, icon }
// ---------------------------------------------------------------------------
export async function runCopilotTurn(message, { onStep } = {}) {
  const trace = [];
  let stepCounter = 0;

  const emit = (step) => {
    const existingIndex = trace.findIndex((s) => s.id === step.id);
    if (existingIndex >= 0) {
      trace[existingIndex] = { ...trace[existingIndex], ...step };
    } else {
      trace.push(step);
    }
    onStep?.([...trace]);
  };

  const newStep = (partial) => {
    const id = `step-${stepCounter++}`;
    emit({ id, status: "running", ...partial });
    return id;
  };

  // 1. Route intent
  const routeId = newStep({ kind: "route", label: "Routing intent", icon: "brain" });
  await wait(700);
  const plan = detectIntents(message);
  emit({ id: routeId, status: "done" });

  // 2. + 3. Execute planned tools sequentially (visible tool calls)
  const results = [];
  for (const step of plan) {
    const tool = TOOLS[step.tool];
    if (!tool) continue;
    const id = newStep({ kind: "tool", label: tool.label, icon: tool.icon });
    const output = await tool.run(step.args);
    results.push({ tool: step.tool, output });
    emit({ id, status: "done" });
  }

  // 4. Synthesize final answer
  const synthId = newStep({ kind: "synthesize", label: "Synthesizing response", icon: "sparkles" });
  await wait(600);
  const answer = synthesize(message, results);
  emit({ id: synthId, status: "done" });

  return { answer, trace };
}

// Prompt chips surfaced in the empty chat state to guide the demo.
export const SUGGESTED_PROMPTS = [
  "How many sick days do I have and what is the policy?",
  "When is my next payday?",
  "Summarize my health and dental benefits",
  "What training do I still need to complete?",
  "Who works in the Engineering department?",
];
