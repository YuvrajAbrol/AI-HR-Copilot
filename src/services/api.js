// ---------------------------------------------------------------------------
// API service layer.
//
// This is the ONE place the UI talks to for data. Today every function returns
// mock data after a small simulated network delay. To go live against the Azure
// backend (App Service + Azure SQL), replace the body of each function with a
// real `fetch` / SDK call that returns the same shape — the components won't
// need to change.
//
// Example real implementation:
//
//   const API_BASE = import.meta.env.VITE_API_BASE_URL;
//   export async function getLeaveRequests() {
//     const res = await fetch(`${API_BASE}/api/leave/requests`, {
//       headers: { Authorization: `Bearer ${getToken()}` },
//     });
//     if (!res.ok) throw new Error("Failed to load leave requests");
//     return res.json();
//   }
// ---------------------------------------------------------------------------

import {
  currentUser,
  leaveBalances,
  leaveRequests,
  benefits,
  paystubs,
  nextPayday,
  trainingCourses,
  employees,
} from "../data/mockData.js";

// Simulated latency so loading states are visible during the demo.
const LATENCY_MS = 350;

function delay(value, ms = LATENCY_MS) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// Deep-clone so callers can mutate freely without corrupting the mock store.
function clone(value) {
  return structuredClone(value);
}

export function getCurrentUser() {
  return delay(clone(currentUser));
}

export function getLeaveBalances() {
  return delay(clone(leaveBalances));
}

export function getLeaveRequests() {
  return delay(clone(leaveRequests));
}

// Mocks a POST. Returns the newly created request record.
export function createLeaveRequest(request) {
  const created = {
    id: `lr-${Math.floor(1000 + Math.random() * 9000)}`,
    status: "Pending",
    ...request,
  };
  return delay(created);
}

export function getBenefits() {
  return delay(clone(benefits));
}

export function getPaystubs() {
  return delay(clone(paystubs));
}

export function getNextPayday() {
  return delay(clone(nextPayday));
}

export function getTrainingCourses() {
  return delay(clone(trainingCourses));
}

export function getEmployees() {
  return delay(clone(employees));
}
