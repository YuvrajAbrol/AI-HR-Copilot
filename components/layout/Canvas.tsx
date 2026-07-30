"use client";

import { motion } from "framer-motion";
import { useWorkspace } from "@/lib/store";
import { ExecutiveDashboard } from "@/components/dashboard/ExecutiveDashboard";
import { EmployeeDirectory } from "@/components/modules/EmployeeDirectory";
import { EmployeeDetail } from "@/components/modules/EmployeeDetail";
import { PayrollBenefits } from "@/components/modules/PayrollBenefits";
import { OnboardingTracker } from "@/components/modules/OnboardingTracker";
import { ResumeScreener } from "@/components/modules/ResumeScreener";
import { PolicyKnowledgeBase } from "@/components/modules/PolicyKnowledgeBase";
import { SecurityAuditLogs } from "@/components/modules/SecurityAuditLogs";

export function Canvas() {
  const { activeView } = useWorkspace();

  const render = () => {
    switch (activeView) {
      case "dashboard":
        return <ExecutiveDashboard />;
      case "directory":
        return <EmployeeDirectory />;
      case "employee-detail":
        return <EmployeeDetail />;
      case "payroll":
        return <PayrollBenefits />;
      case "onboarding":
        return <OnboardingTracker />;
      case "resume-screener":
        return <ResumeScreener />;
      case "policy":
        return <PolicyKnowledgeBase />;
      case "audit":
        return <SecurityAuditLogs />;
      default:
        return <ExecutiveDashboard />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-slate-50">
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-6xl px-6 py-6"
      >
        {render()}
      </motion.div>
    </main>
  );
}
