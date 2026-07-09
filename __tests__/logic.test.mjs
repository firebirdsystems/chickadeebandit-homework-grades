import { describe, it, expect } from "vitest";
import {
  SUBJECTS, STATUSES, STATUS_IDS, isSafeId, normalizedStatus, memberName,
  scopedAssignments, filteredAssignments, isOverdue, isToday, statusCounts, fmtDate,
} from "../src/logic.js";

describe("isSafeId", () => {
  it("accepts safe ids, rejects unsafe", () => {
    expect(isSafeId("abc-1_Z")).toBe(true);
    expect(isSafeId("a b")).toBe(false);
    expect(isSafeId("")).toBe(false);
    expect(isSafeId(1)).toBe(false);
  });
});

describe("normalizedStatus", () => {
  it("passes through valid statuses", () => {
    expect(normalizedStatus("submitted")).toBe("submitted");
    expect(normalizedStatus("graded")).toBe("graded");
  });
  it("defaults invalid to pending", () => {
    expect(normalizedStatus("all")).toBe("pending"); // 'all' excluded from STATUS_IDS
    expect(normalizedStatus("weird")).toBe("pending");
  });
});

describe("memberName", () => {
  it("resolves and defaults to Unknown", () => {
    expect(memberName([{ id: "m", name: "Sam" }], "m")).toBe("Sam");
    expect(memberName([], "m")).toBe("Unknown");
  });
});

const A = [
  { id: "1", member_id: "kid", status: "pending", due_date: "2026-01-01" },
  { id: "2", member_id: "kid", status: "graded", due_date: "2026-02-01" },
  { id: "3", member_id: "other", status: "submitted", due_date: "2026-03-01" },
];

describe("scopedAssignments", () => {
  it("filters by active member tab", () => {
    expect(scopedAssignments(A, "kid", null).map(a => a.id)).toEqual(["1", "2"]);
  });
  it("a non-adult viewer only sees their own", () => {
    expect(scopedAssignments(A, null, { id: "kid", role: "child" }).map(a => a.id)).toEqual(["1", "2"]);
  });
  it("an adult with no tab sees everyone", () => {
    expect(scopedAssignments(A, null, { id: "p", role: "adult" }).map(a => a.id)).toEqual(["1", "2", "3"]);
  });
});

describe("filteredAssignments", () => {
  it("all returns the scoped set", () => {
    expect(filteredAssignments(A, null, { role: "adult" }, "all")).toHaveLength(3);
  });
  it("filters by status within scope", () => {
    expect(filteredAssignments(A, null, { role: "adult" }, "graded").map(a => a.id)).toEqual(["2"]);
  });
});

describe("isOverdue / isToday", () => {
  it("overdue when past due and not graded", () => {
    expect(isOverdue({ status: "pending", due_date: "2026-01-01" }, "2026-06-01")).toBe(true);
    expect(isOverdue({ status: "graded", due_date: "2026-01-01" }, "2026-06-01")).toBe(false);
    expect(isOverdue({ status: "pending", due_date: "" }, "2026-06-01")).toBeFalsy();
  });
  it("isToday matches due date", () => {
    expect(isToday({ due_date: "2026-06-01" }, "2026-06-01")).toBe(true);
    expect(isToday({ due_date: "2026-06-02" }, "2026-06-01")).toBe(false);
  });
});

describe("statusCounts", () => {
  it("counts by status with an all total", () => {
    expect(statusCounts(A)).toEqual({ all: 3, pending: 1, submitted: 1, graded: 1 });
  });
});

describe("fmtDate", () => {
  it("empty for falsy, formatted otherwise", () => {
    expect(fmtDate("")).toBe("");
    expect(fmtDate("2026-07-08")).toMatch(/Jul/);
  });
});

describe("constants", () => {
  it("expose subjects and statuses", () => {
    expect(SUBJECTS).toContain("Math");
    expect(STATUSES[0].id).toBe("all");
    expect(STATUS_IDS.has("all")).toBe(false);
  });
});
