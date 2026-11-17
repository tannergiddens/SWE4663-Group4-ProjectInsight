-- ManagePro 
-- Enable foreign keys on EVERY database connection: PRAGMA foreign_keys = ON;

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- 1. People and projects
CREATE TABLE IF NOT EXISTS clients (
  client_id INTEGER PRIMARY KEY,
  client_name TEXT NOT NULL,
  contact_title TEXT,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state_region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL,
  direct_phone TEXT NOT NULL,
  mobile_phone TEXT,
  email TEXT
);

CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS projects (
  project_id INTEGER PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(client_id),
  project_manager_id INTEGER REFERENCES users(user_id),
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  methodology TEXT NOT NULL DEFAULT 'Waterfall',
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','on_hold','completed','cancelled')),
  start_date TEXT,
  target_end_date TEXT,
  sprint_weeks INTEGER CHECK (sprint_weeks IN (2, 3)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_members (
  member_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  role_name TEXT NOT NULL,
  joined_on TEXT NOT NULL,
  left_on TEXT,
  CHECK (left_on IS NULL OR left_on >= joined_on)
);

-- 2. SDLC phases and optional sprints
-- The seven rows below represent six SDLC phases plus client acceptance.
CREATE TABLE IF NOT EXISTS sdlc_phases (
  phase_id INTEGER PRIMARY KEY,
  phase_name TEXT NOT NULL UNIQUE,
  sequence_no INTEGER NOT NULL UNIQUE
);
INSERT INTO sdlc_phases (phase_id, phase_name, sequence_no) VALUES
  (1,'Planning & Feasibility',1),
  (2,'Requirements Analysis',2),
  (3,'System Design',3),
  (4,'Development',4),
  (5,'Testing & Verification',5),
  (6,'Deployment & Release',6),
  (7,'Client Acceptance & Sign-Off',7) ON CONFLICT(phase_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS project_phases (
  project_phase_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  phase_id INTEGER NOT NULL REFERENCES sdlc_phases(phase_id),
  iteration_no INTEGER NOT NULL DEFAULT 1 CHECK (iteration_no >= 1),
  status TEXT NOT NULL DEFAULT 'planned',
  start_date TEXT,
  end_date TEXT,
  UNIQUE (project_id, phase_id, iteration_no)
);

CREATE TABLE IF NOT EXISTS sprints (
  sprint_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  sprint_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  CHECK (end_date >= start_date)
);

-- 3. Requirements, tasks and time
CREATE TABLE IF NOT EXISTS requirements (
  requirement_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  requirement_code TEXT NOT NULL,
  requirement_type TEXT NOT NULL
    CHECK (requirement_type IN ('functional','non_functional')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'proposed',
  estimate_unit TEXT NOT NULL DEFAULT 'hours',
  estimate_value REAL NOT NULL DEFAULT 0 CHECK (estimate_value >= 0),
  estimated_hours REAL NOT NULL DEFAULT 0 CHECK (estimated_hours >= 0),
  buffer_hours REAL NOT NULL DEFAULT 0 CHECK (buffer_hours >= 0),
  acceptance_criteria TEXT,
  UNIQUE (project_id, requirement_code),
  UNIQUE (requirement_id, project_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  requirement_id INTEGER NOT NULL,
  parent_task_id INTEGER REFERENCES tasks(task_id),
  phase_id INTEGER REFERENCES sdlc_phases(phase_id),
  sprint_id INTEGER REFERENCES sprints(sprint_id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  allocated_hours REAL NOT NULL DEFAULT 0 CHECK (allocated_hours >= 0),
  remaining_hours REAL CHECK (remaining_hours >= 0),
  due_date TEXT,
  completed_at TEXT,
  FOREIGN KEY (requirement_id, project_id)
    REFERENCES requirements(requirement_id, project_id),
  CHECK (parent_task_id IS NULL OR parent_task_id <> task_id)
);

CREATE TABLE IF NOT EXISTS task_assignments (
  assignment_id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(task_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TEXT
);

-- Every row is real effort logged exactly once. A weekly row is NOT
-- a duplicate summary of daily rows; choose daily OR weekly logging.
CREATE TABLE IF NOT EXISTS time_entries (
  entry_id INTEGER PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(task_id),
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  phase_id INTEGER REFERENCES sdlc_phases(phase_id),
  defect_id INTEGER REFERENCES defects(defect_id),
  activity TEXT NOT NULL DEFAULT 'Development',
  period_type TEXT NOT NULL DEFAULT 'daily'
    CHECK (period_type IN ('daily','weekly')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0),
  is_rework INTEGER NOT NULL DEFAULT 0 CHECK (is_rework IN (0, 1)),
  notes TEXT,
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (period_end >= period_start)
);

-- 4. Quality and change tracking
CREATE TABLE IF NOT EXISTS risks (
  risk_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  requirement_id INTEGER REFERENCES requirements(requirement_id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'open',
  owner_id INTEGER REFERENCES users(user_id),
  mitigation_plan TEXT
);

CREATE TABLE IF NOT EXISTS defects (
  defect_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  requirement_id INTEGER NOT NULL REFERENCES requirements(requirement_id),
  task_id INTEGER REFERENCES tasks(task_id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  reported_by INTEGER REFERENCES users(user_id),
  assigned_to INTEGER REFERENCES users(user_id),
  reported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

-- One audit table covers task status/estimates, risks, defects and approvals.
CREATE TABLE IF NOT EXISTS change_history (
  change_id INTEGER PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INTEGER REFERENCES users(user_id),
  reason TEXT,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requirement_baselines (
  baseline_id INTEGER PRIMARY KEY,
  requirement_id INTEGER NOT NULL REFERENCES requirements(requirement_id),
  version_no INTEGER NOT NULL CHECK (version_no >= 1),
  estimated_hours REAL NOT NULL CHECK (estimated_hours >= 0),
  buffer_hours REAL NOT NULL CHECK (buffer_hours >= 0),
  description_snapshot TEXT NOT NULL,
  acceptance_criteria_snapshot TEXT,
  approved_by INTEGER REFERENCES users(user_id),
  approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_reason TEXT,
  UNIQUE (requirement_id, version_no)
);

CREATE TABLE IF NOT EXISTS client_acceptance (
  acceptance_id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(project_id),
  requirement_id INTEGER REFERENCES requirements(requirement_id),
  decision TEXT NOT NULL
    CHECK (decision IN ('submitted','accepted','rejected','changes_requested')),
  client_representative_name TEXT NOT NULL,
  signed_at TEXT,
  evidence_reference TEXT,
  comments TEXT,
  recorded_by INTEGER REFERENCES users(user_id),
  recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Simple reporting. Sum time_entries once, never sum parent rollups.
CREATE VIEW IF NOT EXISTS v_project_hours AS
SELECT p.project_id, p.project_name,
       COALESCE(SUM(te.hours), 0) AS accumulated_hours
FROM projects p
LEFT JOIN tasks t ON t.project_id = p.project_id
LEFT JOIN time_entries te ON te.task_id = t.task_id
GROUP BY p.project_id, p.project_name;

CREATE VIEW IF NOT EXISTS v_all_projects_hours AS
SELECT COALESCE(SUM(accumulated_hours), 0) AS accumulated_hours
FROM v_project_hours;

CREATE VIEW IF NOT EXISTS v_time_details AS
SELECT te.entry_id, t.project_id, t.requirement_id, te.task_id,
       t.parent_task_id, te.user_id,
       COALESCE(te.phase_id, t.phase_id) AS phase_id,
       t.sprint_id, te.activity, te.period_type, te.period_start,
       te.period_end, te.hours, te.is_rework, te.defect_id
FROM time_entries te
JOIN tasks t ON t.task_id = te.task_id;

-- Five optional performance indexes; primary keys and UNIQUE constraints
-- already receive their own SQLite indexes automatically.
CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_requirement ON tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_defects_requirement ON defects(requirement_id);

COMMIT;
