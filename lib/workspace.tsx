"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DATASET } from "./dataset";
import { runCopilot, type ModuleId, type ReasoningStep, type FollowUp } from "./copilot";
import { canAccessModule } from "./rbac";
import type { Employee, HrDataset, Role } from "./types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  steps: ReasoningStep[];
  systems: string[];
  followUps: FollowUp[];
  denied?: boolean;
  blocked?: boolean;
  pending?: boolean;
}

interface WorkspaceState {
  data: HrDataset;
  role: Role;
  currentUser: Employee;
  setRole: (r: Role) => void;

  activeModule: ModuleId;
  setModule: (m: ModuleId) => void;

  selectedEmployeeId: string | null;
  openEmployee: (id: string) => void;
  closeEmployee: () => void;
  selectedEmployee: Employee | null;

  // Copilot drawer
  copilotOpen: boolean;
  toggleCopilot: () => void;
  setCopilotOpen: (v: boolean) => void;
  messages: ChatMessage[];
  isThinking: boolean;
  sendMessage: (text: string) => Promise<void>;
  runFollowUp: (f: FollowUp) => void;
  resetChat: () => void;

  // Command palette
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
}

const Ctx = createContext<WorkspaceState | null>(null);

let mid = 0;
const nextId = () => `m${mid++}`;

function welcome(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    text: "I'm your HR copilot. I verify RBAC clearance before every query and mask anything outside your scope. Ask about people, payroll, time off, hiring, performance, or compliance.",
    steps: [],
    systems: [],
    followUps: [],
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const data = DATASET;
  const [role, setRoleState] = useState<Role>("admin");
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcome()]);
  const [isThinking, setIsThinking] = useState(false);

  const currentUser = useMemo(() => {
    const id = data.roleUsers[role];
    return data.employees.find((e) => e.id === id) ?? data.employees[0];
  }, [data, role]);

  const selectedEmployee = useMemo(
    () => data.employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [data, selectedEmployeeId]
  );

  const setModule = useCallback((m: ModuleId) => {
    setActiveModule(m);
    setSelectedEmployeeId(null);
  }, []);

  const setRole = useCallback(
    (r: Role) => {
      setRoleState(r);
      setSelectedEmployeeId(null);
      // If the new role can't access the current module, bounce to dashboard.
      setActiveModule((cur) => (canAccessModule(r, cur) ? cur : "dashboard"));
    },
    []
  );

  const openEmployee = useCallback((id: string) => setSelectedEmployeeId(id), []);
  const closeEmployee = useCallback(() => setSelectedEmployeeId(null), []);
  const toggleCopilot = useCallback(() => setCopilotOpen((v) => !v), []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;
      setCopilotOpen(true);
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "user", text: trimmed, steps: [], systems: [], followUps: [] },
        { id: assistantId, role: "assistant", text: "", steps: [], systems: [], followUps: [], pending: true },
      ]);
      setIsThinking(true);
      try {
        const turn = await runCopilot(
          trimmed,
          { role, currentUser, employees: data.employees },
          {
            onStep: (steps) =>
              setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, steps } : m))),
          }
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: turn.response,
                  steps: turn.steps,
                  systems: turn.systems,
                  followUps: turn.followUps,
                  denied: turn.denied,
                  blocked: turn.blocked,
                  pending: false,
                }
              : m
          )
        );
        if (turn.action && canAccessModule(role, turn.action.module)) {
          setModule(turn.action.module);
        }
      } finally {
        setIsThinking(false);
      }
    },
    [isThinking, role, currentUser, data.employees, setModule]
  );

  const runFollowUp = useCallback((f: FollowUp) => sendMessage(f.prompt), [sendMessage]);
  const resetChat = useCallback(() => setMessages([welcome()]), []);

  // Cmd/Ctrl+K → command palette; Cmd/Ctrl+J → copilot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (meta && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCopilotOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value: WorkspaceState = {
    data,
    role,
    currentUser,
    setRole,
    activeModule,
    setModule,
    selectedEmployeeId,
    openEmployee,
    closeEmployee,
    selectedEmployee,
    copilotOpen,
    toggleCopilot,
    setCopilotOpen,
    messages,
    isThinking,
    sendMessage,
    runFollowUp,
    resetChat,
    paletteOpen,
    setPaletteOpen,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
