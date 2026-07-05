SELECT
  a.member_id,
  a.subject,
  COUNT(*)                                    AS total_assignments,
  SUM(CASE WHEN a.grade IS NOT NULL AND a.grade != '' THEN 1 ELSE 0 END) AS graded_count,
  SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) AS pending_count
FROM app_homework_grades__assignments a
GROUP BY a.member_id, a.subject
ORDER BY a.member_id, a.subject
