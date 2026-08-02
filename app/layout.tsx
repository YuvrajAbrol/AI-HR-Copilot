import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Copilot Workspace — Team ClosedAI",
  description:
    "Enterprise HR operations platform: employee database, payroll, time & attendance, ATS, performance, compliance, and an RBAC-aware AI copilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
