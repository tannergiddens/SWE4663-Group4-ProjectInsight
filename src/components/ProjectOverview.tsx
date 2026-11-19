import React, { useState, useEffect } from 'react';
import type { Project, ProjectMember, User } from '../types';

interface ProjectOverviewProps {
  project: Project | null;
  members: ProjectMember[];
  users: User[];
  onAddMember: (data: { full_name: string; role_name: string; email?: string }) => Promise<void>;
  onRemoveMember: (memberId: number) => Promise<void>;
  onUpdateProject: (data: Partial<Project> & { owner_name?: string }) => Promise<void>;
}

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({
  project,
  members,
  users: _users,
  onAddMember,
  onRemoveMember,
  onUpdateProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [pmName, setPmName] = useState('');
  const [methodology, setMethodology] = useState('Agile / Iterative');
  const [status, setStatus] = useState('active');
  const [targetEndDate, setTargetEndDate] = useState('');

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setProjectName(project.project_name);
      setDescription(project.description);
      setPmName(project.project_manager_name || '');
      setMethodology(project.methodology || 'Agile / Iterative');
      setStatus(project.status || 'active');
      setTargetEndDate(project.target_end_date || '');
    }
  }, [project]);

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateProject({
      project_name: projectName.trim(),
      description: description.trim(),
      owner_name: pmName.trim(),
      methodology,
      status: status as any,
      target_end_date: targetEndDate || undefined,
    });
    setIsEditing(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberRole.trim()) return;
    setMemberLoading(true);
    try {
      await onAddMember({
        full_name: newMemberName.trim(),
        role_name: newMemberRole.trim(),
      });
      setNewMemberName('');
      setNewMemberRole('');
    } finally {
      setMemberLoading(false);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Project Overview & Team Directory</h2>
          <p className="section-desc">
            Manage project parameters, leadership assignments, and dynamic team member allocations.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel Editing' : '✏️ Edit Project Details'}
        </button>
      </div>

      {project && (
        <div className="overview-layout">
          <div className="card project-info-card">
            <h3>Project Parameters</h3>
            {isEditing ? (
              <form onSubmit={handleSaveProject} className="form-stack">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Project Manager Name *</label>
                  <input
                    type="text"
                    placeholder="Enter project manager full name"
                    value={pmName}
                    onChange={(e) => setPmName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>High-Level Description *</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Development Methodology</label>
                    <select
                      value={methodology}
                      onChange={(e) => setMethodology(e.target.value)}
                    >
                      <option value="Agile / Iterative">Agile / Iterative</option>
                      <option value="Waterfall">Waterfall</option>
                      <option value="Scrum">Scrum</option>
                      <option value="Kanban">Kanban</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Lifecycle Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                    >
                      <option value="planned">Planned</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Delivery Date</label>
                    <input
                      type="date"
                      value={targetEndDate}
                      onChange={(e) => setTargetEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            ) : (
              <div className="details-view">
                <div className="detail-item">
                  <span className="label">Project Title:</span>
                  <span className="value"><strong>{project.project_name}</strong></span>
                </div>
                <div className="detail-item">
                  <span className="label">Project Manager:</span>
                  <span className="value badge-pm">{project.project_manager_name || 'Unassigned'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Methodology:</span>
                  <span className="value">{project.methodology}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`status-pill status-${project.status}`}>{project.status.toUpperCase()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Target Delivery Date:</span>
                  <span className="value">{project.target_end_date || 'Not set'}</span>
                </div>
                <div className="detail-item full-width">
                  <span className="label">High-Level Software Project Description:</span>
                  <p className="value description-text">{project.description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="card roster-card">
            <h3>Dynamic Team Member Roster</h3>
            <p className="hint">
              Team members may vary dynamically as the project progresses. Add, reassign, or remove contributors below.
            </p>

            <form onSubmit={handleAddMember} className="roster-add-form">
              <input
                type="text"
                placeholder="Team Member Name (e.g. Alex Rivera)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                required
              />
              <input
                type="text"
                placeholder="Role (e.g. Lead Developer, QA Specialist)"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary" disabled={memberLoading}>
                + Add Member
              </button>
            </form>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member Name</th>
                    <th>Email</th>
                    <th>Assigned Role</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.member_id}>
                      <td><strong>{m.full_name}</strong></td>
                      <td>{m.email || '—'}</td>
                      <td><span className="role-tag">{m.role_name}</span></td>
                      <td>{m.joined_on}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-link-danger"
                          onClick={() => onRemoveMember(m.member_id)}
                          title="Remove from active project team"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state">No active team members assigned yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
