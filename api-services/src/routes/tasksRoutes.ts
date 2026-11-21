import { Router } from "express";
import db from "../database/db.js";

const router = Router();

type TaskRow = {
  task_id: number; project_id: number; requirement_id: number;
  parent_task_id: number | null; title: string;
  allocated_hours: number; hours_completed: number; deleted_at: string | null;
};
type RequirementRow = { requirement_id: number; project_id: number; estimated_hours: number };
type AssignmentRow = { user_id: number } | undefined;

const getTask = (id: number) => db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(id) as TaskRow | undefined;
const getRequirement = (id: number) => db.prepare("SELECT requirement_id, project_id, estimated_hours FROM requirements WHERE requirement_id = ?").get(id) as RequirementRow | undefined;
const getAssignee = (id: number) => (db.prepare("SELECT user_id FROM task_assignments WHERE task_id = ? AND unassigned_at IS NULL ORDER BY assignment_id DESC LIMIT 1").get(id) as AssignmentRow)?.user_id ?? null;
const hasChild = (id: number) => !!db.prepare("SELECT 1 FROM tasks WHERE parent_task_id = ? LIMIT 1").get(id);
const numberId = (value: string) => { const id = Number(value); if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Invalid record ID."); return id; };
const validHours = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new Error(`${label} must be a finite, non-negative number.`);
  return value;
};
const validName = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error("Task name is required.");
  return value.trim();
};
const assertMember = (projectId: number, userId: number) => {
  const row = db.prepare(`SELECT 1 FROM project_members pm JOIN users u ON u.user_id = pm.user_id
    WHERE pm.project_id = ? AND pm.user_id = ? AND pm.left_on IS NULL AND u.active = 1`).get(projectId, userId);
  if (!row) throw new Error("Choose an active member of this project.");
};
const setAssignee = (taskId: number, projectId: number, value: unknown) => {
  if (value !== null && (!Number.isSafeInteger(value) || Number(value) <= 0)) throw new Error("Invalid team member.");
  if (value !== null) assertMember(projectId, value as number);
  const current = getAssignee(taskId);
  if (current === value) return;
  db.prepare("UPDATE task_assignments SET unassigned_at = CURRENT_TIMESTAMP WHERE task_id = ? AND unassigned_at IS NULL").run(taskId);
  if (value !== null) db.prepare("INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)").run(taskId, value);
};
const taskDto = (task: TaskRow) => ({
  task_id: task.task_id, requirement_id: task.requirement_id,
  task_name: task.title, assigned_to: getAssignee(task.task_id),
  hours_required: task.allocated_hours, hours_completed: task.hours_completed,
  subtask_created: hasChild(task.task_id),
});
const subtaskDto = (task: TaskRow) => ({
  subtask_id: task.task_id, task_id: task.parent_task_id,
  subtask_name: task.title, assigned_to: getAssignee(task.task_id),
  hours_required: task.allocated_hours, hours_completed: task.hours_completed,
  deleted_at: task.deleted_at,
});
const assertRequirementBudget = (requirement: RequirementRow, excludingId: number | null, proposed: number) => {
  const totals = db.prepare(`SELECT COALESCE(SUM(allocated_hours), 0) AS total FROM tasks
    WHERE requirement_id = ? AND project_id = ? AND parent_task_id IS NULL AND task_id != ?`)
    .get(requirement.requirement_id, requirement.project_id, excludingId ?? -1) as { total: number };
  if (totals.total + proposed > requirement.estimated_hours + 1e-9) throw new Error(`Total task hours cannot exceed the requirement estimate of ${requirement.estimated_hours}.`);
};
const errorResponse = (res: import('express').Response, error: unknown) => {
  const msg = error instanceof Error ? error.message : 'Request failed';
  const conflict = /UNIQUE constraint|constraint failed|database is locked/.test(msg);
  res.status(conflict ? 409 : 400).json({ error: msg });
};

