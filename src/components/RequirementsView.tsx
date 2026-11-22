import React, { useState, useEffect } from 'react';
import type { Requirement, RequirementType, PriorityLevel } from '../types';
import { api } from '../api';
import './RequirementsView.css';

export interface TaskRecord {
  task_id: number;
  requirement_id: number;
  task_name: string;
  assigned_to: number | null;
  hours_required: number;
  hours_completed: number;
  subtask_created: boolean;
}

export interface SubtaskRecord {
  subtask_id: number;
  task_id: number;
  subtask_name: string;
  assigned_to: number | null;
  hours_required: number;
  hours_completed: number;
}

export interface TeamMemberOption {
  member_id: number;
  display_name: string;
}

interface RequirementsViewProps {
  requirements: Requirement[];
  onAddRequirement: (data: Partial<Requirement>) => Promise<void>;
  onDeleteRequirement: (id: number) => Promise<void>;

  teamMembers: TeamMemberOption[];
}


interface ValidationModalProps {
  message: string | null;
  onClose: () => void;
}

const ValidationModal: React.FC<ValidationModalProps> = ({
  message,
  onClose,
}) => {
  if (message === null) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
    >
      <div
        className="modal-content"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
        aria-describedby="validation-modal-message"
      >
        <div className="modal-header">
          <h3 id="validation-modal-title">
            ManagePro Notification
          </h3>
        </div>

        <div
          id="validation-modal-message"
          style={{
            padding: '20px 0',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}
        >
          {message}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};


export const RequirementsView: React.FC<RequirementsViewProps> = ({
  requirements,
  onAddRequirement,
  onDeleteRequirement,
  teamMembers,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  // Requirement currently selected for task management
  const [selectedRequirement, setSelectedRequirement] =
  useState<Requirement | null>(null);

  // Task selected for sub-task management
  const [selectedTask, setSelectedTask] =
  useState<TaskRecord | null>(null);


  // Sub-task records loaded from SQLite
  const [subtasks, setSubtasks] = useState<SubtaskRecord[]>([]);
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [loadedSubtasksTaskId, setLoadedSubtasksTaskId] =
  useState<number | null>(null);
  const [subtasksError, setSubtasksError] =
    useState<string | null>(null);

  // Sub-task creation
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [subtaskCreateError, setSubtaskCreateError] =
    useState<string | null>(null);

  // Track the sub-task currently saving its assignment.
  const [savingSubtaskAssignmentId, setSavingSubtaskAssignmentId] =
  useState<number | null>(null);

  // Track sub-task hour values while typing.
  const [subtaskHourDrafts, setSubtaskHourDrafts] = useState<
    Record<number, {
      required?: string;
      completed?: string;
    }>
  >({});

  // Track the sub-task currently saving hours.
  const [savingSubtaskHoursId, setSavingSubtaskHoursId] =
    useState<number | null>(null);

  // Track the sub-task currently being deleted.
  const [deletingSubtaskId, setDeletingSubtaskId] =
  useState<number | null>(null);

  const [subtaskToDelete, setSubtaskToDelete] =
  useState<SubtaskRecord | null>(null);

  // Task records loaded from SQLite
  const [tasks, setTasks] = useState<TaskRecord[]>([]);

  // Task loading status
  const [tasksLoading, setTasksLoading] = useState(false);

  // Task loading error
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Task creation
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);

  // Task creation error
  const [taskCreateError, setTaskCreateError] =
    useState<string | null>(null);

  // Track the task currently saving its assignment
  const [savingAssignmentId, setSavingAssignmentId] =
    useState<number | null>(null);

  // Track hour values while the user is typing.
  const [hourDrafts, setHourDrafts] = useState<
  Record<number, {
    required?: string;
    completed?: string;
  }>
  >({});

  // Track the task currently saving hours.
  const [savingHoursId, setSavingHoursId] =
  useState<number | null>(null);

  const [reqCode, setReqCode] = useState('');
  const [reqType, setReqType] = useState<RequirementType>('functional');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [estimatedHours, setEstimatedHours] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  // Reusable validation and error modal
  const [validationMessage, setValidationMessage] =
    useState<string | null>(null);

  const showValidationMessage = (message: string) => {
    setValidationMessage(message);
  };

    useEffect(() => {
      if (!selectedRequirement) {
        queueMicrotask(() => {
          setTasks([]);
          setTasksError(null);
        });
        return;
      }

      let cancelled = false;

      const loadRequirementTasks = async () => {
        setTasksLoading(true);
        setTasksError(null);
        setTasks([]);

        try {
          const data = await api.getTasks(
            selectedRequirement.requirement_id
          );

          if (!cancelled) {
            setTasks(data);
          }
        } catch (error) {
          if (!cancelled) {
            setTasksError(
              error instanceof Error
                ? error.message
                : 'Failed to load tasks.'
            );
          }
        } finally {
          if (!cancelled) {
            setTasksLoading(false);
          }
        }
      };

      queueMicrotask(() => {
        void loadRequirementTasks();
      });

      return () => {
        cancelled = true;
      };
    }, [selectedRequirement]);

      // Load the selected task's sub-task records
      useEffect(() => {
        if (!selectedTask) {
          queueMicrotask(() => {
            setSubtasks([]);
            setSubtasksError(null);
            setShowAddSubtask(false);
          });
          return;
        }

        let cancelled = false;

        const loadSubtasks = async () => {
          setLoadedSubtasksTaskId(null);
          setSubtasksLoading(true);
          setSubtasksError(null);
          setSubtasks([]);

          try {
            const data = await api.getSubtasks(
              selectedTask.task_id
            );

            if (!cancelled) {
              setSubtasks(data);
              setLoadedSubtasksTaskId(selectedTask.task_id);
            }

          } catch (error) {
            if (!cancelled) {
              setSubtasksError(
                error instanceof Error
                  ? error.message
                  : 'Unable to load sub-tasks.'
              );
            }
          } finally {
            if (!cancelled) {
              setSubtasksLoading(false);
            }
          }
        };

        queueMicrotask(() => {
          void loadSubtasks();
        });

        return () => {
          cancelled = true;
        };
      }, [selectedTask]);

      const handleSaveTaskHours = async (
        task: TaskRecord,
        field: 'hours_required' | 'hours_completed',
        rawValue: string
      ) => {
        if (!selectedRequirement || savingHoursId !== null) {
          return;
        }

        const originalValue = task[field];
        const newValue = Number(rawValue);

        const restoreValue = () => {
          setHourDrafts(previous => ({
            ...previous,
            [task.task_id]: {
              ...previous[task.task_id],
              [field === 'hours_required'
                ? 'required'
                : 'completed']: String(originalValue),
            },
          }));
        };

        // Validate numeric input.
        if (
          rawValue.trim() === '' ||
          !Number.isFinite(newValue) ||
          newValue < 0
        ) {
          showValidationMessage('Please enter a valid number of hours.');
          restoreValue();
          return;
        }

        // Do not save unchanged values.
        if (newValue === originalValue) {
          restoreValue();
          return;
        }

        if (field === 'hours_required') {
          // Calculate total allocation across main tasks.
          const otherTaskHours = tasks
            .filter(t => t.task_id !== task.task_id)
            .reduce(
              (total, t) => total + Number(t.hours_required),
              0
            );

          const newTotal = otherTaskHours + newValue;

          if (
            newTotal >
            Number(selectedRequirement.estimated_hours) + 0.000001
          ) {
            showValidationMessage(
              `Total task hours cannot exceed ` +
              `${selectedRequirement.estimated_hours} hours.\n\n` +
              `Requested total: ${newTotal} hours.`
            );

            restoreValue();
            return;
          }

          if (newValue < task.hours_completed) {
            showValidationMessage(
              'Hours Required cannot be less than Hours Completed.'
            );

            restoreValue();
            return;
          }
        }

        if (field === 'hours_completed') {
          if (newValue > task.hours_required) {
            showValidationMessage(
              `Hours Completed cannot exceed ` +
              `${task.hours_required} hours required.`
            );

            restoreValue();
            return;
          }
        }

        setSavingHoursId(task.task_id);

        try {
          // Save to SQLite through the Express API.
          await api.updateTask(task.task_id, {
            [field]: newValue,
          });

          // Update React state after successful persistence.
          setTasks(previous =>
            previous.map(t =>
              t.task_id === task.task_id
                ? { ...t, [field]: newValue }
                : t
            )
          );

          setHourDrafts(previous => ({
            ...previous,
            [task.task_id]: {
              ...previous[task.task_id],
              [field === 'hours_required'
                ? 'required'
                : 'completed']: String(newValue),
            },
          }));

        } catch (error) {
          showValidationMessage(
            error instanceof Error
              ? error.message
              : 'Unable to save task hours.'
          );

          // Restore last successfully saved value.
          restoreValue();

        } finally {
          setSavingHoursId(null);
        }
      };

      const handleSaveSubtaskHours = async (
        subtask: SubtaskRecord,
        field: 'hours_required' | 'hours_completed',
        rawValue: string
      ) => {
        if (
          !selectedTask ||
          savingSubtaskHoursId !== null
        ) {
          return;
        }

        const originalValue = subtask[field];
        const newValue = Number(rawValue);

        const draftField =
          field === 'hours_required'
            ? 'required'
            : 'completed';

        const restoreValue = () => {
          setSubtaskHourDrafts(previous => ({
            ...previous,
            [subtask.subtask_id]: {
              ...previous[subtask.subtask_id],
              [draftField]: String(originalValue),
            },
          }));
        };

        // Reject invalid numeric entries.
        if (
          rawValue.trim() === '' ||
          !Number.isFinite(newValue) ||
          newValue < 0
        ) {
          showValidationMessage('Please enter a valid number of hours.');
          restoreValue();
          return;
        }

        // No database update is necessary if unchanged.
        if (newValue === originalValue) {
          restoreValue();
          return;
        }

        if (field === 'hours_required') {
          // Enforce the parent task's allocated hours.
          if (
            newValue >
            Number(selectedTask.hours_required) + 0.000001
          ) {
            showValidationMessage(
              'Sub-task Hours Required cannot exceed ' +
              `${selectedTask.hours_required} hours ` +
              'allocated to the parent task.'
            );

            restoreValue();
            return;
          }

          if (newValue < subtask.hours_completed) {
            showValidationMessage(
              'Hours Required cannot be less than ' +
              'Hours Completed.'
            );

            restoreValue();
            return;
          }
        }

        if (field === 'hours_completed') {
          if (newValue > subtask.hours_required) {
            showValidationMessage(
              'Hours Completed cannot exceed ' +
              `${subtask.hours_required} hours required.`
            );

            restoreValue();
            return;
          }
        }

        setSavingSubtaskHoursId(subtask.subtask_id);

        try {
          // Save the value through the existing API.
          await api.updateSubtask(subtask.subtask_id, {
            [field]: newValue,
          });

          // Update the displayed record after saving.
          setSubtasks(previous =>
            previous.map(item =>
              item.subtask_id === subtask.subtask_id
                ? { ...item, [field]: newValue }
                : item
            )
          );

          // Keep the input consistent with the saved value.
          setSubtaskHourDrafts(previous => ({
            ...previous,
            [subtask.subtask_id]: {
              ...previous[subtask.subtask_id],
              [draftField]: String(newValue),
            },
          }));

        } catch (error) {
          showValidationMessage(
            error instanceof Error
              ? error.message
              : 'Unable to save sub-task hours.'
          );

          restoreValue();

        } finally {
          setSavingSubtaskHoursId(null);
        }
      };

      const handleDeleteSubtask = async (
        subtask: SubtaskRecord
      ) => {
        if (
          deletingSubtaskId !== null ||
          savingSubtaskAssignmentId !== null ||
          savingSubtaskHoursId !== null
        ) {
          return;
        }

        setDeletingSubtaskId(subtask.subtask_id);

        try {
          // Soft-delete the record through the existing API.
          await api.deleteSubtask(subtask.subtask_id);

          // Remove it from the active Sub-task Grid.
          setSubtasks(previous =>
            previous.filter(
              item =>
                item.subtask_id !== subtask.subtask_id
            )
          );

          // Clear locally edited hour values.
          setSubtaskHourDrafts(previous => {
            const updated = { ...previous };
            delete updated[subtask.subtask_id];
            return updated;
          });

          // Allow another sub-task to be created after deletion.
          setSelectedTask(previous =>
            previous?.task_id === subtask.task_id
              ? { ...previous, subtask_created: false }
              : previous
          );

          setTasks(previous =>
            previous.map(task =>
              task.task_id === subtask.task_id
                ? { ...task, subtask_created: false }
                : task
            )
          );

        } catch (error) {
          showValidationMessage(
            error instanceof Error
              ? error.message
              : 'Unable to delete sub-task.'
          );

        } finally {
          setDeletingSubtaskId(null);
        }
      };

      const handleSubtaskAssignment = async (
        subtaskId: number,
        userId: number | null
      ) => {
        if (savingSubtaskAssignmentId !== null) {
          return;
        }

        setSavingSubtaskAssignmentId(subtaskId);

        try {
          // Persist the assignment to SQLite.
          await api.updateSubtask(subtaskId, {
            assigned_to: userId,
          });

          // Update the visible sub-task after a successful save.
          setSubtasks(previous =>
            previous.map(subtask =>
              subtask.subtask_id === subtaskId
                ? { ...subtask, assigned_to: userId }
                : subtask
            )
          );

        } catch (error) {
          showValidationMessage(
            error instanceof Error
              ? error.message
              : 'Unable to save sub-task assignment.'
          );

        } finally {
          setSavingSubtaskAssignmentId(null);
        }
      };

      const handleTaskAssignment = async (
        taskId: number,
        userId: number | null
      ) => {
        if (savingAssignmentId !== null) return;

        setSavingAssignmentId(taskId);

        try {
          // Immediately persist the assignment to SQLite.
          await api.updateTask(taskId, {
            assigned_to: userId,
          });

          // Update the displayed record after successful saving.
          setTasks(previous =>
            previous.map(task =>
              task.task_id === taskId
                ? { ...task, assigned_to: userId }
                : task
            )
          );

        } catch (error) {
          showValidationMessage(
            error instanceof Error
              ? error.message
              : 'Unable to save task assignment.'
          );
        } finally {
          setSavingAssignmentId(null);
        }
      };

      const handleCreateSubtask = async (
        e: React.FormEvent
      ) => {
        e.preventDefault();

        if (
            !selectedTask ||
            creatingSubtask ||
            subtasksLoading ||
            subtasksError !== null ||
            selectedTask.subtask_created
          ) {
            return;
          }

        const name = newSubtaskName.trim();

        if (!name) {
          setSubtaskCreateError(
            'Please enter a sub-task name.'
          );
          return;
        }

        if (selectedTask.assigned_to === null) {
          setSubtaskCreateError(
            'The main task must be assigned first.'
          );
          return;
        }

        if (selectedTask.subtask_created || subtasks.length > 0) {
          setSubtaskCreateError(
            'This task already has an active sub-task.'
          );
          return;
        }

        setCreatingSubtask(true);
        setSubtaskCreateError(null);

        try {
          // Create the permanent record in SQLite.
          await api.createSubtask(
            selectedTask.task_id,
            name
          );

          // Prevent another creation in this session.
          setSelectedTask(previous =>
            previous?.task_id === selectedTask.task_id
              ? { ...previous, subtask_created: true }
              : previous
          );

          setTasks(previous =>
            previous.map(task =>
              task.task_id === selectedTask.task_id
                ? { ...task, subtask_created: true }
                : task
            )
          );

          setNewSubtaskName('');
          setShowAddSubtask(false);

        } catch (error) {
          setSubtaskCreateError(
            error instanceof Error
              ? error.message
              : 'Unable to create sub-task.'
          );

          return;
        } finally {
          setCreatingSubtask(false);
        }

        // Refresh the saved records separately.
        try {
          const updated = await api.getSubtasks(
            selectedTask.task_id
          );

          setSubtasks(updated);
          setSubtasksError(null);
        } catch {
          setSubtasksError(
            'Sub-task was created, but the list could not be refreshed.'
          );
        }
      };


    const handleCreateTask = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedRequirement || creatingTask) {
        return;
      }

      const taskName = newTaskName.trim();

      if (!taskName) {
        setTaskCreateError('Please enter a task name.');
        return;
      }

      setCreatingTask(true);
      setTaskCreateError(null);

      try {
        // Create the permanent task record in SQLite.
        await api.createTask(
          selectedRequirement.requirement_id,
          taskName
        );

        // Reload tasks from the database.
        const updatedTasks = await api.getTasks(
          selectedRequirement.requirement_id
        );

        setTasks(updatedTasks);
        setNewTaskName('');
        setShowAddTask(false);
        setTasksError(null);

      } catch (error) {
        setTaskCreateError(
          error instanceof Error
            ? error.message
            : 'Unable to create task.'
        );
      } finally {
        setCreatingTask(false);
      }
    };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqCode.trim() || !title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      await onAddRequirement({
        requirement_code: reqCode.trim().toUpperCase(),
        requirement_type: reqType,
        title: title.trim(),
        description: description.trim(),
        priority,
        estimated_hours: Number(estimatedHours) || 0,
      });

      // Reset form
      setReqCode('');
      setTitle('');
      setDescription('');
      setEstimatedHours(10);
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  const filtered = requirements.filter((r) => {
    if (filterType === 'all') return true;
    return r.requirement_type === filterType;
  });

  const functionalCount = requirements.filter((r) => r.requirement_type === 'functional').length;
  const nonFunctionalCount = requirements.filter((r) => r.requirement_type === 'non_functional').length;

  // Display sub-task management in place of the Task Grid
  if (selectedRequirement && selectedTask) {
    return (
      <div className="section-container">
        
      <div className="section-header">
        <div>
          <h2>{selectedRequirement.title}</h2>

          <p className="section-desc">
            Requirement: {selectedRequirement.requirement_code}
            {' | '}
            Parent Task: {selectedTask.task_id}
            {' | '}
            Estimated Sub-task Hours: {selectedTask.hours_required}h
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          { loadedSubtasksTaskId === selectedTask.task_id &&
            !subtasksLoading &&
            !subtasksError &&
            !selectedTask.subtask_created &&
            subtasks.length === 0 && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={creatingSubtask}
                onClick={() => {
                  setNewSubtaskName('');
                  setSubtaskCreateError(null);
                  setShowAddSubtask(true);
                }}
              >
                + Add Sub-task
              </button>
            )}

          <button
            type="button"
            className="btn btn-secondary"
            disabled={creatingSubtask}
            onClick={() => {
              setShowAddSubtask(false);
              setNewSubtaskName('');
              setSubtaskCreateError(null);
              setSelectedTask(null);
            }}
          >
            Back to Task Grid
          </button>
        </div>
      </div>

      {showAddSubtask && (
        <div
          className="card"
          style={{
            padding: '16px',
            marginBottom: '16px',
          }}
        >
          <form onSubmit={handleCreateSubtask}>
            <div className="form-group">
              <label htmlFor="new-subtask-name">
                Sub-task Name
              </label>

              <input
                id="new-subtask-name"
                type="text"
                value={newSubtaskName}
                onChange={e =>
                  setNewSubtaskName(e.target.value)
                }
                placeholder="Enter sub-task name"
                disabled={creatingSubtask}
                required
                autoFocus
              />
            </div>

            {subtaskCreateError && (
              <p className="alert-error" role="alert">
                {subtaskCreateError}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  creatingSubtask ||
                  !newSubtaskName.trim()
                }
              >
                {creatingSubtask
                  ? 'Creating...'
                  : 'Create Sub-task'}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={creatingSubtask}
                onClick={() => {
                  setShowAddSubtask(false);
                  setNewSubtaskName('');
                  setSubtaskCreateError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}



        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sub-task Name</th>
                  <th>Assigned To</th>
                  <th>Hours Required</th>
                  <th>Hours Completed</th>
                  <th>Action</th>
                </tr>
              </thead>
              
              <tbody>
                {subtasksLoading ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      Loading sub-task...
                    </td>
                  </tr>
                ) : subtasksError ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {subtasksError}
                    </td>
                  </tr>
                ) : subtasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      {selectedTask.subtask_created
                        ? 'No active sub-task is currently displayed.'
                        : 'No active sub-task exists. You may create one.'}
                    </td>
                  </tr>
                ) : (
                  subtasks.map(subtask => (
                    <tr key={subtask.subtask_id}>
                      <td>
                        <strong>{subtask.subtask_name}</strong>
                      </td>

                        <td>
                          <select
                            aria-label={`Assign ${subtask.subtask_name}`}
                            value={subtask.assigned_to ?? ''}
                            disabled={savingSubtaskAssignmentId !== null}
                            onChange={e => {
                              const userId = e.target.value
                                ? Number(e.target.value)
                                : null;

                              void handleSubtaskAssignment(
                                subtask.subtask_id,
                                userId
                              );
                            }}
                            style={{
                              width: '100%',
                              minWidth: '140px',
                              padding: '8px',
                            }}
                          >
                            <option value="">Unassigned</option>

                            {teamMembers.map(member => (
                              <option
                                key={member.member_id}
                                value={member.member_id}
                              >
                                {member.display_name}
                              </option>
                            ))}
                          </select>
                        </td>
                      
                        <td>
                          <input
                            type="number"
                            aria-label={`Hours required for ${subtask.subtask_name}`}
                            min="0"
                            step="0.5"
                            value={
                              subtaskHourDrafts[subtask.subtask_id]?.required
                              ?? String(subtask.hours_required)
                            }
                            disabled={savingSubtaskHoursId !== null}
                            onChange={e => {
                              const value = e.target.value;

                              setSubtaskHourDrafts(previous => ({
                                ...previous,
                                [subtask.subtask_id]: {
                                  ...previous[subtask.subtask_id],
                                  required: value,
                                },
                              }));
                            }}
                            onBlur={e => {
                              void handleSaveSubtaskHours(
                                subtask,
                                'hours_required',
                                e.target.value
                              );
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            style={{
                              width: '95px',
                              padding: '8px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </td>

                          <td>
                            <input
                              type="number"
                              aria-label={`Hours completed for ${subtask.subtask_name}`}
                              min="0"
                              step="0.5"
                              value={
                                subtaskHourDrafts[subtask.subtask_id]?.completed
                                ?? String(subtask.hours_completed)
                              }
                              disabled={savingSubtaskHoursId !== null}
                              onChange={e => {
                                const value = e.target.value;

                                setSubtaskHourDrafts(previous => ({
                                  ...previous,
                                  [subtask.subtask_id]: {
                                    ...previous[subtask.subtask_id],
                                    completed: value,
                                  },
                                }));
                              }}
                              onBlur={e => {
                                void handleSaveSubtaskHours(
                                  subtask,
                                  'hours_completed',
                                  e.target.value
                                );
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              style={{
                                width: '95px',
                                padding: '8px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                      
                          <td>
                            <button
                              type="button"
                              className="btn-link-danger"
                              disabled={
                                deletingSubtaskId !== null ||
                                savingSubtaskAssignmentId !== null ||
                                savingSubtaskHoursId !== null
                              }
                              onClick={() => {
                                  setSubtaskToDelete(subtask);  
                              }}
                              title="Delete sub-task"
                            >
                              {deletingSubtaskId === subtask.subtask_id
                                ? 'Deleting...'
                                : 'Delete'}
                            </button>
                          </td>

                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

        {subtaskToDelete && (
          <div className="modal-overlay">
            <div
              className="modal-content"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-subtask-title"
              aria-describedby="delete-subtask-message"
            >
              <div className="modal-header">
                <h3 id="delete-subtask-title">
                  Delete Sub-task
                </h3>
              </div>

              <div
                id="delete-subtask-message"
                style={{
                  padding: '20px 0',
                  lineHeight: 1.6,
                }}
              >
                <p>
                  Are you sure you want to delete
                  <strong> {subtaskToDelete.subtask_name}</strong>?
                </p>

                <p style={{ marginTop: '12px' }}>
                  This will remove the sub-task from the active
                  grid. Its historical database record will
                  be retained, and you may create a replacement
                  sub-task.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSubtaskToDelete(null)}
                  autoFocus
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const subtask = subtaskToDelete;
                    setSubtaskToDelete(null);
                    void handleDeleteSubtask(subtask);
                  }}
                >
                  Delete Sub-task
                </button>
              </div>
            </div>
          </div>
        )}

        <ValidationModal
          message={validationMessage}
          onClose={() => setValidationMessage(null)}
        />
      </div>
    );
  }

  // Display task management in place of the Requirements Grid
  if (selectedRequirement) {
    return (
      <div className="section-container">

        <div className="section-header">
          <div>
            <h2>{selectedRequirement.title}</h2>

            <p className="section-desc">
              Requirement: {selectedRequirement.requirement_code}
              {' | '}
              Estimated Hours: {selectedRequirement.estimated_hours}h
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setNewTaskName('');
                setTaskCreateError(null);
                setShowAddTask(true);
              }}
              disabled={creatingTask}
            >
              + Add Task
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowAddTask(false);
                setNewTaskName('');
                setTaskCreateError(null);
                setSelectedTask(null);
                setSelectedRequirement(null);
              }}
              disabled={creatingTask}
            >
              Back to Requirements
            </button>
          </div>
        </div>

        {showAddTask && (
          <div
            className="card"
            style={{
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label htmlFor="new-task-name">
                  Task Name
                </label>

                <input
                  id="new-task-name"
                  type="text"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="Enter task name"
                  disabled={creatingTask}
                  required
                  autoFocus
                />
              </div>

              {taskCreateError && (
                <p className="alert-error" role="alert">
                  {taskCreateError}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  marginTop: '12px',
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingTask || !newTaskName.trim()}
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskName('');
                    setTaskCreateError(null);
                  }}
                  disabled={creatingTask}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}


        <div className="card table-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Assigned To</th>
                  <th>Hours Required</th>
                  <th>Hours Completed</th>
                  <th>Sub-task</th>
                </tr>
              </thead>
              
                <tbody>
                  {tasksLoading ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        Loading tasks...
                      </td>
                    </tr>
                  ) : tasksError ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        {tasksError}
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-state">
                        No tasks have been created for this requirement.
                      </td>
                    </tr>
                  ) : (
                    tasks.map(task => (
                      <tr key={task.task_id}>
                        <td>
                          <strong>{task.task_name}</strong>
                        </td>
                        
                        <td>
                          <select
                            aria-label={`Assign ${task.task_name}`}
                            value={task.assigned_to ?? ''}
                            disabled={savingAssignmentId !== null}
                            onChange={e => {
                              const userId = e.target.value
                                ? Number(e.target.value)
                                : null;

                              void handleTaskAssignment(
                                task.task_id,
                                userId
                              );
                            }}
                            style={{
                              width: '100%',
                              minWidth: '140px',
                              padding: '8px',
                            }}
                          >
                            <option value="">Unassigned</option>

                            {teamMembers.map(member => (
                              <option
                                key={member.member_id}
                                value={member.member_id}
                              >
                                {member.display_name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type="number"
                            aria-label={`Hours required for ${task.task_name}`}
                            min="0"
                            step="0.5"
                            value={
                              hourDrafts[task.task_id]?.required
                              ?? String(task.hours_required)
                            }
                            disabled={savingHoursId !== null}
                            onChange={e => {
                              const value = e.target.value;

                              setHourDrafts(previous => ({
                                ...previous,
                                [task.task_id]: {
                                  ...previous[task.task_id],
                                  required: value,
                                },
                              }));
                            }}
                            onBlur={e => {
                              void handleSaveTaskHours(
                                task,
                                'hours_required',
                                e.target.value
                              );
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.blur();
                              }
                            }}
                            style={{
                              width: '95px',
                              padding: '8px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </td>

                          <td>
                            <input
                              type="number"
                              aria-label={`Hours completed for ${task.task_name}`}
                              min="0"
                              step="0.5"
                              value={
                                hourDrafts[task.task_id]?.completed
                                ?? String(task.hours_completed)
                              }
                              disabled={savingHoursId !== null}
                              onChange={e => {
                                const value = e.target.value;

                                setHourDrafts(previous => ({
                                  ...previous,
                                  [task.task_id]: {
                                    ...previous[task.task_id],
                                    completed: value,
                                  },
                                }));
                              }}
                              onBlur={e => {
                                void handleSaveTaskHours(
                                  task,
                                  'hours_completed',
                                  e.target.value
                                );
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }
                              }}
                              style={{
                                width: '95px',
                                padding: '8px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>

                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                disabled={
                                  task.assigned_to === null ||
                                  savingAssignmentId !== null ||
                                  savingHoursId !== null
                                }
                                onClick={() => {
                                  setSelectedTask(task);
                                  setShowAddTask(false);
                                }}
                                title={
                                  task.assigned_to === null
                                    ? 'Assign a team member before adding a sub-task'
                                    : 'Open sub-task management'
                                }
                              >
                                Sub-task
                              </button>
                            </td>
                      </tr>
                    ))
                  )}
                </tbody>

            </table>
          </div>
        </div>
        <ValidationModal
          message={validationMessage}
          onClose={() => setValidationMessage(null)}
        />
      </div>
    );
  }

  return (
    <div className="section-container requirements-page">
      <div className="section-header">
        <div>
          <h2>System Requirements Specification</h2>
          <p className="section-desc">
            Define, prioritize, and track functional and non-functional requirements across the product lifecycle.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Requirement
        </button>
      </div>

      <div className="metrics-row">
        <div className="metric-pill">
          <span className="metric-num">{requirements.length}</span>
          <span className="metric-label">Total Requirements</span>
        </div>
        <div className="metric-pill functional">
          <span className="metric-num">{functionalCount}</span>
          <span className="metric-label">Functional (FR)</span>
        </div>
        <div className="metric-pill non-functional">
          <span className="metric-num">{nonFunctionalCount}</span>
          <span className="metric-label">Non-Functional (NFR)</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="btn-group">
          <button
            type="button"
            className={`btn-filter ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({requirements.length})
          </button>
          <button
            type="button"
            className={`btn-filter ${filterType === 'functional' ? 'active' : ''}`}
            onClick={() => setFilterType('functional')}
          >
            Functional Only ({functionalCount})
          </button>
          <button
            type="button"
            className={`btn-filter ${filterType === 'non_functional' ? 'active' : ''}`}
            onClick={() => setFilterType('non_functional')}
          >
            Non-Functional Only ({nonFunctionalCount})
          </button>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>Classification</th>
                <th>Requirement Title & Scope</th>
                <th>Priority</th>
                <th>Estimated</th>
                <th>Expended</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.requirement_id}>
                  
                  <td>
                    <button
                      type="button"
                      className={`code-badge ${req.requirement_type}`}
                      onClick={() => setSelectedRequirement(req)}
                      title={`View tasks for ${req.requirement_code}`}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        font: 'inherit',
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {req.requirement_code}
                    </button>
                  </td>

                  <td>
                    <span className={`type-tag ${req.requirement_type}`}>
                      {req.requirement_type === 'functional' ? 'Functional' : 'Non-Functional'}
                    </span>
                  </td>
                  <td>
                    <strong>{req.title}</strong>
                    <p className="table-desc">{req.description}</p>
                  </td>
                  <td>
                    <span className={`priority-badge priority-${req.priority}`}>
                      {req.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>{req.estimated_hours}h</td>
                  <td>
                    <strong className="hours-highlight">
                      {req.total_expended_hours || 0}h
                    </strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-link-danger"
                      onClick={() => onDeleteRequirement(req.requirement_id)}
                      title="Delete requirement"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No requirements match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create System Requirement</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-row">
                <div className="form-group">
                  <label>Requirement Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. FR-10 or NFR-05"
                    value={reqCode}
                    onChange={(e) => setReqCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Classification</label>
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value as RequirementType)}
                  >
                    <option value="functional">Functional</option>
                    <option value="non_functional">Non-Functional</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Requirement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Real-Time Resource Utilization Analytics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Specification & Acceptance Criteria</label>
                <textarea
                  rows={3}
                  placeholder="Detailed functional behavior or quality constraint..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Person-Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ValidationModal
        message={validationMessage}
        onClose={() => setValidationMessage(null)}
      />
    </div>
  );
};
