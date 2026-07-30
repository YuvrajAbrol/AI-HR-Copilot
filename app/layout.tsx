import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Copilot Workspace — Team ClosedAI",
  description:
    "Enterprise AI HR Operations & Command Center: agentic multi-tool copilot for workforce, policy, payroll, and hiring.",
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
