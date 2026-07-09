// Pure, testable logic extracted from index.html.
// No DOM, no network — safe to import from Node for unit tests.

import { isAdult } from "./shared.js";
export { isAdult };

export const SUBJECTS = ["Math", "English", "Science", "History", "Geography", "Art", "Music", "PE", "Other"];
export const STATUSES = [
  { id: "all",       label: "All" },
  { id: "pending",   label: "Pending" },
  { id: "submitted", label: "Submitted" },
  { id: "graded",    label: "Graded" },
];
export const STATUS_IDS = new Set(STATUSES.filter(s => s.id !== "all").map(s => s.id));

export function isSafeId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

export function normalizedStatus(value) {
  return STATUS_IDS.has(value) ? value : "pending";
}

export function memberName(members, id) {
  return members.find(m => m.id === id)?.name ?? "Unknown";
}

// Restrict assignments to the active member tab, or — for a non-adult viewer —
// to their own assignments. Adults with no active tab see everyone.
export function scopedAssignments(assignments, activeMemberId, currentMe) {
  if (activeMemberId) return assignments.filter(a => a.member_id === activeMemberId);
  if (currentMe && !isAdult(currentMe)) return assignments.filter(a => a.member_id === currentMe.id);
  return assignments;
}

export function filteredAssignments(assignments, activeMemberId, currentMe, activeStatus) {
  const scoped = scopedAssignments(assignments, activeMemberId, currentMe);
  if (activeStatus === "all") return scoped;
  return scoped.filter(a => a.status === activeStatus);
}

export function isOverdue(a, todayStr) {
  return a.due_date && a.status !== "graded" && a.due_date < todayStr;
}

export function isToday(a, todayStr) {
  return a.due_date === todayStr;
}

export function statusCounts(scoped) {
  const counts = { all: scoped.length, pending: 0, submitted: 0, graded: 0 };
  scoped.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
  return counts;
}

export function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  catch { return s; }
}
