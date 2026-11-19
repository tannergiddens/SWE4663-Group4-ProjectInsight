import db, { initializeDatabase } from "./db.js";

export function seedDatabase(): void {
  initializeDatabase();

  // 1. Client Details
  const insertClient = db.prepare(`
    INSERT INTO clients (client_id, client_name, contact_title, address_line1, city, country, direct_phone, email)
    VALUES (1, 'Kennesaw State University - SWE 4663', 'Course Instructor', '1100 South Marietta Pkwy', 'Marietta', 'USA', '470-578-6000', 'swe4663@kennesaw.edu')
    ON CONFLICT(client_id) DO NOTHING;
  `);
  insertClient.run();

  // 2. Real Team Members
  const insertUser = db.prepare(`
    INSERT INTO users (user_id, full_name, email, active)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET full_name = excluded.full_name, email = excluded.email;
  `);

  const team = [
    [1, "Tanner Giddens", "tgiddens@students.kennesaw.edu"],
    [2, "Randy Giles", "rgiles@students.kennesaw.edu"],
    [3, "Hermela Gizaw", "hgizaw@students.kennesaw.edu"],
    [4, "Tonya Gates", "tgates@students.kennesaw.edu"],
    [5, "Ethan Gregg", "egregg@students.kennesaw.edu"],
  ];

  for (const member of team) {
    insertUser.run(member[0], member[1], member[2]);
  }

  // 3. Real Project (Project Insight)
  const insertProject = db.prepare(`
    INSERT INTO projects (project_id, client_id, project_manager_id, project_name, description, methodology, status, start_date, target_end_date)
    VALUES (1, 1, 1, 'Project Insight: Software Effort Monitoring & Management System', 'A centralized project management and effort-monitoring web application to track development resource allocation across five key software development lifecycle phases (Requirements Analysis, Designing, Coding, Testing, Project Management) per requirement.', 'Iterative / Agile', 'active', '2026-10-01', '2026-11-22')
    ON CONFLICT(project_id) DO NOTHING;
  `);
  insertProject.run();

  // 4. Dynamic Team Roster Assignment
  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role_name, joined_on)
    VALUES (?, ?, ?, '2026-10-01')
    ON CONFLICT(project_id, user_id) DO NOTHING;
  `);

  const memberRoles = [
    [1, 1, "Project Manager & Full-Stack Lead"],
    [1, 2, "Database & Backend Architect"],
    [1, 3, "Risk Management Lead"],
    [1, 4, "Roster & General Project Lead"],
    [1, 5, "Effort Visualization Lead"],
  ];

  for (const m of memberRoles) {
    insertMember.run(m[0], m[1], m[2]);
  }

  // 5. Authentic Project Requirements (from guidelines and plan)
  const insertReq = db.prepare(`
    INSERT INTO requirements (project_id, requirement_code, requirement_type, title, description, priority, status, estimated_hours)
    VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?)
    ON CONFLICT(project_id, requirement_code) DO NOTHING;
  `);

  const requirementsList = [
    [1, "FR-01", "functional", "Project High-Level Description & PM Assignment", "System allows entering and updating high-level project narrative and the project manager name.", "high", 15],
    [1, "FR-02", "functional", "Dynamic Team Member Roster Management", "System supports adding, updating, and removing team members as project progresses.", "high", 20],
    [1, "FR-03", "functional", "Project Risk Management & Status Register", "System tracks project risks, severity, probability (1-5), impact (1-5), and mitigation plans.", "high", 20],
    [1, "FR-04", "functional", "Functional and Non-Functional Requirements Entry", "System provides a catalog interface to define and classify software requirements under identifier tags.", "high", 20],
    [1, "FR-05", "functional", "Daily and Weekly Person-Hours Effort Logging", "Contributors can log hours expended across the 5 SDLC phases for each earlier entered requirement.", "critical", 35],
    [1, "FR-06", "functional", "Real-Time Cumulative Effort Matrix View", "System calculates and displays total expended hours by phase and requirement in real time.", "critical", 30],
    [1, "NFR-01", "non_functional", "Zero-Dependency Embedded SQLite Database", "Self-contained local relational database embedded within the project directory.", "high", 10],
    [1, "NFR-02", "non_functional", "Sub-Second Query Performance for Effort Aggregation", "Hour aggregations and matrix views compute in under 300ms without full-page reloads.", "medium", 10],
    [1, "NFR-03", "non_functional", "Boundary & Input Data Integrity Validation", "System enforces strict input validation, blocking non-numeric and negative hour values.", "high", 10],
  ];

  for (const r of requirementsList) {
    insertReq.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6]);
  }

  // 6. Real Risks from Comprehensive Project Plan (§ 5.1)
  const insertRisk = db.prepare(`
    INSERT INTO risks (project_id, requirement_id, title, description, probability, impact, status, owner_id, mitigation_plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, title) DO NOTHING;
  `);

  const authenticRisks = [
    [
      1,
      5,
      "Falling behind schedule due to unexpected technical issues or delays during development",
      "Since the project involves multiple features, delays could impact the Nov 22 delivery deadline.",
      3,
      4,
      "in_progress",
      1,
      "Careful time management, regular team check-ins, assistance across features, and regular progress reviews.",
    ],
    [
      1,
      6,
      "Inaccurate time tracking and erroneous reporting",
      "If users enter incorrect hours or select wrong requirements, the system may produce inaccurate reports.",
      2,
      4,
      "open",
      2,
      "Enforce strict input boundary validation, numeric range checks, and unit testing of aggregation algorithms to guarantee 100% calculation precision.",
    ],
    [
      1,
      1,
      "Team communication and module integration misunderstandings",
      "Misunderstandings about responsibilities, integration between components, or deadlines could cause delays.",
      2,
      3,
      "resolved",
      3,
      "Clear modular task assignments, Git feature branching, continuous status communication, and multiple integration tests.",
    ],
  ];

  for (const rk of authenticRisks) {
    insertRisk.run(rk[0], rk[1], rk[2], rk[3], rk[4], rk[5], rk[6], rk[7], rk[8]);
  }

  // 7. Effort Logged across the 5 SDLC Phases
  // Phase 1: Requirements Analysis, Phase 2: Designing, Phase 3: Coding, Phase 4: Testing, Phase 5: Project Management
  const insertTime = db.prepare(`
    INSERT INTO time_entries (project_id, requirement_id, user_id, phase_id, activity, period_type, period_start, period_end, hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialEffort = [
    // FR-01: Project Info & PM (Req ID: 1)
    [1, 1, 1, 1, "Requirements Analysis", "daily", "2026-10-05", "2026-10-05", 4.0, "Drafted initial project description and project manager assignment specifications"],
    [1, 1, 4, 2, "Designing", "daily", "2026-10-08", "2026-10-08", 3.5, "Designed project overview card and layout wireframes"],
    [1, 1, 4, 3, "Coding", "daily", "2026-10-15", "2026-10-15", 6.0, "Implemented project metadata editing and PM assignment form"],
    [1, 1, 1, 5, "Project Management", "weekly", "2026-10-02", "2026-10-09", 2.0, "Initial project kickoff and planning sync"],

    // FR-02: Dynamic Roster (Req ID: 2)
    [1, 2, 4, 1, "Requirements Analysis", "daily", "2026-10-10", "2026-10-10", 3.0, "Analyzed dynamic member role needs"],
    [1, 2, 2, 2, "Designing", "daily", "2026-10-12", "2026-10-12", 4.0, "Designed project_members relational model with left_on timestamp"],
    [1, 2, 4, 3, "Coding", "daily", "2026-10-20", "2026-10-20", 8.0, "Built roster contributor add/remove interface"],
    [1, 2, 4, 4, "Testing", "daily", "2026-10-22", "2026-10-22", 2.5, "Verified roster persistence across reloads"],

    // FR-03: Risk Management (Req ID: 3)
    [1, 3, 3, 1, "Requirements Analysis", "daily", "2026-10-14", "2026-10-14", 5.0, "Defined risk probability and impact matrix scale (1-5)"],
    [1, 3, 3, 2, "Designing", "daily", "2026-10-18", "2026-10-18", 4.0, "Designed risk register table and status workflow"],
    [1, 3, 3, 3, "Coding", "daily", "2026-10-25", "2026-10-25", 9.0, "Implemented risk management API and frontend table"],
    [1, 3, 3, 4, "Testing", "daily", "2026-10-28", "2026-10-28", 3.0, "Verified mitigation plan updates and severity calculations"],

    // FR-04: Requirements Entry (Req ID: 4)
    [1, 4, 1, 1, "Requirements Analysis", "daily", "2026-10-12", "2026-10-12", 6.0, "Classified functional vs non-functional requirements schema"],
    [1, 4, 2, 2, "Designing", "daily", "2026-10-16", "2026-10-16", 5.0, "Designed requirements catalog data structures"],
    [1, 4, 1, 3, "Coding", "daily", "2026-10-24", "2026-10-24", 7.0, "Built requirements creation modal and classification filtering"],

    // FR-05: Effort Logger (Req ID: 5)
    [1, 5, 1, 1, "Requirements Analysis", "daily", "2026-10-18", "2026-10-18", 4.0, "Specified daily vs weekly time entry requirements"],
    [1, 5, 1, 2, "Designing", "daily", "2026-10-21", "2026-10-21", 5.5, "Designed 5-phase breakdown timesheet grid"],
    [1, 5, 1, 3, "Coding", "daily", "2026-11-02", "2026-11-02", 12.0, "Implemented time_entries API and timesheet form"],
    [1, 5, 5, 4, "Testing", "daily", "2026-11-05", "2026-11-05", 4.0, "Validated input mask blocking negative hour values"],
    [1, 5, 1, 5, "Project Management", "weekly", "2026-10-16", "2026-10-23", 3.0, "Sprint progress monitoring and resource review"],

    // FR-06: Effort Matrix View (Req ID: 6)
    [1, 6, 5, 1, "Requirements Analysis", "daily", "2026-10-22", "2026-10-22", 3.0, "Analyzed SQL view aggregation for 5-phase pivot"],
    [1, 6, 2, 2, "Designing", "daily", "2026-10-26", "2026-10-26", 4.5, "Created v_requirement_phase_effort SQL view"],
    [1, 6, 5, 3, "Coding", "daily", "2026-11-08", "2026-11-08", 10.0, "Built lifecycle effort allocation matrix component and CSV export"],
    [1, 6, 5, 4, "Testing", "daily", "2026-11-12", "2026-11-12", 3.5, "Verified mathematical sum totals against database records"],
  ];

  const existingTime = db.prepare("SELECT COUNT(*) AS count FROM time_entries WHERE project_id = 1").get() as { count: number };
  if (existingTime.count === 0) {
    for (const te of initialEffort) {
      insertTime.run(te[0], te[1], te[2], te[3], te[4], te[5], te[6], te[7], te[8], te[9]);
    }
  }

  console.log("Database initialized cleanly with Group 4 data and authentic project plan records.");
}

