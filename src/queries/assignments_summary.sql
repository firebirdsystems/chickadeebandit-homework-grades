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
ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
LIMIT 200
