"use client";

// ---------------------------------------------------------------------------
// Global workspace store.
//
// Single source of UI truth shared by all three zones (sidebar, canvas,
// copilot). The AI console dispatches CanvasActions here to drive the center
// canvas (e.g. focus an employee, open the resume screener) — this is what
// makes the copilot feel like it's operating the workspace, not just chatting.
// ---------------------------------------------------------------------------

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { runAgentTurn } from "./copilotEngine";
import { EMPLOYEES, ROLE_PROFILES } from "./mockData";
import type {
  CanvasAction,
  ChatMessage,
  Employee,
  FollowUp,
  RoleProfile,
  SecurityRole,
  ViewId,
} from "./types";

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  context: string;
}

interface WorkspaceState {
  // RBAC
  role: SecurityRole;
  roleProfile: RoleProfile;
  setRole: (role: SecurityRole) => void;

  // Canvas navigation
  activeView: ViewId;
  focusedEmployee: Employee | null;
  setView: (view: ViewId) => void;
  focusEmployee: (id: string) => void;

  // Copilot
  messages: ChatMessage[];
  isThinking: boolean;
  sendMessage: (text: string) => Promise<void>;
  runFollowUp: (chip: FollowUp) => void;
  resetChat: () => void;

  // Email studio modal
  emailDraft: EmailDraft | null;
  openEmail: (draft: EmailDraft) => void;
  closeEmail: () => void;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);

let msgId = 0;
const nextId = () => `msg-${msgId++}`;

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Welcome to the HR Copilot Console. I orchestrate Azure SQL, Azure AI Search, and Microsoft Graph behind one guardrailed assistant. Ask about an employee, a policy, resumes, or payroll to begin.",
  steps: [],
  citations: [],
  followUps: [],
  systems: [],
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<SecurityRole>("admin");
  const [activeView, setActiveView] = useState<ViewId>("dashboard");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isThinking, setIsThinking] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);

  const focusedEmployee = useMemo(
    () => EMPLOYEES.find((e) => e.id === focusedId) ?? null,
    [focusedId]
  );

  const setView = useCallback((view: ViewId) => setActiveView(view), []);

  const focusEmployee = useCallback((id: string) => {
    setFocusedId(id);
    setActiveView("employee-detail");
  }, []);

  const applyCanvasAction = useCallback((action?: CanvasAction) => {
    if (!action) return;
    if (action.employeeId) setFocusedId(action.employeeId);
    setActiveView(action.view);
  }, []);

  const openEmail = useCallback((draft: EmailDraft) => setEmailDraft(draft), []);
  const closeEmail = useCallback(() => setEmailDraft(null), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: trimmed, steps: [], citations: [], followUps: [], systems: [] },
        { id: assistantId, role: "assistant", text: "", steps: [], citations: [], followUps: [], systems: [], pending: true },
      ]);
      setIsThinking(true);

      try {
        const turn = await runAgentTurn(trimmed, {
          onStep: (steps) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, steps } : m))
            );
          },
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: turn.response,
                  steps: turn.steps,
                  citations: turn.citations,
                  followUps: turn.followUps,
                  systems: turn.systems,
                  blocked: turn.blocked,
                  pending: false,
                }
              : m
          )
        );
        applyCanvasAction(turn.canvasAction);
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, applyCanvasAction]
  );

  const runFollowUp = useCallback(
    (chip: FollowUp) => {
      if (chip.kind === "prompt") {
        sendMessage(chip.payload);
        return;
      }
      // action chips
      if (chip.payload === "email") {
        openEmail(buildDefaultEmail(focusedEmployee));
        return;
      }
      setActiveView(chip.payload as ViewId);
    },
    [sendMessage, openEmail, focusedEmployee]
  );

  const resetChat = useCallback(() => setMessages([WELCOME]), []);

  const value: WorkspaceState = {
    role,
    roleProfile: ROLE_PROFILES[role],
    setRole,
    activeView,
    focusedEmployee,
    setView,
    focusEmployee,
    messages,
    isThinking,
    sendMessage,
    runFollowUp,
    resetChat,
    emailDraft,
    openEmail,
    closeEmail,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return ctx;
}

function buildDefaultEmail(employee: Employee | null): EmailDraft {
  if (!employee) {
    return {
      to: "candidate@example.com",
      subject: "Interview Invitation — Senior Backend Developer",
      body: "Hi Elena,\n\nThank you for applying to the Senior Backend Developer role at Team ClosedAI. We were impressed by your background in distributed systems and would love to schedule an interview.\n\nCould you share your availability next week?\n\nBest,\nHR Operations",
      context: "AI-drafted · Microsoft Graph API",
    };
  }
  return {
    to: employee.email,
    subject: `PTO Request Approval — ${employee.name}`,
    body: `Hi ${employee.name.split(" ")[0]},\n\nYour upcoming time-off request has been reviewed and approved. You currently have ${employee.ptoRemainingHours} PTO hours available, which covers this request within policy (up to 10 consecutive business days).\n\nEnjoy your time off!\n\nBest,\nHR Operations`,
    context: `AI-drafted for ${employee.name} · Microsoft Graph API`,
  };
}
