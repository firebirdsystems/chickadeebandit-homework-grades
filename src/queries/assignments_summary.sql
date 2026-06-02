SELECT
  a.id,
  a.member_id,
  a.subject,
  a.title,
  a.due_date,
  a.status,
  a.grade,
  a.notes
FROM assignments a
WHERE a.household_id = current_setting('app.household_id', true)::uuid
ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
LIMIT 200
