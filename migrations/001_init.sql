CREATE TABLE IF NOT EXISTS app_homework_grades__assignments (
  id           TEXT NOT NULL,
  member_id    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  due_date     TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  grade        TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (id)
)
