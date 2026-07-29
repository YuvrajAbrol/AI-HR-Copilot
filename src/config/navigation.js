import {
  LayoutDashboard,
  CalendarDays,
  ShieldCheck,
  Wallet,
  GraduationCap,
  Users,
} from "lucide-react";

// Single source of truth for the sidebar links + routes. Add a module here and
// it shows up in the nav automatically.
export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/leave", label: "Leave", icon: CalendarDays },
  { to: "/benefits", label: "Benefits", icon: ShieldCheck },
  { to: "/payroll", label: "Payroll", icon: Wallet },
  { to: "/training", label: "Training", icon: GraduationCap },
  { to: "/directory", label: "Directory", icon: Users },
];
