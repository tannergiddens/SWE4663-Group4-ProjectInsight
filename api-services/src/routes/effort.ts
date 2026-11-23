import { Router } from "express";
import db from "../database/db.js";

const router = Router();

interface RequirementProjectRow {
  project_id: number;
}

interface EffortMatrixRow {
  requirements_analysis_hours: number;
  designing_hours: number;
  coding_hours: number;
  testing_hours: number;
  project_management_hours: number;
  total_expended_hours: number;
}

interface EffortTotals {
  requirements_analysis_hours: number;
  designing_hours: number;
  coding_hours: number;
  testing_hours: number;
  project_management_hours: number;
  total_expended_hours: number;
}

interface TotalHoursRow {
  total_hours: number;
}

interface RequirementsCountRow {
  total_count: number;
  functional_count: number;
  non_functional_count: number;
  total_estimated_hours: number;
}

// Get the 5 official course SDLC phases
router.get("/phases", (_req, res) => {
  try {
    const phases = db.prepare("SELECT * FROM sdlc_phases ORDER BY sequence_no ASC").all();
    res.json(phases);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Section C.1: Log effort on a daily or weekly basis
router.post("/log", (req, res) => {
  try {
    const {
      project_id,
      requirement_id,
      user_id,
      user_name,
      contributor_name,
      phase_id,
      phase_hours,
      activity,
      period_type,
      period_start,
      period_end,
      hours,
      notes,
    } = req.body;

    if (!requirement_id) {
      return res.status(400).json({ error: "requirement_id is required" });
    }

    // Resolve user ID
    let resolvedUserId = user_id;
    const name = contributor_name || user_name;
    if (!resolvedUserId && name) {
      let u = db.prepare("SELECT user_id FROM users WHERE full_name = ? COLLATE NOCASE").get(name.trim()) as { user_id: number } | undefined;
      if (!u) {
        const uInfo = db.prepare("INSERT INTO users (full_name, email, active) VALUES (?, ?, 1)").run(
          name.trim(),
          `${name.trim().toLowerCase().replace(/\s+/g, ".")}@projectinsight.io`
        );
        u = { user_id: Number(uInfo.lastInsertRowid) };
      }
      resolvedUserId = u.user_id;
    }

    if (!resolvedUserId) {
      // Default to first user or create guest contributor
      const firstUser = db.prepare("SELECT user_id FROM users LIMIT 1").get() as { user_id: number } | undefined;
      resolvedUserId = firstUser?.user_id || 1;
    }

    const periodType = period_type === "weekly" ? "weekly" : "daily";
    const startDate = period_start || new Date().toISOString().split("T")[0];
    const endDate = period_end || startDate;

    // Retrieve project_id from requirement if not supplied
    let projId = project_id;
    if (!projId) {
      const reqRecord = db.prepare("SELECT project_id FROM requirements WHERE requirement_id = ?").get(requirement_id) as RequirementProjectRow | undefined;
      projId = reqRecord?.project_id || 1;
    }

    const insertStmt = db.prepare(`
      INSERT INTO time_entries (
        project_id,
        requirement_id,
        user_id,
        phase_id,
        activity,
        period_type,
        period_start,
        period_end,
        hours,
        notes
      ) VALUES (?, ?, ?, ?, COALESCE(?, 'Development'), ?, ?, ?, ?, ?)
    `);

    // Case 1: Multi-phase breakdown submitted (e.g. { "1": 4, "2": 3, "3": 8 })
    if (phase_hours && typeof phase_hours === "object") {
      const createdEntries: number[] = [];
      for (const [pId, hrs] of Object.entries(phase_hours)) {
        const numericHours = Number(hrs);
        if (numericHours > 0) {
          const info = insertStmt.run(
            projId,
            requirement_id,
            resolvedUserId,
            Number(pId),
            activity,
            periodType,
            startDate,
            endDate,
            numericHours,
            notes
          );
          createdEntries.push(Number(info.lastInsertRowid));
        }
      }

      if (createdEntries.length === 0) {
        return res.status(400).json({ error: "At least one phase must have hours greater than 0" });
      }

      return res.status(201).json({ message: "Effort entries recorded successfully", count: createdEntries.length });
    }

    // Case 2: Single phase submission
    if (!phase_id || !hours || Number(hours) <= 0) {
      return res.status(400).json({ error: "phase_id and hours (> 0) are required" });
    }

    const info = insertStmt.run(
      projId,
      requirement_id,
      resolvedUserId,
      phase_id,
      activity,
      periodType,
      startDate,
      endDate,
      Number(hours),
      notes
    );

    const logged = db.prepare(`
      SELECT 
        te.*,
        u.full_name AS user_name,
        p.phase_name,
        r.requirement_code,
        r.title AS requirement_title
      FROM time_entries te
      JOIN users u ON u.user_id = te.user_id
      JOIN sdlc_phases p ON p.phase_id = te.phase_id
      JOIN requirements r ON r.requirement_id = te.requirement_id
      WHERE te.entry_id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(logged);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// List raw time entries (with filtering)
router.get("/entries", (req, res) => {
  try {
    const { project_id, requirement_id, user_id, phase_id } = req.query;
    let sql = `
      SELECT 
        te.*,
        u.full_name AS user_name,
        p.phase_name,
        r.requirement_code,
        r.title AS requirement_title
      FROM time_entries te
      JOIN users u ON u.user_id = te.user_id
      JOIN sdlc_phases p ON p.phase_id = te.phase_id
      JOIN requirements r ON r.requirement_id = te.requirement_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (project_id) {
      sql += " AND te.project_id = ?";
      params.push(project_id);
    }
    if (requirement_id) {
      sql += " AND te.requirement_id = ?";
      params.push(requirement_id);
    }
    if (user_id) {
      sql += " AND te.user_id = ?";
      params.push(user_id);
    }
    if (phase_id) {
      sql += " AND te.phase_id = ?";
      params.push(phase_id);
    }

    sql += " ORDER BY te.period_start DESC, te.entry_id DESC LIMIT 100";

    const entries = db.prepare(sql).all(...params);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Section C.2: Aggregated hours matrix by requirement and the 5 SDLC phases
router.get("/matrix/:projectId", (req, res) => {
  try {
    const matrix = db.prepare(`
      SELECT *
      FROM v_requirement_phase_effort
      WHERE project_id = ?
      ORDER BY requirement_type ASC, requirement_code ASC
    `).all(req.params.projectId) as EffortMatrixRow[];

    // Compute column totals for each phase across the entire project
    const totals = matrix.reduce(
      (acc: EffortTotals, row: EffortMatrixRow) => {
        acc.requirements_analysis_hours += row.requirements_analysis_hours;
        acc.designing_hours += row.designing_hours;
        acc.coding_hours += row.coding_hours;
        acc.testing_hours += row.testing_hours;
        acc.project_management_hours += row.project_management_hours;
        acc.total_expended_hours += row.total_expended_hours;
        return acc;
      },
      {
        requirements_analysis_hours: 0,
        designing_hours: 0,
        coding_hours: 0,
        testing_hours: 0,
        project_management_hours: 0,
        total_expended_hours: 0,
      } satisfies EffortTotals
    );

    res.json({
      project_id: Number(req.params.projectId),
      requirements: matrix,
      phase_totals: totals,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Summary stats by phase for charts and high-level progress
router.get("/summary/:projectId", (req, res) => {
  try {
    const phaseSummary = db.prepare(`
      SELECT 
        p.phase_id,
        p.phase_name,
        p.sequence_no,
        COALESCE(SUM(te.hours), 0) AS total_hours
      FROM sdlc_phases p
      LEFT JOIN time_entries te ON te.phase_id = p.phase_id AND te.project_id = ?
      GROUP BY p.phase_id, p.phase_name, p.sequence_no
      ORDER BY p.sequence_no ASC
    `).all(req.params.projectId);

    const totalHoursResult = db.prepare(`
      SELECT COALESCE(SUM(hours), 0) AS total_hours
      FROM time_entries
      WHERE project_id = ?
    `).get(req.params.projectId) as TotalHoursRow | undefined;

    const requirementsCount = db.prepare(`
      SELECT 
        COUNT(*) AS total_count,
        SUM(CASE WHEN requirement_type = 'functional' THEN 1 ELSE 0 END) AS functional_count,
        SUM(CASE WHEN requirement_type = 'non_functional' THEN 1 ELSE 0 END) AS non_functional_count,
        COALESCE(SUM(estimated_hours), 0) AS total_estimated_hours
      FROM requirements
      WHERE project_id = ?
    `).get(req.params.projectId) as RequirementsCountRow | undefined;

    res.json({
      phases: phaseSummary,
      total_hours: totalHoursResult?.total_hours || 0,
      requirements_stats: requirementsCount,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
