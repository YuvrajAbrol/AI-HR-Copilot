"use client";

import { Lock } from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { canAccessModule } from "@/lib/rbac";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DashboardModule } from "@/components/modules/DashboardModule";
import { CoreHrModule } from "@/components/modules/CoreHrModule";
import { PayrollModule } from "@/components/modules/PayrollModule";
import { TimeModule } from "@/components/modules/TimeModule";
import { AtsModule } from "@/components/modules/AtsModule";
import { PerformanceModule } from "@/components/modules/PerformanceModule";
import { ComplianceModule } from "@/components/modules/ComplianceModule";
import { EmployeeSlideOver } from "@/components/modules/EmployeeSlideOver";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";
import { CommandPalette } from "@/components/command/CommandPalette";
import { SlideOver } from "@/components/ui/SlideOver";

export function Shell() {
  const { role, activeModule, selectedEmployee, closeEmployee } = useWorkspace();

  const renderModule = () => {
    if (!canAccessModule(role, activeModule)) return <AccessDenied />;
    switch (activeModule) {
      case "dashboard":
        return <DashboardModule />;
      case "core-hr":
        return <CoreHrModule />;
      case "payroll":
        return <PayrollModule />;
      case "time":
        return <TimeModule />;
      case "ats":
        return <AtsModule />;
      case "performance":
        return <PerformanceModule />;
      case "compliance":
        return <ComplianceModule />;
      default:
        return <DashboardModule />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-5 py-5">{renderModule()}</div>
        </main>
      </div>

      <CopilotDrawer />

      <SlideOver open={!!selectedEmployee} onClose={closeEmployee}>
        {selectedEmployee && <EmployeeSlideOver employee={selectedEmployee} />}
      </SlideOver>

      <CommandPalette />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-300 bg-white py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
        <Lock size={22} />
      </span>
      <p className="text-sm font-semibold text-zinc-700">Access restricted</p>
      <p className="max-w-sm text-xs text-zinc-400">
        Your current role isn&apos;t cleared for this module. Use the “View as” switch to elevate access.
      </p>
    </div>
  );
}
