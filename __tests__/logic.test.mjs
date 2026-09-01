import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
import {
  SUBJECTS, STATUSES, STATUS_IDS, isSafeId, normalizedStatus, memberName,
  scopedAssignments, filteredAssignments, isOverdue, isToday, statusCounts, fmtDate, searchableFields,
  pageSizeOf, pageSqlAt, COUNTED_STATUSES, sortAssignments,
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

describe("searchableFields", () => {
  it("matches on subject and notes, not just the assignment title", () => {
    const fields = searchableFields({ title: "Essay", subject: "History", notes: "Tudors, 1500 words", grade: "B+" });
    expect(fields).toContain("History");
    expect(fields).toContain("Tudors, 1500 words");
  });
});

// The graded archive is paged and its first page is ALSO the preloaded one, so
// two things must stay true together: page 1 is exactly what the manifest
// declares, and later pages are that statement with only the offset moved.
// Drift is silent — the preload stops answering, or a page repeats/skips rows.
describe("graded archive paging", () => {
  const FIRST = "SELECT * FROM app_homework_grades__assignments WHERE status = 'graded' ORDER BY due_date DESC, id DESC LIMIT 25 OFFSET 0";

  it("takes the page size from the statement itself", () => {
    expect(pageSizeOf(FIRST)).toBe(25);
    expect(() => pageSizeOf("SELECT 1")).toThrow(/literal LIMIT/);
  });

  it("returns page one unchanged, so it still matches the preload", () => {
    expect(pageSqlAt(FIRST, 0)).toBe(FIRST);
  });

  it("moves only the offset for later pages", () => {
    expect(pageSqlAt(FIRST, 25)).toBe(FIRST.replace("OFFSET 0", "OFFSET 25"));
  });

  it("never interpolates anything but a non-negative integer", () => {
    for (const bad of ["1; DROP TABLE x", -5, 2.7, NaN, undefined, null]) {
      expect(pageSqlAt(FIRST, bad)).toMatch(/OFFSET \d+$/);
    }
    expect(pageSqlAt(FIRST, -5)).toBe(FIRST);
  });

  it("is the statement the manifest declares as the preloaded first page", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));
    expect(manifest.preload.graded_page.sql).toBe(FIRST);
    // A parameterised LIMIT/OFFSET is rejected by the hub's admission validator
    // ("could not be parsed as SQL"), so the integers must be inline.
    expect(manifest.preload.graded_page.sql).not.toMatch(/LIMIT \?|OFFSET \?/);
  });

  it("splits the CHECK constraint's statuses with no gap between the two reads", () => {
    const manifest = JSON.parse(readFileSync(join(__dirname, "../manifest.json"), "utf-8"));
    const declared = manifest.preload.active.sql + " " + manifest.preload.graded_page.sql;
    // Every status the app can store must be claimed by exactly one of the two
    // preloads; a status in neither would make those assignments invisible.
    for (const id of STATUS_IDS) expect(declared, `status "${id}" is in neither read`).toContain(`'${id}'`);
  });
});

// Splitting one read into two left `assignments` as a concatenation of two
// different orderings, which nothing re-imposed an order on. These pin the
// order back to what the single statement used to return.
describe("sortAssignments", () => {
  const rows = [
    { id: "a", due_date: "2026-06-10", created_at: "2026-01-01", status: "pending" },
    { id: "b", due_date: "", created_at: "2026-01-05", status: "pending" },
    { id: "c", due_date: "2026-05-28", created_at: "2026-01-02", status: "graded" },
    { id: "d", due_date: "2026-06-10", created_at: "2026-02-09", status: "graded" },
  ];

  it("puts undated work last and orders the rest earliest-due-first", () => {
    expect(sortAssignments(rows, "all").map(a => a.id)).toEqual(["c", "d", "a", "b"]);
  });

  it("breaks a due-date tie by newest created, as the original statement did", () => {
    // d and a share 2026-06-10; d was created later, so it leads.
    const tied = sortAssignments(rows, "all").filter(a => a.due_date === "2026-06-10");
    expect(tied.map(a => a.id)).toEqual(["d", "a"]);
  });

  it("keeps the graded tab in the archive's own newest-first order", () => {
    // Must match the paging statement (due_date DESC, id DESC) so that
    // "Show older graded work" appends downward instead of injecting rows.
    expect(sortAssignments(rows, "graded").map(a => a.id)).toEqual(["d", "a", "c", "b"]);
  });

  it("does not mutate the array it is given", () => {
    const before = rows.map(a => a.id);
    sortAssignments(rows, "all");
    expect(rows.map(a => a.id)).toEqual(before);
  });
});

describe("COUNTED_STATUSES", () => {
  it("counts only the tabs whose set is loaded in full", () => {
    // pending + submitted are the whole working set, so their counts are exact.
    expect(COUNTED_STATUSES.has("pending")).toBe(true);
    expect(COUNTED_STATUSES.has("submitted")).toBe(true);
    // graded is paged, and "all" contains it — a number on either would count
    // what happens to be downloaded and read as a fact.
    expect(COUNTED_STATUSES.has("graded")).toBe(false);
    expect(COUNTED_STATUSES.has("all")).toBe(false);
  });
});
