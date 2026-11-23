import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { seedDatabase } from "./database/seed.js";
import projectsRouter from "./routes/projects.js";
import requirementsRouter from "./routes/requirements.js";
import tasksRouter from "./routes/tasksRoutes.js";
import effortRouter from "./routes/effort.js";
import risksRouter from "./routes/risks.js";
import usersRouter from "./routes/users.js";
import { createClientRoutes } from "./routes/clientRoutes.js";
import db from "./database/db.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize and seed database
seedDatabase();

// Route mounting
app.use("/api/projects", projectsRouter);
app.use("/api/requirements", requirementsRouter);
app.use("/api", tasksRouter);
app.use("/api/effort", effortRouter);
app.use("/api/risks", risksRouter);
app.use("/api/users", usersRouter);
app.use("/api", createClientRoutes(db));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Project Insight (ManagePro) API is running",
    timestamp: new Date().toISOString(),
  });
});

// Serve compiled React frontend if present
let clientDistPath = path.resolve(import.meta.dirname, "../../dist");
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(process.cwd(), "dist");
}
if (!fs.existsSync(clientDistPath)) {
  clientDistPath = path.resolve(process.cwd(), "../dist");
}

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Client-side SPA routing fallback (works across Express 4 and Express 5)
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(clientDistPath, "index.html"));
    }
    next();
  });
}

function openBrowser(url: string) {
  const start =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(start, () => {
    // Silently ignore if running headless or background
  });
}

// Start Express server
app.listen(PORT, () => {
  console.log(`Project Insight running on http://localhost:${PORT}`);
  if (process.env.NO_OPEN !== "true") {
    openBrowser(`http://localhost:${PORT}`);
  }
});

export default app;
