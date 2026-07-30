"use client";

import { SecurityBar } from "./SecurityBar";
import { Sidebar } from "./Sidebar";
import { Canvas } from "./Canvas";
import { CopilotConsole } from "@/components/copilot/CopilotConsole";
import { EmailModal } from "@/components/email/EmailModal";

export function Workspace() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SecurityBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Canvas />
        <CopilotConsole />
      </div>
      <EmailModal />
    </div>
  );
}
