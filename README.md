# Project Insight: Software Effort Monitoring & Management System

**Course:** SWE 4663 – Software Project Management  
**Group:** Group #4  
**Instructor:** Prof. Mona Chavoshi  
**Final Deliverable (Deliverable #3):** Due November 22, 2026  
**Team Members:** Tanner Giddens, Randy Giles, Hermela Gizaw, Tonya Gates, Ethan Gregg  

---

## 1. Project Overview
Project Insight is a centralized project management and effort-monitoring web application developed in accordance with the SWE 4663 Term Project Guidelines.

The system addresses the operational need to track and monitor development resource expenditure across the software lifecycle. Specifically, it enables team managers and contributors to:
1. Maintain high-level project metadata, project manager assignment, and dynamic team rosters (**Section A.1–A.3**).
2. Track project risks, risk statuses, probabilities, impacts, and mitigation plans (**Section A.4** — Lead: Hermela Gizaw).
3. Record and categorize both **Functional** and **Non-Functional** requirements (**Section B.1**).
4. Log person-hours expended on a **daily or weekly basis** across the five course-mandated SDLC phases (**Section C.1**):
   - **Phase 1:** Requirements Analysis
   - **Phase 2:** Designing
   - **Phase 3:** Coding
   - **Phase 4:** Testing
   - **Phase 5:** Project Management
5. Visualize the aggregated effort in a real-time matrix displaying total expended hours by phase for each requirement (**Section C.2**).

---

## 2. Team Member Work Breakdown

| Member | Primary Role | Specification Section Owned | Core Deliverables |
| :--- | :--- | :--- | :--- |
| **Tanner Giddens** | Full-Stack Lead / Project Manager | **Section B & Section C.1** | Requirements management engine, daily/weekly effort logging API, end-to-end integration |
| **Randy Giles** | Database & Backend Architect | **Data Architecture & API Scaffold** | SQLite schema (`better-sqlite3`), WAL configuration, aggregation SQL views, Express foundation | Added and integrated a client repository as for standard client data retrieval | Create & Integrate the Client detail Retrieval in the Header | Improve handleCreateProject to persist details if the submission fails, while clearing fields on successful submission | Creation of new Client ID's with the creation of each new project | Creation of 6 test cases |
| **Hermela Gizaw** | Risk Management Lead | **Section A.4** | Risk register, risk probability/impact scoring (1–5), status tracking, mitigation plans |
| **Tonya Gates** | Project Metadata & Roster Lead | **Section A.1, A.2, A.3** | Project overview, PM assignment, dynamic team roster management (add/remove active members) |
| **Ethan Gregg** | Visualization & Dashboard Lead | **Section C.2** | Cumulative phase matrix view, summary metrics cards, effort percentage breakdowns |

---

## 3. Technology Stack
- **Frontend:** React 19, TypeScript, Vite, CSS Grid/Flexbox
- **Backend:** Node.js (ESM), Express 5, TypeScript (`tsx` runtime)
- **Database:** SQLite (`better-sqlite3`) with foreign key enforcement (`PRAGMA foreign_keys = ON`), WAL mode concurrency, and SQL views for automatic effort aggregation (`v_requirement_phase_effort`, `v_project_hours`).

---

## 4. Getting Started

### Prerequisites
- Node.js (v20+ recommended, tested on v24)
- npm (v10+)

### Quick Start (Two Terminals)

#### Terminal 1: Backend API Service
```bash
# Navigate to the backend folder and start the API
cd api-services
npm run dev
```
*The API service runs on `http://localhost:3001` with auto-reload and automatically initializes and seeds the SQLite database (`data/managepro.db`).*

#### Terminal 2: React Frontend Client
```bash
# In the root repository directory
npm run dev
```
*The React UI runs on `http://localhost:5173` and proxies all `/api` requests to `http://localhost:3001`.*

---

## 5. System Architecture & Endpoints

### REST API Endpoints
- **Projects & Team Roster (Section A):**
  - `GET /api/projects`: List all projects with cumulative total hours
  - `GET /api/projects/:id`: Get project details
  - `PUT /api/projects/:id`: Update description, PM name, and status
  - `GET /api/projects/:id/members`: List dynamic team members
  - `POST /api/projects/:id/members`: Add member to active roster
  - `DELETE /api/projects/:id/members/:memberId`: Remove member from roster
  - `GET /api/users`: List registered users

- **Requirements (Section B):**
  - `GET /api/requirements/project/:projectId`: List all requirements (supports `?type=functional|non_functional`)
  - `POST /api/requirements/project/:projectId`: Add new requirement
  - `PUT /api/requirements/:id`: Update requirement
  - `DELETE /api/requirements/:id`: Delete requirement

- **Effort Monitoring & Tracking (Section C):**
  - `GET /api/effort/phases`: List the 5 official course SDLC phases
  - `POST /api/effort/log`: Log expended person-hours (daily or weekly) tagged by requirement, contributor, and SDLC phase
  - `GET /api/effort/entries`: Audit log of recorded effort entries
  - `GET /api/effort/matrix/:projectId`: Returns cumulative hours by phase per requirement (backed by `v_requirement_phase_effort`)
  - `GET /api/effort/summary/:projectId`: High-level metrics for dashboard cards

- **Risk Management (Section A.4 — Hermela):**
  - `GET /api/risks/project/:projectId`: List risks with owner, score, and status
  - `POST /api/risks/project/:projectId`: Record new risk
  - `PUT /api/risks/:id`: Update risk status, probability, impact, or mitigation plan
  - `DELETE /api/risks/:id`: Delete risk

---

## 6. Repository Layout
```text
.
├── api-services/                # Express & SQLite Backend
│   ├── data/                    # SQLite database file (managepro.db)
│   ├── src/
│   │   ├── database/            # schema.sql, db.ts, seed.ts
│   │   ├── routes/              # Express route modules (projects, requirements, effort, risks, users)
│   │   └── server.ts            # Express server entry point
│   ├── package.json             # Backend dependencies and scripts
│   └── tsconfig.json            # NodeNext TypeScript configuration
├── public/                      # Static assets and icons
├── src/                         # React Frontend
│   ├── components/
│   │   ├── Header.tsx           # App header, project status, and tab navigation
│   │   ├── EffortMatrix.tsx     # Section C.2: 5-Phase Cumulative Effort Matrix
│   │   ├── EffortLogger.tsx     # Section C.1: Daily/Weekly Effort Logging Form
│   │   ├── RequirementsView.tsx # Section B.1: Functional & Non-Functional Requirements
│   │   ├── ProjectOverview.tsx  # Section A.1-A.3: Project Info & Team Roster
│   │   └── RiskManagement.tsx   # Section A.4: Risk Management & Status Register (Hermela)
│   ├── api.ts                   # Frontend API client
│   ├── types.ts                 # TypeScript interfaces
│   ├── App.tsx                  # Main layout and tab orchestrator
│   ├── App.css                  # Modern UI styles
│   └── main.tsx                 # React entry point
├── package.json                 # Frontend dependencies and root scripts
├── vite.config.ts               # Vite configuration with API proxy
└── README.md                    # Project documentation
```
