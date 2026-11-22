import { Router } from "express";
import db from "../database/db.js";

const router = Router();

// Get requirements for a project (Section B.1)
router.get("/project/:projectId", (req, res) => {
  try {
    const { type } = req.query;
    let sql = `
      SELECT 
        r.*,
        COALESCE(pe.total_expended_hours, 0) AS total_expended_hours,
        COALESCE(pe.requirements_analysis_hours, 0) AS requirements_analysis_hours,
        COALESCE(pe.designing_hours, 0) AS designing_hours,
        COALESCE(pe.coding_hours, 0) AS coding_hours,
        COALESCE(pe.testing_hours, 0) AS testing_hours,
        COALESCE(pe.project_management_hours, 0) AS project_management_hours
      FROM requirements r
      LEFT JOIN v_requirement_phase_effort pe ON pe.requirement_id = r.requirement_id
      WHERE r.project_id = ?
    `;
    const params: unknown[] = [req.params.projectId];

    if (type && (type === "functional" || type === "non_functional")) {
      sql += " AND r.requirement_type = ?";
      params.push(type);
    }

    sql += " ORDER BY r.requirement_type ASC, r.requirement_code ASC";

    const requirements = db.prepare(sql).all(...params);
    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create new functional or non-functional requirement (Section B.1)
router.post("/project/:projectId", (req, res) => {
  try {
    const { requirement_code, requirement_type, title, description, priority, estimated_hours } = req.body;

    if (!requirement_code || !requirement_type || !title || !description) {
      return res.status(400).json({
        error: "requirement_code, requirement_type ('functional' | 'non_functional'), title, and description are required",
      });
    }

    if (!["functional", "non_functional"].includes(requirement_type)) {
      return res.status(400).json({ error: "requirement_type must be 'functional' or 'non_functional'" });
    }

    const info = db.prepare(`
      INSERT INTO requirements (
        project_id,
        requirement_code,
        requirement_type,
        title,
        description,
        priority,
        estimated_hours
      ) VALUES (?, ?, ?, ?, ?, COALESCE(?, 'medium'), COALESCE(?, 0))
    `).run(
      req.params.projectId,
      requirement_code,
      requirement_type,
      title,
      description,
      priority,
      estimated_hours
    );

    const created = db.prepare("SELECT * FROM requirements WHERE requirement_id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update requirement
router.put("/:id", (req, res) => {
  try {
    const { requirement_code, requirement_type, title, description, priority, status, estimated_hours } = req.body;

    db.prepare(`
      UPDATE requirements
      SET
        requirement_code = COALESCE(?, requirement_code),
        requirement_type = COALESCE(?, requirement_type),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        estimated_hours = COALESCE(?, estimated_hours)
      WHERE requirement_id = ?
    `).run(requirement_code, requirement_type, title, description, priority, status, estimated_hours, req.params.id);

    const updated = db.prepare("SELECT * FROM requirements WHERE requirement_id = ?").get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete requirement
router.delete("/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM requirements WHERE requirement_id = ?").run(req.params.id);
    res.json({ message: "Requirement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