// These URLs are mounted at /api from server.ts.
router.get('/requirements/:id/tasks', (req, res) => {
  try {
    const requirementId = numberId(req.params.id);
    if (!getRequirement(requirementId)) return res.status(404).json({error: 'Requirement not found'});
    const tasks = db.prepare(`SELECT * FROM tasks WHERE requirement_id = ? AND parent_task_id IS NULL AND deleted_at IS NULL ORDER BY task_id`).all(requirementId) as TaskRow[];
    return res.json(tasks.map(taskDto));
  } catch (e) { return errorResponse(res, e); }
});
router.post('/requirements/:id/tasks', (req, res) => {
  try {
    const created = db.transaction(() => {
      const r = getRequirement(numberId(req.params.id));
      if (!r) throw new Error('Requirement not found');
      const name = validName(req.body.task_name);
      const info = db.prepare(`INSERT INTO tasks (project_id, requirement_id, parent_task_id, title)
        VALUES (?, ?, NULL, ?)`).run(r.project_id, r.requirement_id, name);
      return taskDto(getTask(Number(info.lastInsertRowid))!);
    }).immediate();
    return res.status(201).json(created);
  } catch (e) { return errorResponse(res, e); }
});
router.patch('/tasks/:id', (req, res) => {
  try {
    const updated = db.transaction(() => {
      const task = getTask(numberId(req.params.id));
      if (!task || task.parent_task_id !== null || task.deleted_at) throw new Error('Main task not found');
      const r = getRequirement(task.requirement_id);
      if (!r) throw new Error('Requirement not found');
      const allowed = ['task_name', 'assigned_to', 'hours_required', 'hours_completed'];
      if (Object.keys(req.body ?? {}).some(k => !allowed.includes(k))) throw new Error('Unknown task field');
      const name = req.body.task_name === undefined ? task.title : validName(req.body.task_name);
      const required = req.body.hours_required === undefined ? task.allocated_hours : validHours(req.body.hours_required, 'Hours required');
      const completed = req.body.hours_completed === undefined ? task.hours_completed : validHours(req.body.hours_completed, 'Hours completed');
      if (completed > required) throw new Error('Completed hours cannot exceed required hours');
      assertRequirementBudget(r, task.task_id, required);
      const child = db.prepare('SELECT allocated_hours FROM tasks WHERE parent_task_id = ? AND deleted_at IS NULL').get(task.task_id) as {allocated_hours: number} | undefined;
      if (child && child.allocated_hours > required) throw new Error('Cannot reduce required hours below the active sub-task allocation');
      db.prepare('UPDATE tasks SET title = ?, allocated_hours = ?, hours_completed = ? WHERE task_id = ?').run(name, required, completed, task.task_id);
      if (Object.prototype.hasOwnProperty.call(req.body, 'assigned_to')) setAssignee(task.task_id, task.project_id, req.body.assigned_to);
      return taskDto(getTask(task.task_id)!);
    }).immediate();
    return res.json(updated);
  } catch (e) { return errorResponse(res, e); }
});
router.get('/tasks/:id/subtasks', (req, res) => {
  try {
    const parent = getTask(numberId(req.params.id));
    if (!parent || parent.parent_task_id !== null) return res.status(404).json({error:'Main task not found'});
    const subtasks = db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY task_id').all(parent.task_id) as TaskRow[];
    return res.json(subtasks.map(subtaskDto));
  } catch (e) { return errorResponse(res, e); }
});
router.post('/tasks/:id/subtasks', (req, res) => {
  try {
    const created = db.transaction(() => {
      const parent = getTask(numberId(req.params.id));
      if (!parent || parent.parent_task_id !== null || parent.deleted_at) throw new Error('Main task not found');
      if (getAssignee(parent.task_id) === null) throw new Error('Assign the main task before adding a sub-task');
      if (hasChild(parent.task_id)) throw new Error('This main task has already created its one permanent sub-task');
      const name = validName(req.body.subtask_name);
      const info = db.prepare('INSERT INTO tasks (project_id, requirement_id, parent_task_id, title) VALUES (?, ?, ?, ?)')
        .run(parent.project_id, parent.requirement_id, parent.task_id, name);
      return subtaskDto(getTask(Number(info.lastInsertRowid))!);
    }).immediate();
    return res.status(201).json(created);
  } catch (e) { return errorResponse(res, e); }
});
router.patch('/subtasks/:id', (req, res) => {
  try {
    const updated = db.transaction(() => {
      const child = getTask(numberId(req.params.id));
      if (!child || child.parent_task_id === null || child.deleted_at) throw new Error('Active sub-task not found');
      const parent = getTask(child.parent_task_id);
      if (!parent || parent.parent_task_id !== null || parent.deleted_at) throw new Error('Parent task not found');
      const allowed = ['subtask_name', 'assigned_to', 'hours_required', 'hours_completed'];
      if (Object.keys(req.body ?? {}).some(k => !allowed.includes(k))) throw new Error('Unknown sub-task field');
      const name = req.body.subtask_name === undefined ? child.title : validName(req.body.subtask_name);
      const required = req.body.hours_required === undefined ? child.allocated_hours : validHours(req.body.hours_required, 'Hours required');
      const completed = req.body.hours_completed === undefined ? child.hours_completed : validHours(req.body.hours_completed, 'Hours completed');
      if (required > parent.allocated_hours) throw new Error(`Sub-task hours cannot exceed parent task hours (${parent.allocated_hours})`);
      if (completed > required) throw new Error('Completed hours cannot exceed required hours');
      db.prepare('UPDATE tasks SET title = ?, allocated_hours = ?, hours_completed = ? WHERE task_id = ?').run(name, required, completed, child.task_id);
      if (Object.prototype.hasOwnProperty.call(req.body, 'assigned_to')) setAssignee(child.task_id, child.project_id, req.body.assigned_to);
      return subtaskDto(getTask(child.task_id)!);
    }).immediate();
    return res.json(updated);
  } catch (e) { return errorResponse(res, e); }
});
router.delete('/subtasks/:id', (req, res) => {
  try {
    const done = db.transaction(() => {
      const child = getTask(numberId(req.params.id));
      if (!child || child.parent_task_id === null) throw new Error('Sub-task not found');
      db.prepare('UPDATE tasks SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP) WHERE task_id = ?').run(child.task_id);
    }).immediate();
    return res.json({message: 'Sub-task archived; its permanent record remains'});
  } catch (e) { return errorResponse(res, e); }
});

export default router;
