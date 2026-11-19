import { Router } from "express";
import db from "../database/db.js";

const router = Router();

// Get all active users
router.get("/", (_req, res) => {
  try {
    const users = db.prepare("SELECT * FROM users WHERE active = 1 ORDER BY full_name ASC").all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Create new user
router.post("/", (req, res) => {
  try {
    const { full_name, email } = req.body;
    if (!full_name) {
      return res.status(400).json({ error: "full_name is required" });
    }

    const info = db.prepare("INSERT INTO users (full_name, email, active) VALUES (?, ?, 1)").run(full_name, email || null);
    const user = db.prepare("SELECT * FROM users WHERE user_id = ?").get(info.lastInsertRowid);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
