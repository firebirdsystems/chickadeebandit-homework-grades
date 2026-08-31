-- assignments_summary.sql, the preload and the app list all order by
--   (due_date = ''), due_date ASC, created_at DESC
-- so that assignments with no due date sort last. homework_assignments_due_-
-- created_idx matches the last two terms but cannot serve the leading
-- expression, so the whole table was read and sorted in a temp b-tree to return
-- the first 200.
--
-- SQLite indexes expressions. `due_date = ''` is deterministic and both columns
-- are plaintext, so this stores the ordering the query actually asks for.
--
-- The expression must stay byte-identical to the one in the ORDER BY: the
-- planner matches index expressions structurally, so `due_date = ''` here and
-- `due_date IS NULL` there would silently not match.
CREATE INDEX IF NOT EXISTS homework_assignments_due_order_idx
  ON app_homework_grades__assignments ((due_date = ''), due_date, created_at DESC);
