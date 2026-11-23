# Project Insight: Software Effort Monitoring & Management System
## Deliverable #3: Functional Prototype & Minimum Requirements Compliance Document

**Course:** SWE 4663 – Software Project Management (Fall 2026)  
**Instructor:** Prof. Mona Chavoshi  
**Group:** Group #4  
**Date of Submission:** November 22, 2026  
**Repository:** [SWE4663-Group4-ProjectInsight](https://github.com/tannergiddens/SWE4663-Group4-ProjectInsight)  

---

### Team Members & Contributions Breakdown

| Team Member | System Role | Project Guidelines Section Owned | Core Deliverables & Implemented Features |
| :--- | :--- | :--- | :--- |
| **Tanner Giddens** | Full-Stack Lead / Project Manager | **Section B & Section C.1** | End-to-end full-stack integration, Requirements Management API, 5-Phase Daily/Weekly Effort Logging engine, walk-through video presentation. |
| **Randy Giles** | Database & Backend Architect | **Data Architecture & Advanced Features** | SQLite database schema with foreign key enforcement (`better-sqlite3`), WAL mode concurrency, Client Contact Information repository, Task & Sub-task hierarchy with hour constraint checking, 9 functional test cases. |
| **Hermela Gizaw** | Risk Management Lead | **Section A.4** | Enterprise Risk Register, 5x5 quantitative Probability and Impact scoring algorithm, severity classification (Low/Medium/High), mitigation action planning, status workflows. |
| **Tonia Gates** | Project Metadata & Roster Lead | **Section A.1, A.2, A.3** | High-level project narrative and parameters, Project Manager assignment, dynamic team roster management (adding/removing active contributors with role tracking). |
| **Ethan Gregg** | Visualization & Dashboard Lead | **Section C.2** | Real-time Cumulative 5-Phase Effort Allocation Matrix, SQLite SQL aggregation view (`v_requirement_phase_effort`), summary KPI metrics cards, phase percentage distributions, and CSV export. |

---

## 1. Executive Summary & Prototype Overview

**Project Insight** is a centralized software project management and lifecycle effort-monitoring application developed in compliance with the **SWE 4663 Term Project Guidelines** and the **Comprehensive Project Plan**. 

The system provides project leadership and contributors with full operational visibility into development resource expenditures across the software development lifecycle (SDLC). The prototype is a high-performance, responsive single-page web application featuring:
1. **Zero-Dependency Relational Persistence:** Fully embedded SQLite database configured with write-ahead logging (`WAL`) and strict relational integrity (`PRAGMA foreign_keys = ON;`).
2. **Sub-Second Real-Time Analytics:** Real-time database view aggregations (`v_requirement_phase_effort`) calculating horizontal requirement totals and vertical phase totals dynamically.
3. **Robust Input Boundary Validation:** Strict server-side and client-side guards preventing negative hour allocations, invalid contributor assignments, and budget overruns.

---

## 2. Minimum Requirements Traceability Matrix

The table below outlines the compliance mapping between the course guidelines, the team's Comprehensive Plan, and the functional prototype deliverables:

| Specification Section | Guideline Requirement | Prototype Implementation | Verification Status |
| :--- | :--- | :--- | :---: |
| **Section A.1 & A.2** | Project Description, Narrative & Project Manager Assignment | `src/components/ProjectOverview.tsx`<br>`api-services/src/routes/projects.ts` | **PASS (100%)** |
| **Section A.3** | Dynamic Team Member Roster (add, update, remove contributors as project evolves) | `project_members` relational table with `joined_on`/`left_on` dates; interactive roster manager in Project Overview. | **PASS (100%)** |
| **Section A.4** | Project Risk Management & Status Register (1–5 scale for probability & impact, mitigation plans) | `src/components/RiskManagement.tsx`<br>`api-services/src/routes/risks.ts` | **PASS (100%)** |
| **Section B.1** | Functional & Non-Functional Requirements Classification & Entry | `src/components/RequirementsView.tsx`<br>`api-services/src/routes/requirements.ts` | **PASS (100%)** |
| **Section C.1** | Daily & Weekly Person-Hours Effort Logging across the 5 SDLC Phases | `src/components/EffortLogger.tsx`<br>`api-services/src/routes/effort.ts` | **PASS (100%)** |
| **Section C.2** | Real-Time Cumulative 5-Phase Effort Allocation Matrix View & Summary Metrics | `src/components/EffortMatrix.tsx`<br>`v_requirement_phase_effort` view | **PASS (100%)** |
| **Team Enhancement** | Client Contact Information Repository | `src/components/ClientProfileModal.tsx`<br>`api-services/src/routes/clientRoutes.ts` | **PASS (100%)** |
| **Team Enhancement** | Task and Sub-Task Allocation with Budget Constraint Enforcement | `api-services/src/routes/tasksRoutes.ts`<br>Index `idx_one_active_subtask_per_task` | **PASS (100%)** |
| **Team Enhancement** | Cascading Project Deletion Engine | `DELETE /api/projects/:id` atomic cascading transaction removing all dependent records. | **PASS (100%)** |

---

## 3. Detailed Deliverables & Functional Specifications

### 3.1 Section A: Project Metadata, Leadership & Dynamic Roster
* **Project Parameters:** Maintains project name, scope narrative, methodology (e.g., Agile / Iterative, Waterfall), target completion date, and the assigned Project Manager. The project manager can update these values inline at any point.
* **Dynamic Team Roster:** Enables project leadership to add contributors dynamically with specific project roles (e.g., *Database Architect*, *Risk Lead*). Removing a member updates their status cleanly without cascading deletions or corrupting historical timesheets.
* **Quick Project Management:** Projects can be initialized via the "+ New Project" modal or cleanly deleted with all child dependencies through the sidebar and overview controls.

### 3.2 Section A.4: Enterprise Risk Management Register
* **Quantitative Risk Assessment:** Evaluates every operational risk across two axes:
  * **Probability:** Scored from 1 (Very Unlikely) to 5 (Almost Certain).
  * **Impact:** Scored from 1 (Negligible) to 5 (Catastrophic).
* **Severity Scoring & Visual Indicators:** Computes composite severity ($Probability \times Impact$). Categorized visually as:
  * **Low (1–3):** Green pill.
  * **Medium (4–6):** Amber pill.
  * **High (7–25):** Red pill.
* **Mitigation Plans & Ownership:** Pre-loaded with authentic project risks (Schedule Delays, Time-Tracking Inaccuracies, Module Integration) with defined mitigation strategies, owner assignments, and lifecycle statuses (`open`, `in_progress`, `mitigated`, `resolved`).

### 3.3 Section B.1: Requirements Engineering & Task Hierarchy
* **Requirements Cataloging:** Requirements are uniquely tagged (`FR-01` to `FR-06`, `NFR-01` to `NFR-03`) and classified into:
  * **Functional Requirements:** Core operational features (e.g., Effort Logging, Matrix View).
  * **Non-Functional Requirements:** Architecture, database performance, and data integrity constraints.
* **Task & Sub-Task Breakdown:** Requirements support granular task delegation to active team members. The database enforces that total task hours cannot exceed the requirement’s estimated hours, and allows one active sub-task per main task.
* **Client Contact Profiles:** Header-accessible modal displays complete sponsor contact information (name, address, direct telephone, email).

### 3.4 Section C.1: 5-Phase Effort Logging Engine
* **Course-Mandated SDLC Phases:** Logged effort is strictly categorized into the 5 required phases:
  1. **Phase 1:** Requirements Analysis
  2. **Phase 2:** Designing
  3. **Phase 3:** Coding
  4. **Phase 4:** Testing
  5. **Phase 5:** Project Management
* **Flexible Timesheet Modes:** Contributors can submit hours either:
  * **Single-Phase Mode:** Fast logging for a specific task.
  * **5-Phase Breakdown Timesheet:** Log hours across all 5 phases in a single unified entry.
* **Daily vs. Weekly Reporting:** Supports day-level or week-level tracking periods with non-negative numeric validation.

### 3.5 Section C.2: Real-Time Cumulative Effort Matrix
* **Real-Time Database View:** Powered by SQLite view `v_requirement_phase_effort`, generating a dynamic pivot table aggregating total hours by requirement and phase.
* **Two-Way Totals:** Computes cumulative horizontal totals per requirement and vertical cumulative totals per SDLC phase.
* **Analytics Cards:** Top-level metrics cards display Total Expended Hours, phase distribution percentages, and requirement counts.
* **Export Capability:** One-click "Export CSV" feature formats and downloads the current matrix as a `.csv` spreadsheet for stakeholder reporting.

---

## 4. Functional Test Suite & Quality Verification

All 9 formal test cases from `ProjectInsightTestCases.md` pass with 100% compliance:

| Test ID | Test Scenario | Expected Outcome | Actual Outcome | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC1** | Create a new software development project | Project is instantly created and available in dropdown | Project created and selected in real time | **PASS** |
| **TC2** | Enter functional and non-functional requirements | System classifies and attaches both requirement types | Requirements categorized and displayed with badges | **PASS** |
| **TC3** | Assign tasks to requirements | Tasks successfully attach to requirements within budget | Tasks link to requirement with hour cap validation | **PASS** |
| **TC4** | Associate team members to tasks | Active project members can be assigned to tasks | Team member selection links to task record | **PASS** |
| **TC5** | Add a sub-task to a parent task | User can add exactly one active sub-task to a main task | Sub-task added with parent hour bounds | **PASS** |
| **TC6** | Delete / archive a sub-task | Sub-task can be archived and replaced | Soft-deletion verified; audit preserved | **PASS** |
| **TC7** | View client contact details | Client profile displays when viewing project | Full institutional contact details displayed in modal | **PASS** |
| **TC8** | Create new client contact details | New client details persist during project creation | Client record created and linked to project | **PASS** |
| **TC9** | Assign previous client contact details | Existing client selected when creating a project | Previous client successfully re-associated | **PASS** |

---

## 5. Technology Stack & Architecture

```text
┌────────────────────────────────────────────────────────┐
│             React 19 + TypeScript Frontend             │
│   (Vite, CSS Modules, State Hooks, Responsive Grid)    │
└───────────────────────────┬────────────────────────────┘
                            │ /api reverse proxy (port 5173 -> 3001)
┌───────────────────────────▼────────────────────────────┐
│                  Express 5 REST API                    │
│   (TypeScript NodeNext, Modular Routers, CORS, JSON)   │
└───────────────────────────┬────────────────────────────┘
                            │ better-sqlite3 (synchronous WAL)
┌───────────────────────────▼────────────────────────────┐
│                 SQLite Database Engine                 │
│  (managepro.db: PRAGMA foreign_keys = ON, SQL Views)   │
└────────────────────────────────────────────────────────┘
```

* **Frontend:** React 19.3, TypeScript 5.8, Vite 8.3
* **Backend:** Node.js v24 / Express 5.3, `better-sqlite3` 13.2
* **Database File:** `api-services/data/managepro.db`
* **Static Assets & Icons:** Custom SVG icons and modular CSS

---

## 6. Execution & Verification Instructions

### 6.1 Prerequisites
* Node.js v20+ or v22+ (tested on v24)
* npm v10+

### 6.2 Running the Application

#### Option 1: 1-Click Launch (Recommended for Evaluators)
Simply **double-click `run.bat`** in the project root directory (or run `npm start`):
```bash
npm start
```
*This starts the unified Express service on `http://localhost:3001`, serves both frontend and backend together, and automatically opens your default browser.*

#### Option 2: Development Mode (Two Terminals)

##### Terminal 1: Backend API Service
```bash
npm run api
```

##### Terminal 2: Frontend Web Application
```bash
npm run dev
```

---

## 7. Walk-Through Video Submission Information

* **Presenter:** Tanner Giddens (Team Lead & Full-Stack Developer, on behalf of Group #4)
* **Video Duration:** ~2 to 3 minutes (Fast-paced UI demonstration)
* **Demonstrated Workflow:**
  1. **Project Information:** Project parameters, methodology, PM assignment, dynamic roster add/remove, and project deletion.
  2. **Risk Management:** 1–5 probability and impact scoring, severity badges, and mitigation plans.
  3. **Requirements & Tasks:** Functional vs. non-functional requirements catalog, client contact modal, and task hour allocations.
  4. **Timesheet Entry:** Live effort entry across all 5 SDLC phases (Requirements Analysis, Designing, Coding, Testing, Project Management).
  5. **Effort Matrix Dashboard:** Real-time cumulative SQL view aggregation, phase percentages, requirement type filters, and one-click CSV export.
