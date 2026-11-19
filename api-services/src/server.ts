import express from "express";
import cors from "cors";
import { initializeDatabase } from "./database/db.js";
import { seedDatabase } from "./database/seed.js";
import projectsRouter from "./routes/projects.js";
import requirementsRouter from "./routes/requirements.js";
import effortRouter from "./routes/effort.js";
import risksRouter from "./routes/risks.js";
import usersRouter from "./routes/users.js";

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize and seed database
initializeDatabase();
seedDatabase();

// Route mounting
app.use("/api/projects", projectsRouter);
app.use("/api/requirements", requirementsRouter);
app.use("/api/effort", effortRouter);
app.use("/api/risks", risksRouter);
app.use("/api/users", usersRouter);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Project Insight (ManagePro) API is running",
    timestamp: new Date().toISOString(),
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`Project Insight API running on http://localhost:${PORT}`);
});

export default app;
