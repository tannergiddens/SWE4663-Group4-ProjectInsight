import React, { useState, useEffect } from 'react';
import type { Requirement, SDLCPhase, User, TimeEntry } from '../types';

interface EffortLoggerProps {
  requirements: Requirement[];
  phases: SDLCPhase[];
  users: User[];
  recentEntries: TimeEntry[];
  onLogEffort: (data: {
    requirement_id: number;
    user_id?: number;
    contributor_name?: string;
    phase_id?: number;
    phase_hours?: Record<string, number>;
    period_type: 'daily' | 'weekly';
    period_start: string;
    period_end?: string;
    hours?: number;
    notes?: string;
  }) => Promise<void>;
}

export const EffortLogger: React.FC<EffortLoggerProps> = ({
  requirements,
  phases,
  users,
  recentEntries,
  onLogEffort,
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [reqId, setReqId] = useState<number>(requirements[0]?.requirement_id || 1);
  const [selectedUserMode, setSelectedUserMode] = useState<'existing' | 'custom'>('existing');
  const [userId, setUserId] = useState<number>(users[0]?.user_id || 1);
  const [customContributor, setCustomContributor] = useState('');

  const [periodType, setPeriodType] = useState<'daily' | 'weekly'>('daily');
  const [entryMode, setEntryMode] = useState<'single' | 'breakdown'>('breakdown');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Single phase mode
  const [singlePhaseId, setSinglePhaseId] = useState<number>(phases[0]?.phase_id || 1);
  const [singleHours, setSingleHours] = useState<number>(4);

  // 5-phase breakdown mode
  const [phaseHours, setPhaseHours] = useState<Record<string, number>>({
    '1': 0, // Requirements Analysis
    '2': 0, // Designing
    '3': 0, // Coding
    '4': 0, // Testing
    '5': 0, // Project Management
  });

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (requirements.length > 0 && !requirements.some((r) => r.requirement_id === reqId)) {
      setReqId(requirements[0].requirement_id);
    }
  }, [requirements, reqId]);

  const handlePhaseHourChange = (phaseId: number, val: number) => {
    setPhaseHours((prev) => ({
      ...prev,
      [phaseId.toString()]: Math.max(0, val),
    }));
  };

  const totalBreakdownHours = Object.values(phaseHours).reduce((sum, h) => sum + (Number(h) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqId) return;

    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const contributorName = selectedUserMode === 'custom' && customContributor.trim() ? customContributor.trim() : undefined;
      const targetUserId = selectedUserMode === 'existing' ? Number(userId) : undefined;

      if (entryMode === 'breakdown') {
        if (totalBreakdownHours <= 0) {
          alert('Please enter at least some hours (> 0) in one of the 5 SDLC phases.');
          setSubmitting(false);
          return;
        }

        await onLogEffort({
          requirement_id: Number(reqId),
          user_id: targetUserId,
          contributor_name: contributorName,
          phase_hours: phaseHours,
          period_type: periodType,
          period_start: startDate,
          period_end: periodType === 'weekly' ? endDate : startDate,
          notes: notes.trim() || undefined,
        });

        setSuccessMsg(`Recorded ${totalBreakdownHours} total person-hours across lifecycle phases.`);
        setPhaseHours({ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 });
      } else {
        if (!singleHours || singleHours <= 0) {
          alert('Please enter hours greater than 0.');
          setSubmitting(false);
          return;
        }

        await onLogEffort({
          requirement_id: Number(reqId),
          user_id: targetUserId,
          contributor_name: contributorName,
          phase_id: Number(singlePhaseId),
          hours: Number(singleHours),
          period_type: periodType,
          period_start: startDate,
          period_end: periodType === 'weekly' ? endDate : startDate,
          notes: notes.trim() || undefined,
        });

        setSuccessMsg(`Recorded ${singleHours} person-hours into timesheet.`);
      }

      setNotes('');
      setTimeout(() => setSuccessMsg(null), 4500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="section-container">
      <div className="section-header">
        <div>
          <h2>Timesheet & Effort Logging</h2>
          <p className="section-desc">
            Enter person-hours expended on a <strong>daily</strong> or <strong>weekly</strong> basis across the 5 SDLC phases for each earlier entered requirement.
          </p>
        </div>
      </div>

      {successMsg && <div className="alert-success">{successMsg}</div>}

      <div className="logger-layout">
        <div className="card effort-form-card">
          <h3>Log Person-Hours Expended</h3>
          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-group">
              <label>Select Target Requirement *</label>
              {requirements.length === 0 ? (
                <div className="alert-warning-inline">
                  No requirements exist for this project yet. Please go to the <strong>Requirements</strong> tab to enter requirements first.
                </div>
              ) : (
                <select
                  value={reqId}
                  onChange={(e) => setReqId(Number(e.target.value))}
                  required
                >
                  {requirements.map((r) => (
                    <option key={r.requirement_id} value={r.requirement_id}>
                      [{r.requirement_code}] {r.title} ({r.requirement_type === 'functional' ? 'FR' : 'NFR'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Contributor</label>
              <div className="contributor-toggle">
                <button
                  type="button"
                  className={`btn-sub ${selectedUserMode === 'existing' ? 'active' : ''}`}
                  onClick={() => setSelectedUserMode('existing')}
                >
                  Select Existing User
                </button>
                <button
                  type="button"
                  className={`btn-sub ${selectedUserMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setSelectedUserMode('custom')}
                >
                  Type Any Name
                </button>
              </div>

              {selectedUserMode === 'existing' ? (
                <select
                  value={userId}
                  onChange={(e) => setUserId(Number(e.target.value))}
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Enter contributor's full name"
                  value={customContributor}
                  onChange={(e) => setCustomContributor(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cadence (Daily or Weekly) *</label>
                <div className="period-toggle">
                  <label className={`radio-pill ${periodType === 'daily' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="periodType"
                      value="daily"
                      checked={periodType === 'daily'}
                      onChange={() => setPeriodType('daily')}
                    />
                    📅 Daily
                  </label>
                  <label className={`radio-pill ${periodType === 'weekly' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="periodType"
                      value="weekly"
                      checked={periodType === 'weekly'}
                      onChange={() => setPeriodType('weekly')}
                    />
                    📆 Weekly
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Entry Layout</label>
                <div className="period-toggle">
                  <label className={`radio-pill ${entryMode === 'breakdown' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="entryMode"
                      value="breakdown"
                      checked={entryMode === 'breakdown'}
                      onChange={() => setEntryMode('breakdown')}
                    />
                    ⚡ 5-Phase Grid
                  </label>
                  <label className={`radio-pill ${entryMode === 'single' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="entryMode"
                      value="single"
                      checked={entryMode === 'single'}
                      onChange={() => setEntryMode('single')}
                    />
                    Single Phase
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{periodType === 'daily' ? 'Log Date' : 'Week Start Date'} *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              {periodType === 'weekly' && (
                <div className="form-group">
                  <label>Week End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {entryMode === 'breakdown' ? (
              <div className="phases-grid-container">
                <label className="phase-grid-header">
                  Enter Person-Hours for each SDLC Phase:
                </label>
                <div className="phases-grid">
                  {phases.map((p) => (
                    <div key={p.phase_id} className="phase-input-box">
                      <span className="phase-name">{p.sequence_no}. {p.phase_name}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={phaseHours[p.phase_id.toString()] || ''}
                        onChange={(e) => handlePhaseHourChange(p.phase_id, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid-total-row">
                  <span>Total Hours to Commit:</span>
                  <strong>{totalBreakdownHours} hrs</strong>
                </div>
              </div>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label>Lifecycle Phase *</label>
                  <select
                    value={singlePhaseId}
                    onChange={(e) => setSinglePhaseId(Number(e.target.value))}
                  >
                    {phases.map((p) => (
                      <option key={p.phase_id} value={p.phase_id}>
                        {p.sequence_no}. {p.phase_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hours Expended *</label>
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={singleHours}
                    onChange={(e) => setSingleHours(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Work Summary / Activity Notes</label>
              <textarea
                rows={2}
                placeholder="Optional engineering notes for this period..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting || requirements.length === 0}
            >
              {submitting ? 'Recording Entry...' : 'Commit Timesheet Entry'}
            </button>
          </form>
        </div>

        <div className="card recent-logs-card">
          <h3>Recent Timesheet Audit Trail</h3>
          <p className="hint">Latest entries committed to this project's resource ledger.</p>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Contributor</th>
                  <th>Req</th>
                  <th>Phase</th>
                  <th>Cadence</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.slice(0, 10).map((entry) => (
                  <tr key={entry.entry_id}>
                    <td>{entry.period_start}</td>
                    <td><strong>{entry.user_name}</strong></td>
                    <td><span className="code-badge">{entry.requirement_code}</span></td>
                    <td><span className="phase-badge">{entry.phase_name}</span></td>
                    <td><span className="period-badge">{entry.period_type}</span></td>
                    <td><strong className="hours-highlight">{entry.hours}h</strong></td>
                  </tr>
                ))}
                {recentEntries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-state">No time entries recorded for this project yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
