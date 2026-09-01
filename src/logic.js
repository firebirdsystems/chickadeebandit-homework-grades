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

/**
 * Re-imposes a coherent order on the merged list.
 *
 * This used to come free: one statement returned every assignment already
 * sorted. The read is now split in two — the working set ascending by due date,
 * the graded archive descending and a page at a time — so the array is the
 * concatenation of two different orderings plus whatever later pages appended.
 * Without this the All tab renders pending work oldest-first and then graded
 * work newest-first, which is not an order anyone asked for.
 *
 * The Graded tab keeps the archive's own DESC order, so "Show older graded
 * work" appends to the bottom instead of injecting rows into the middle. Every
 * other tab gets the original ordering back verbatim: undated last, then
 * earliest due first, then newest created.
 */
export function sortAssignments(list, activeStatus) {
  const rows = [...list];
  if (activeStatus === "graded") {
    return rows.sort((a, b) =>
      (b.due_date ?? "").localeCompare(a.due_date ?? "") ||
      (b.id ?? "").localeCompare(a.id ?? ""));
  }
  return rows.sort((a, b) =>
    (a.due_date ? 0 : 1) - (b.due_date ? 0 : 1) ||
    (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
    (b.created_at ?? "").localeCompare(a.created_at ?? ""));
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

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * Subject and notes count as well as the title — homework is looked
 * up as "the history essay", which is the subject plus a fragment.
 */
export function searchableFields(item) {
  return [item.title, item.subject, item.notes, item.grade];
}

/**
 * Page size and later pages of the graded archive, both derived from the app's
 * first-page statement so they cannot drift apart.
 *
 * The first page must be one literal string in index.html: the hub's admission
 * validator cannot parse `LIMIT ?` / `OFFSET ?` (it rejects the manifest with
 * "could not be parsed as SQL"), and `manifest.preload` only answers a request
 * whose text matches the declared statement after whitespace collapse.
 */
export function pageSizeOf(firstPageSql) {
  const m = /LIMIT (\d+)/.exec(firstPageSql);
  if (!m) throw new Error("first-page SQL has no literal LIMIT");
  return Number(m[1]);
}

export function pageSqlAt(firstPageSql, offset) {
  const n = Math.max(0, Math.floor(Number(offset) || 0));
  if (n === 0) return firstPageSql;
  if (!/OFFSET 0$/.test(firstPageSql)) throw new Error("first-page SQL must end in OFFSET 0");
  return firstPageSql.replace(/OFFSET 0$/, `OFFSET ${n}`);
}

/**
 * Counts are shown only for the tabs whose set is loaded in full.
 *
 * Pending and Submitted are the whole working set — every ungraded assignment
 * is loaded regardless of age, so those numbers are exact, and they are the
 * ones that carry the signal ("three things still to hand in"). Graded is an
 * archive that arrives a page at a time, and All contains it, so a number on
 * either would count what happens to be downloaded and read as a fact.
 */
export const COUNTED_STATUSES = new Set(["pending", "submitted"]);
