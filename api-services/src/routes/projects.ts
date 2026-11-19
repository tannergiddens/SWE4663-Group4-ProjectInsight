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

// Create a new project dynamically
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
    } = req.body;

    if (!project_name || !description) {
      return res.status(400).json({ error: "project_name and description are required" });
    }

    const pmName = (owner_name || project_manager_name || "Project Owner").trim();
    
    // Find or create user for the owner / PM
    let pm = db.prepare("SELECT user_id FROM users WHERE full_name = ? COLLATE NOCASE").get(pmName) as { user_id: number } | undefined;
    if (!pm) {
      const uInfo = db.prepare("INSERT INTO users (full_name, email, active) VALUES (?, ?, 1)").run(
        pmName,
        `${pmName.toLowerCase().replace(/\s+/g, ".")}@projectinsight.io`
      );
      pm = { user_id: Number(uInfo.lastInsertRowid) };
    }

    // Default to client 1 or create generic client
    let client = db.prepare("SELECT client_id FROM clients LIMIT 1").get() as { client_id: number } | undefined;
    let clientId = client?.client_id || 1;

    const info = db.prepare(`
      INSERT INTO projects (
        client_id,
        project_manager_id,
        project_name,
        description,
        methodology,
        status,
        start_date,
        target_end_date
      ) VALUES (?, ?, ?, ?, COALESCE(?, 'Agile / Iterative'), COALESCE(?, 'active'), COALESCE(?, DATE('now')), ?)
    `).run(
      clientId,
      pm.user_id,
      project_name.trim(),
      description.trim(),
      methodology,
      status,
      start_date,
      target_end_date || null
    );

    const projectId = Number(info.lastInsertRowid);

    // Auto-add project manager to project roster
    db.prepare(`
      INSERT INTO project_members (project_id, user_id, role_name, joined_on)
      VALUES (?, ?, 'Project Manager', DATE('now'))
    `).run(projectId, pm.user_id);

    const created = db.prepare(`
      SELECT 
        p.*,
        u.full_name AS project_manager_name,
        0 AS total_hours
      FROM projects p
      LEFT JOIN users u ON p.project_manager_id = u.user_id
      WHERE p.project_id = ?
    `).get(projectId);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
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
