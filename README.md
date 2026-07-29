# AI HR Copilot

> Quadrant Internship final project

A single conversational **HR Copilot** that brings Leave, Benefits, Payroll, Training, and the Directory together behind one chat interface. This repo is the **frontend MVP** — a modern React portal with a mock, agentic multi-tool Copilot. All data is mocked so the UI can be demoed today and wired to the real Azure backend later.

## Tech stack

- **React 18** + **Vite** (fast dev server & build)
- **Tailwind CSS v4** (styling)
- **Lucide React** (icons)
- **React Router** (module routing)

## Getting started

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build
npm run preview  # preview the production build
```

## What's included

**Modules** (`src/pages/`)

- **Dashboard** – quick stats (leave left, next payday, pending training) + Copilot shortcuts
- **Leave** – leave-request history table + a request-time-off form
- **Benefits** – health / dental / vision plan summaries
- **Payroll** – recent paystubs with download actions
- **Training** – filterable grid of course cards
- **Directory** – searchable employee list

**AI HR Copilot** (`src/components/copilot/` + `src/services/copilotEngine.js`)

- Collapsible chat panel + floating launcher, openable from any page
- **Mock agentic workflow** that visually demonstrates tool orchestration:
  1. `🧠 Routing intent…`
  2. `🛠️ Querying Leave Database…`
  3. `🔍 Searching HR Policy Documents…`
  4. Synthesized answer with policy citations
- Try: _"How many sick days do I have and what is the policy?"_

## Architecture — built to swap in Azure later

The UI is fully decoupled from the (currently mocked) data and AI logic. There are exactly **two seams** to replace when going live:

| Seam | File | Today | Production target |
| --- | --- | --- | --- |
| Data access | `src/services/api.js` | Returns mock data w/ fake latency | `fetch` → **Azure App Service** / **Azure SQL** |
| Agent / tools | `src/services/copilotEngine.js` | Keyword router + mock tools | **Azure OpenAI** function calling + **Azure AI Search** (RAG) |

Because pages only import from `api.js` and the chat only imports from `copilotEngine.js`, **components don't change** when the backend becomes real — you just replace the function bodies (return shapes are documented inline).

### Mapping to the target Azure services

- **Azure OpenAI** → intent routing (`detectIntents`) + final answer (`synthesize`)
- **Azure AI Search** → the `policy_search` tool (RAG over HR docs)
- **Azure SQL Database** → leave, payroll, benefits, training, directory records
- **Azure App Service** → hosts the API that `src/services/api.js` calls

## Project structure

```
src/
  components/
    copilot/        # Chat panel, message bubbles, agent trace, launcher
    layout/         # Sidebar, topbar, app shell
    ui/             # Reusable primitives (Card, Badge, Avatar, …)
  config/           # Navigation definition
  context/          # Global Copilot state (open/close, messages)
  data/             # mockData.js — all dummy records live here
  hooks/            # useAsync data-loading helper
  lib/              # Formatting helpers
  pages/            # One file per module
  services/         # api.js (data) + copilotEngine.js (agent) ← swap these
```

## Notes

- No backend is required to run the demo.
- Copy `.env.example` → `.env` when connecting real services.
