CREATE TABLE IF NOT EXISTS assignments (
  id           TEXT NOT NULL,
  household_id UUID NOT NULL DEFAULT current_setting('app.household_id', true)::uuid,
  member_id    TEXT NOT NULL,
  subject      TEXT NOT NULL,
  title        TEXT NOT NULL,
  due_date     TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending',
  grade        TEXT NOT NULL DEFAULT '',
  notes        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (household_id, id)
)
