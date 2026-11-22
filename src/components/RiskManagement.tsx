import React, { useState } from 'react';
import type { Risk, Requirement, User } from '../types';
import './RiskManagement.css';

interface RiskManagementProps {
  risks: Risk[];
  requirements: Requirement[];
  users: User[];
  onAddRisk: (data: Partial<Risk>) => Promise<void>;
  onUpdateRisk: (id: number, data: Partial<Risk>) => Promise<void>;
  onDeleteRisk: (id: number) => Promise<void>;
}

export const RiskManagement: React.FC<RiskManagementProps> = ({
  risks,
  requirements,
  users,
  onAddRisk,
  onUpdateRisk,
  onDeleteRisk,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reqId, setReqId] = useState<number | ''>('');
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const [probability, setProbability] = useState<number>(3);
  const [impact, setImpact] = useState<number>(3);
  const [status, setStatus] = useState<Risk['status']>('open');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    try {
      await onAddRisk({
        title: title.trim(),
        description: description.trim(),
        requirement_id: reqId ? Number(reqId) : null,
        owner_id: ownerId ? Number(ownerId) : null,
        probability,
        impact,
        status,
        mitigation_plan: mitigationPlan.trim() || null,
      });

      setTitle('');
      setDescription('');
      setMitigationPlan('');
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  const getRiskScoreClass = (prob: number, imp: number) => {
    const score = prob * imp;
    if (score >= 7) return 'risk-high';
    if (score >= 4) return 'risk-medium';
    return 'risk-low';
  };

  return (
    <div className="section-container risk-register-page">
      <div className="section-header">
        <div>
          <h2>Enterprise Risk Register</h2>
          <p className="section-desc">
            Identify, assess (probability & impact), and monitor operational risks, mitigation strategies, and resolution statuses.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Record New Risk
        </button>
      </div>

      <div className="metrics-row">
        <div className="metric-pill">
          <span className="metric-num">{risks.length}</span>
          <span className="metric-label">Registered Risks</span>
        </div>
        <div className="metric-pill risk-open">
          <span className="metric-num">{risks.filter((r) => r.status === 'open').length}</span>
          <span className="metric-label">Open</span>
        </div>
        <div className="metric-pill risk-in-prog">
          <span className="metric-num">{risks.filter((r) => r.status === 'in_progress').length}</span>
          <span className="metric-label">In Mitigation</span>
        </div>
        <div className="metric-pill risk-mitigated">
          <span className="metric-num">{risks.filter((r) => r.status === 'mitigated' || r.status === 'resolved').length}</span>
          <span className="metric-label">Resolved / Mitigated</span>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Risk Title & Root Cause</th>
                <th>Linked Requirement</th>
                <th>Prob (1-5)</th>
                <th>Impact (1-5)</th>
                <th>Score</th>
                <th>Lifecycle Status</th>
                <th>Risk Lead</th>
                <th>Mitigation Strategy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.risk_id}>
                  <td>
                    <strong>{risk.title}</strong>
                    <p className="table-desc">{risk.description}</p>
                  </td>
                  <td>
                    {risk.requirement_code ? (
                      <span className="code-badge">{risk.requirement_code}</span>
                    ) : (
                      'Global / Project'
                    )}
                  </td>
                  <td className="cell-num">{risk.probability}/5</td>
                  <td className="cell-num">{risk.impact}/5</td>
                  <td>
                    <span className={`score-badge ${getRiskScoreClass(risk.probability, risk.impact)}`}>
                      {risk.probability * risk.impact}
                    </span>
                  </td>
                  <td>
                    <select
                      className={`status-select status-${risk.status}`}
                      value={risk.status}
                      onChange={(e) => onUpdateRisk(risk.risk_id, { status: e.target.value as Risk['status'] })}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td>{risk.owner_name || '—'}</td>
                  <td>
                    <span className="mitigation-text">{risk.mitigation_plan || '—'}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-link-danger"
                      onClick={() => onDeleteRisk(risk.risk_id)}
                      title="Delete risk"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {risks.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-state">No risks logged in register.</td>
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
              <h3>Log Operational Risk</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-group">
                <label>Risk Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule compression on requirement coding"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Root Cause & Impact Description *</label>
                <textarea
                  rows={2}
                  placeholder="Trigger events, failure modes, and potential consequences..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Linked Requirement (Optional)</label>
                  <select
                    value={reqId}
                    onChange={(e) => setReqId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Global / System-Wide --</option>
                    {requirements.map((r) => (
                      <option key={r.requirement_id} value={r.requirement_id}>
                        [{r.requirement_code}] {r.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assigned Risk Lead</label>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Probability (1: Rare to 5: High)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={probability}
                    onChange={(e) => setProbability(Number(e.target.value))}
                  />
                  <span className="range-indicator">{probability} / 5</span>
                </div>
                <div className="form-group">
                  <label>Impact Severity (1: Low to 5: Critical)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={impact}
                    onChange={(e) => setImpact(Number(e.target.value))}
                  />
                  <span className="range-indicator">{impact} / 5</span>
                </div>
                <div className="form-group">
                  <label>Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Risk['status'])}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="mitigated">Mitigated</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Mitigation Strategy & Action Items</label>
                <textarea
                  rows={2}
                  placeholder="Preventative controls, fallback contingency, or mitigation protocol..."
                  value={mitigationPlan}
                  onChange={(e) => setMitigationPlan(e.target.value)}
                />
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
                  {loading ? 'Saving...' : 'Register Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
