// ---------------------------------------------------------------------------
// Role-Based Access Control engine.
//
// Pure functions that decide what the current session (role + acting user) may
// see and do. Every module consults these instead of hardcoding role checks, so
// access rules live in one auditable place — mirroring how a real backend would
// enforce row/column-level security.
// ---------------------------------------------------------------------------

import type { Employee, Role } from "./types";

export interface RoleMeta {
  id: Role;
  label: string;
  tier: string;
  scope: string;
  clearance: string;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    id: "admin",
    label: "HR Administrator",
    tier: "Tier 4 · Full Access",
    scope: "Company-wide",
    clearance: "PII + Compensation + Edit",
  },
  manager: {
    id: "manager",
    label: "Manager",
    tier: "Tier 3 · Team Access",
    scope: "Direct & skip reports",
    clearance: "Team PII + Compensation",
  },
  employee: {
    id: "employee",
    label: "Standard Employee",
    tier: "Tier 1 · Self Service",
    scope: "Own records only",
    clearance: "Self only",
  },
};

/** Transitive set of report ids under a manager (direct + skip-level). */
export function reportsOf(managerId: string, all: Employee[]): Set<string> {
  const childrenByMgr = new Map<string, string[]>();
  for (const e of all) {
    if (!e.managerId) continue;
    const list = childrenByMgr.get(e.managerId) ?? [];
    list.push(e.id);
    childrenByMgr.set(e.managerId, list);
  }
  const result = new Set<string>();
  const stack = [...(childrenByMgr.get(managerId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    stack.push(...(childrenByMgr.get(id) ?? []));
  }
  return result;
}

/** Employees the current session is allowed to list/see. */
export function visibleEmployees(role: Role, currentUserId: string, all: Employee[]): Employee[] {
  if (role === "admin") return all;
  if (role === "employee") return all.filter((e) => e.id === currentUserId);
  const scope = reportsOf(currentUserId, all);
  return all.filter((e) => e.id === currentUserId || scope.has(e.id));
}

export function canViewEmployee(role: Role, currentUserId: string, targetId: string, all: Employee[]): boolean {
  if (role === "admin") return true;
  if (targetId === currentUserId) return true;
  if (role === "manager") return reportsOf(currentUserId, all).has(targetId);
  return false;
}

/** Compensation is more sensitive than the record itself. */
export function canViewCompensation(role: Role, currentUserId: string, targetId: string, all: Employee[]): boolean {
  if (role === "admin") return true;
  if (targetId === currentUserId) return true; // you can see your own pay
  if (role === "manager") return reportsOf(currentUserId, all).has(targetId);
  return false;
}

export function canViewPII(role: Role, currentUserId: string, targetId: string, all: Employee[]): boolean {
  return canViewCompensation(role, currentUserId, targetId, all);
}

export function canEditRecords(role: Role): boolean {
  return role === "admin";
}

export function canAccessModule(role: Role, moduleId: string): boolean {
  const matrix: Record<string, Role[]> = {
    dashboard: ["admin", "manager", "employee"],
    "core-hr": ["admin", "manager", "employee"],
    payroll: ["admin", "manager", "employee"],
    time: ["admin", "manager", "employee"],
    ats: ["admin", "manager"],
    performance: ["admin", "manager", "employee"],
    compliance: ["admin"],
  };
  return matrix[moduleId]?.includes(role) ?? false;
}
