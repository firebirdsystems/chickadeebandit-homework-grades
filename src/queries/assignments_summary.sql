SELECT
  a.id,
  a.member_id,
  a.subject,
  a.title,
  a.due_date,
  a.status,
  a.grade,
  a.notes
FROM app_homework_grades__assignments a
ORDER BY (a.due_date = ''), a.due_date ASC, a.created_at DESC
LIMIT 200
-- homework_assignments_due_order_idx indexes this ORDER BY as an expression
-- index. The planner matches index expressions structurally, so rewording
-- `(a.due_date = '')` here silently drops back to a full scan and a temp
-- b-tree — change the migration with it.
