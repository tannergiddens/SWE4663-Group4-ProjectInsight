import React, { useState } from 'react';
import type { Requirement, RequirementType, PriorityLevel } from '../types';

interface RequirementsViewProps {
  requirements: Requirement[];
  onAddRequirement: (data: Partial<Requirement>) => Promise<void>;
  onDeleteRequirement: (id: number) => Promise<void>;
}

export const RequirementsView: React.FC<RequirementsViewProps> = ({
  requirements,
  onAddRequirement,
  onDeleteRequirement,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [reqCode, setReqCode] = useState('');
  const [reqType, setReqType] = useState<RequirementType>('functional');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [estimatedHours, setEstimatedHours] = useState<number>(10);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="section-container">
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
                    <span className={`code-badge ${req.requirement_type}`}>
                      {req.requirement_code}
                    </span>
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
    </div>
  );
};
