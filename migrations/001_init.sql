CREATE TABLE IF NOT EXISTS app_homework_grades__assignments (
  id           TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  due_date     TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'submitted', 'graded')),
  grade        TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS homework_assignments_member_status_due_idx
  ON app_homework_grades__assignments (member_id, status, due_date);

CREATE INDEX IF NOT EXISTS homework_assignments_due_created_idx
  ON app_homework_grades__assignments (due_date, created_at DESC);
