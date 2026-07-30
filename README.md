# HR Copilot Workspace — Team ClosedAI

> Quadrant Internship final project

An enterprise **AI HR Operations & Command Center**. Not a chatbot clone — a 3-zone command workspace where an agentic, multi-tool copilot *operates* the workspace: retrieving employee data, grounding answers in policy (RAG), screening resumes, enforcing RBAC data masking, and drafting emails, while visually narrating every tool dispatch.

Built as a **frontend MVP**: all data and AI logic are mocked with strict TypeScript types so the state can be wired to a **FastAPI / Azure SQL** backend with zero component changes.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** — slate/indigo enterprise design system
- **Lucide React** — iconography
- **Recharts** — executive dashboard visualizations
- **Framer Motion** — agent reasoning + drawer/modal animations

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (also type-checks)
npm run start    # serve the production build
```

## The 3-zone workspace

```
┌──────────────────────── Security & RBAC Bar ────────────────────────┐
│ Authenticated: HR Administrator | RBAC Level 4 | Encryption Active   │
├───────────┬─────────────────────────────────────┬───────────────────┤
│  Sidebar  │      Dynamic Action Canvas          │  Copilot Console  │
│  (nav)    │  (dashboard / directory / payroll / │  (agent hub)      │
│           │   onboarding / resumes / policy /   │                   │
│           │   audit — driven by nav *and* AI)   │                   │
└───────────┴─────────────────────────────────────┴───────────────────┘
```

1. **Left — Navigation Sidebar**: Dashboard, Employee Directory, Payroll & Benefits, Onboarding & Resumes, Policy Knowledge Base (RAG), Security Audit Logs.
2. **Center — Dynamic Action Canvas**: executive charts, employee cards, payroll register, onboarding checklist, resume screener, policy RAG browser. The canvas responds to both the sidebar **and** the AI (e.g. the agent opens Sarah Chen's card or the resume screener).
3. **Right — Copilot Console**: persistent agent with an **Agent Reasoning Stepper**, follow-up chips, file dropzone, tool badges, and Email Studio.

## Enterprise features

- **Security & RBAC bar** with a live role simulator — switch between **HR Administrator (Level 4)** and **Standard Recruiter (Level 2)** to watch payroll/PII **data masking** apply instantly across the canvas.
- **Agent Reasoning Stepper** renders the perception-action loop for every turn:
  `[✓ Understanding intent] → [🛠 SQL: get_pto_balance(1042)] → [🔍 Azure AI Search: PTO_2026.pdf] → [✓ Synthesizing guardrailed response]`.
- **Multi-tool dispatch badges**: Azure SQL · Azure AI Search · Microsoft Graph API · MCP Tool · Guardrail Engine.
- **Email Studio** modal to review/edit/securely "send" AI-drafted HR emails.
- **Security Audit Logs** recording every tool call with RBAC tier and outcome.

## Mock agentic scenarios (type these in the console)

| # | Prompt | What happens |
| --- | --- | --- |
| **A** | *"How many PTO hours does Sarah Chen have left, and what is our policy on consecutive leave?"* | SQL `get_pto_balance(1042)` + Azure AI Search `PTO_2026.pdf`; canvas opens Sarah's **employee card**, response cites policy §4.2, offers a **Draft Approval Email** chip. |
| **B** | *"Screen the incoming candidate resumes for the Senior Backend Developer position."* | Resume retrieval + MCP ranking + compliance scan; canvas opens the **Resume Screener** with match-score bars and a compliance flag. |
| **C** | *"Can you solve this quadratic formula: 3x^2 + 5x - 2 = 0?"* | **Topic guardrail** trips; a professional blocked-by-guardrails warning is shown, no tools run. |

## Architecture — built to wire into Azure later

Two isolated seams; **components never change** when the backend becomes real:

| Seam | File | Today | Production target |
| --- | --- | --- | --- |
| Data | `lib/mockData.ts` | Typed mock records | **FastAPI / Azure SQL** REST |
| Agent | `lib/copilotEngine.ts` | Intent router + mock tools streaming a reasoning trace | **Azure OpenAI** tool-calling + **Azure AI Search** (RAG) + **Microsoft Graph** |

`lib/copilotEngine.ts` returns a fully-typed `AgentTurn` (response, reasoning steps, citations, follow-up chips, backend systems, and an optional `canvasAction`). Swap the tool bodies for real calls and the UI is unchanged.

## Project structure

```
app/
  layout.tsx            # root layout + metadata
  page.tsx              # mounts WorkspaceProvider + Workspace
  globals.css           # Tailwind v4 theme (slate/indigo)
components/
  layout/               # SecurityBar, Sidebar, Canvas (router), Workspace shell
  dashboard/            # ExecutiveDashboard (Recharts), EmployeeCard
  modules/              # Directory, EmployeeDetail, PayrollBenefits, Onboarding,
                        # ResumeScreener, PolicyKnowledgeBase, SecurityAuditLogs
  copilot/              # CopilotConsole, AgentReasoningStepper, ChatMessage,
                        # FollowUpChips, FileDropzone, ToolBadge
  email/                # EmailModal (Email Studio)
  ui/                   # Card, Badge, Avatar, PageHeader
lib/
  types.ts              # all domain + agent types (strict)
  mockData.ts           # data seam  ← swap for Azure SQL / FastAPI
  copilotEngine.ts      # agent seam ← swap for Azure OpenAI + AI Search
  store.tsx             # WorkspaceProvider (RBAC, canvas nav, copilot, email)
  format.ts             # currency/date/masking helpers
```

## Notes

- No backend required to run the demo.
- Copy `.env.example` → `.env.local` when connecting real Azure services.
- Sensitive fields (salary, PII) are masked below RBAC Level 4 — try the role simulator in the top bar.
