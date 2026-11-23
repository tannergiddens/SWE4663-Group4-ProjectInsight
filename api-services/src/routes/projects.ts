import { Router } from "express";
import db from "../database/db.js";

const router = Router();

// Get all projects with accumulated hours
router.get("/", (_req, res) => {
  try {
    const projects = db.prepare(`
      SELECT 
        p.*,
        u.full_name AS project_manager_name,
        c.client_name,
        COALESCE(vh.accumulated_hours, 0) AS total_hours
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.user_id
      LEFT JOIN clients c ON p.client_id = c.client_id
      LEFT JOIN v_project_hours vh ON vh.project_id = p.project_id
      ORDER BY p.project_id ASC
    `).all();

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


/**
 * Create a project for an existing or new client.
 * All database writes are performed in one transaction.
 */
router.post("/", (req, res) => {
  try {
    const {
      project_name,
      description,
      owner_name,
      project_manager_name,
      methodology,
      status,
      start_date,
      target_end_date,
      client_id,
      client,
    } = req.body ?? {};

    // Validate project information.
    if (
      typeof project_name !== "string" ||
      !project_name.trim() ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      res.status(400).json({
        error: "project_name and description are required",
      });
      return;
    }

    // A request must specify exactly one client mode.
    const hasNewClient = client != null;
    const hasExistingClient = client_id != null;

    if (hasNewClient === hasExistingClient) {
      res.status(400).json({
        error: "Specify either client_id or client, but not both",
      });
      return;
    }

    // Validate new-client fields before starting the transaction.
    const requiredClientFields = [
      "client_name",
      "address_line1",
      "city",
      "country",
      "direct_phone",
    ] as const;

    const optionalClientFields = [
      "contact_title",
      "address_line2",
      "state_region",
      "postal_code",
      "mobile_phone",
      "email",
    ] as const;

    if (hasNewClient) {
      if (typeof client !== "object" || Array.isArray(client)) {
        res.status(400).json({
          error: "Invalid client information",
        });
        return;
      }

      const invalidRequiredField = requiredClientFields.find(
        field =>
          typeof client[field] !== "string" ||
          !client[field].trim()
      );

      if (invalidRequiredField) {
        res.status(400).json({
          error: `Missing or invalid client field: ${invalidRequiredField}`,
        });
        return;
      }

      const invalidOptionalField = optionalClientFields.find(
        field =>
          client[field] != null &&
          typeof client[field] !== "string"
      );

      if (invalidOptionalField) {
        res.status(400).json({
          error: `Invalid client field: ${invalidOptionalField}`,
        });
        return;
      }
    }

    if (
      hasExistingClient &&
      (!Number.isSafeInteger(client_id) || client_id <= 0)
    ) {
      res.status(400).json({
        error: "A valid client_id is required",
      });
      return;
    }

    if (hasExistingClient) {
      const existing = db.prepare(`
        SELECT client_id
        FROM clients
        WHERE client_id = ?
      `).get(client_id);

      if (!existing) {
        res.status(404).json({
          error: "Selected client does not exist",
        });
        return;
      }
    }

    // Preserve the existing Project Manager naming behavior.
    const pmName =
      typeof owner_name === "string" && owner_name.trim()
        ? owner_name.trim()
        : typeof project_manager_name === "string" &&
            project_manager_name.trim()
          ? project_manager_name.trim()
          : "Project Manager";

    const optionalText = (value: unknown): string | null =>
      typeof value === "string" && value.trim()
        ? value.trim()
        : null;

    // All inserts must succeed together.
    const createProjectTransaction = db.transaction(() => {
      let resolvedClientId: number;

      // ----------------------------------------
      // 1. Resolve client
      // ----------------------------------------

      if (hasNewClient) {
        const result = db.prepare(`
          INSERT INTO clients (
            client_name,
            contact_title,
            address_line1,
            address_line2,
            city,
            state_region,
            postal_code,
            country,
            direct_phone,
            mobile_phone,
            email
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          client.client_name.trim(),
          optionalText(client.contact_title),
          client.address_line1.trim(),
          optionalText(client.address_line2),
          client.city.trim(),
          optionalText(client.state_region),
          optionalText(client.postal_code),
          client.country.trim(),
          client.direct_phone.trim(),
          optionalText(client.mobile_phone),
          optionalText(client.email)
        );

        resolvedClientId = Number(result.lastInsertRowid);

      } else {
        // Reuse the already validated existing client.
        resolvedClientId = client_id as number;
      }

      // ----------------------------------------
      // 2. Find or create Project Manager
      // ----------------------------------------

      let pm = db.prepare(`
        SELECT user_id
        FROM users
        WHERE full_name = ? COLLATE NOCASE
      `).get(pmName) as { user_id: number } | undefined;

      if (!pm) {
        const userInfo = db.prepare(`
          INSERT INTO users (
            full_name,
            email,
            active
          )
          VALUES (?, ?, 1)
        `).run(
          pmName,
          `${pmName.toLowerCase().replace(/\s+/g, ".")}@projectinsight.io`
        );

        pm = {
          user_id: Number(userInfo.lastInsertRowid),
        };
      }

      // ----------------------------------------
      // 3. Create project
      // ----------------------------------------

      const projectInfo = db.prepare(`
        INSERT INTO projects (
          client_id,
          project_manager_id,
          project_name,
          description,
          methodology,
          status,
          start_date,
          target_end_date
        )
        VALUES (
          ?, ?, ?, ?,
          COALESCE(?, 'Agile / Iterative'),
          COALESCE(?, 'active'),
          COALESCE(?, DATE('now')),
          ?
        )
      `).run(
        resolvedClientId,
        pm.user_id,
        project_name.trim(),
        description.trim(),
        optionalText(methodology),
        optionalText(status),
        optionalText(start_date),
        optionalText(target_end_date)
      );

      const projectId = Number(projectInfo.lastInsertRowid);

      // ----------------------------------------
      // 4. Add Project Manager to roster
      // ----------------------------------------

      db.prepare(`
        INSERT INTO project_members (
          project_id,
          user_id,
          role_name,
          joined_on
        )
        VALUES (?, ?, 'Project Manager', DATE('now'))
      `).run(projectId, pm.user_id);

      // ----------------------------------------
      // 5. Return the completed project
      // ----------------------------------------

      const created = db.prepare(`
        SELECT
          p.*,
          u.full_name AS project_manager_name,
          c.client_name,
          0 AS total_hours
        FROM projects p
        LEFT JOIN users u
          ON p.project_manager_id = u.user_id
        LEFT JOIN clients c
          ON p.client_id = c.client_id
        WHERE p.project_id = ?
      `).get(projectId);

      if (!created) {
        throw new Error("Unable to retrieve created project");
      }

      return created;
    });

    const created = createProjectTransaction();

    res.status(201).json(created);

  } catch (error) {
    console.error("Project creation failed:", error);

    res.status(500).json({
      error: "Unable to create project",
    });
  }
});


// Get a single project
router.get("/:id", (req, res) => {
  try {
    const project = db.prepare(`
      SELECT 
        p.*,
        u.full_name AS project_manager_name,
        c.client_name,
        COALESCE(vh.accumulated_hours, 0) AS total_hours
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.user_id
      LEFT JOIN clients c ON p.client_id = c.client_id
      LEFT JOIN v_project_hours vh ON vh.project_id = p.project_id
      WHERE p.project_id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update project high-level info & PM (Section A.1, A.2)
router.put("/:id", (req, res) => {
  try {
    const {
      project_name,
      description,
      project_manager_id,
      owner_name,
      project_manager_name,
      status,
      methodology,
      start_date,
      target_end_date,
    } = req.body;

    let pmId = project_manager_id;
    const pmText = owner_name || project_manager_name;
    if (pmText && typeof pmText === "string") {
      let pm = db.prepare("SELECT user_id FROM users WHERE full_name = ? COLLATE NOCASE").get(pmText.trim()) as { user_id: number } | undefined;
      if (!pm) {
        const uInfo = db.prepare("INSERT INTO users (full_name, email, active) VALUES (?, ?, 1)").run(
          pmText.trim(),
          `${pmText.trim().toLowerCase().replace(/\s+/g, ".")}@projectinsight.io`
        );
        pm = { user_id: Number(uInfo.lastInsertRowid) };
      }
      pmId = pm.user_id;
    }

    db.prepare(`
      UPDATE projects
      SET 
        project_name = COALESCE(?, project_name),
        description = COALESCE(?, description),
        project_manager_id = COALESCE(?, project_manager_id),
        methodology = COALESCE(?, methodology),
        status = COALESCE(?, status),
        start_date = COALESCE(?, start_date),
        target_end_date = COALESCE(?, target_end_date)
      WHERE project_id = ?
    `).run(project_name, description, pmId, methodology, status, start_date, target_end_date, req.params.id);

    const updated = db.prepare(`
      SELECT 
        p.*,
        u.full_name AS project_manager_name,
        COALESCE(vh.accumulated_hours, 0) AS total_hours
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.user_id
      LEFT JOIN v_project_hours vh ON vh.project_id = p.project_id
      WHERE p.project_id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete project and all associated records
router.delete("/:id", (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isSafeInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "Invalid project ID" });
  }

  try {
    const project = db.prepare("SELECT * FROM projects WHERE project_id = ?").get(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const deleteTx = db.transaction(() => {
      // 1. Task assignments
      db.prepare(`
        DELETE FROM task_assignments 
        WHERE task_id IN (SELECT task_id FROM tasks WHERE project_id = ?)
      `).run(projectId);

      // 2. Time entries
      db.prepare(`
        DELETE FROM time_entries 
        WHERE project_id = ? OR requirement_id IN (SELECT requirement_id FROM requirements WHERE project_id = ?)
      `).run(projectId, projectId);

      // 3. Defects
      db.prepare(`DELETE FROM defects WHERE project_id = ?`).run(projectId);

      // 4. Client acceptance
      db.prepare(`DELETE FROM client_acceptance WHERE project_id = ?`).run(projectId);

      // 5. Requirement baselines
      db.prepare(`
        DELETE FROM requirement_baselines 
        WHERE requirement_id IN (SELECT requirement_id FROM requirements WHERE project_id = ?)
      `).run(projectId);

      // 6. Risks
      db.prepare(`DELETE FROM risks WHERE project_id = ?`).run(projectId);

      // 7. Tasks
      db.prepare(`DELETE FROM tasks WHERE project_id = ?`).run(projectId);

      // 8. Requirements
      db.prepare(`DELETE FROM requirements WHERE project_id = ?`).run(projectId);

      // 9. Sprints
      db.prepare(`DELETE FROM sprints WHERE project_id = ?`).run(projectId);

      // 10. Project phases
      db.prepare(`DELETE FROM project_phases WHERE project_id = ?`).run(projectId);

      // 11. Project members
      db.prepare(`DELETE FROM project_members WHERE project_id = ?`).run(projectId);

      // 12. Finally, delete project
      db.prepare(`DELETE FROM projects WHERE project_id = ?`).run(projectId);
    });

    deleteTx();

    res.json({ message: "Project deleted successfully", project_id: projectId });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get dynamic project team members (Section A.3)
router.get("/:id/members", (req, res) => {
  try {
    const members = db.prepare(`
      SELECT 
        pm.member_id,
        pm.project_id,
        pm.user_id,
        pm.role_name,
        pm.joined_on,
        pm.left_on,
        u.full_name,
        u.email,
        u.active
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.project_id = ? AND pm.left_on IS NULL
      ORDER BY pm.member_id ASC
    `).all(req.params.id);

    res.json(members);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add member to project roster (Section A.3 - accepts existing user_id OR any new name string)
router.post("/:id/members", (req, res) => {
  try {
    const { user_id, full_name, email, role_name, joined_on } = req.body;
    if ((!user_id && !full_name) || !role_name) {
      return res.status(400).json({ error: "full_name (or user_id) and role_name are required" });
    }

    let resolvedUserId = user_id;

    if (!resolvedUserId && full_name) {
      const name = full_name.trim();
      let user = db.prepare("SELECT user_id FROM users WHERE full_name = ? COLLATE NOCASE").get(name) as { user_id: number } | undefined;
      if (!user) {
        const uEmail = email || `${name.toLowerCase().replace(/\s+/g, ".")}@projectinsight.io`;
        const uInfo = db.prepare("INSERT INTO users (full_name, email, active) VALUES (?, ?, 1)").run(name, uEmail);
        user = { user_id: Number(uInfo.lastInsertRowid) };
      }
      resolvedUserId = user.user_id;
    }

    const info = db.prepare(`
      INSERT INTO project_members (project_id, user_id, role_name, joined_on)
      VALUES (?, ?, ?, COALESCE(?, DATE('now')))
    `).run(req.params.id, resolvedUserId, role_name.trim(), joined_on);

    const created = db.prepare(`
      SELECT pm.*, u.full_name, u.email
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.member_id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Remove / mark member as left project roster (Section A.3)
router.delete("/:id/members/:memberId", (req, res) => {
  try {
    db.prepare(`
      UPDATE project_members
      SET left_on = DATE('now')
      WHERE project_id = ? AND member_id = ?
    `).run(req.params.id, req.params.memberId);

    res.json({ message: "Team member removed from active roster" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
