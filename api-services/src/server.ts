import express from "express";
import cors from "cors";
import { initializeDatabase } from "./database/db.js";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
initializeDatabase();

// Test endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "ManagePro API is running"
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`ManagePro API running on port ${PORT}`);
});