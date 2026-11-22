import { Router } from "express";
import db from "../database/db.js";

const router = Router();

// Get risks for a project (Section A.4 - Hermela's module)
router.get("/project/:projectId", (req, res) => {
  try {
    const risks = db.prepare(`
      SELECT 
        r.*,
        u.full_name AS owner_name,
        req.requirement_code,
        req.title AS requirement_title
      FROM risks r
      LEFT JOIN users u ON r.owner_id = u.user_id
      LEFT JOIN requirements req ON r.requirement_id = req.requirement_id
      WHERE r.project_id = ?
      ORDER BY r.impact * r.probability DESC, r.risk_id ASC
    `).all(req.params.projectId);

    res.json(risks);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create new risk
router.post("/project/:projectId", (req, res) => {
  try {
    const { requirement_id, title, description, probability, impact, status, owner_id, mitigation_plan } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: "title and description are required" });
    }

    
  if (
  (probability != null &&
    (!Number.isInteger(probability) || probability < 1 || probability > 5)) ||
  (impact != null &&
    (!Number.isInteger(impact) || impact < 1 || impact > 5))
  ) {
  return res.status(400).json({
    error: "Probability and impact must be whole numbers between 1 and 5"
  });
  }


    const info = db.prepare(`
      INSERT INTO risks (
        project_id,
        requirement_id,
        title,
        description,
        probability,
        impact,
        status,
        owner_id,
        mitigation_plan
      ) VALUES (?, ?, ?, ?, COALESCE(?, 3), COALESCE(?, 3), COALESCE(?, 'open'), ?, ?)
    `).run(
      req.params.projectId,
      requirement_id || null,
      title,
      description,
      probability,
      impact,
      status,
      owner_id || null,
      mitigation_plan || null
    );

    const created = db.prepare(`
      SELECT r.*, u.full_name AS owner_name
      FROM risks r
      LEFT JOIN users u ON r.owner_id = u.user_id
      WHERE r.risk_id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Update risk status or details
router.put("/:id", (req, res) => {
  try {
    const { title, description, probability, impact, status, owner_id, mitigation_plan } = req.body;
    
  if (
  (probability != null &&
    (!Number.isInteger(probability) || probability < 1 || probability > 5)) ||
  (impact != null &&
    (!Number.isInteger(impact) || impact < 1 || impact > 5))
  ) {
  return res.status(400).json({
    error: "Probability and impact must be whole numbers between 1 and 5"
  });
  }

    db.prepare(`
      UPDATE risks
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        probability = COALESCE(?, probability),
        impact = COALESCE(?, impact),
        status = COALESCE(?, status),
        owner_id = COALESCE(?, owner_id),
        mitigation_plan = COALESCE(?, mitigation_plan)
      WHERE risk_id = ?
    `).run(title, description, probability, impact, status, owner_id, mitigation_plan, req.params.id);

    const updated = db.prepare(`
      SELECT r.*, u.full_name AS owner_name
      FROM risks r
      LEFT JOIN users u ON r.owner_id = u.user_id
      WHERE r.risk_id = ?
    `).get(req.params.id);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Delete risk
router.delete("/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM risks WHERE risk_id = ?").run(req.params.id);
    res.json({ message: "Risk deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
