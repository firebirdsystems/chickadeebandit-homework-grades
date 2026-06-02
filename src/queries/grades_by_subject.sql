SELECT
  a.member_id,
  a.subject,
  COUNT(*)                                    AS total_assignments,
  COUNT(a.grade) FILTER (WHERE a.grade != '') AS graded_count,
  COUNT(*) FILTER (WHERE a.status = 'pending') AS pending_count
FROM assignments a
WHERE a.household_id = current_setting('app.household_id', true)::uuid
GROUP BY a.member_id, a.subject
ORDER BY a.member_id, a.subject
