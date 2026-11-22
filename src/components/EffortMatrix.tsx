import React, { useState } from 'react';
import type { EffortMatrixData, RequirementType } from '../types';
import './EffortMatrix.css';

interface EffortMatrixProps {
  matrixData: EffortMatrixData | null;
  loading: boolean;
  onRefresh: () => void;
}

export const EffortMatrix: React.FC<EffortMatrixProps> = ({ matrixData, loading, onRefresh }) => {
  const [typeFilter, setTypeFilter] = useState<'all' | RequirementType>('all');

  if (loading && !matrixData) {
    return <div className="loading-spinner">Computing resource allocations...</div>;
  }

  const rawReqs = matrixData?.requirements || [];
  const filteredReqs = rawReqs.filter((r) => {
    if (typeFilter === 'all') return true;
    return r.requirement_type === typeFilter;
  });

  const totals = matrixData?.phase_totals || {
    requirements_analysis_hours: 0,
    designing_hours: 0,
    coding_hours: 0,
    testing_hours: 0,
    project_management_hours: 0,
    total_expended_hours: 0,
  };

  const handleExportCSV = () => {
    if (rawReqs.length === 0) return;
    const headers = [
      'Requirement Code',
      'Title',
      'Type',
      'Requirements Analysis (hrs)',
      'Designing (hrs)',
      'Coding (hrs)',
      'Testing (hrs)',
      'Project Management (hrs)',
      'Total Expended (hrs)',
    ];

    const rows = rawReqs.map((r) => [
      `"${r.requirement_code}"`,
      `"${r.requirement_title.replace(/"/g, '""')}"`,
      r.requirement_type,
      r.requirements_analysis_hours,
      r.designing_hours,
      r.coding_hours,
      r.testing_hours,
      r.project_management_hours,
      r.total_expended_hours,
    ]);

    // Total row
    rows.push([
      '"TOTAL"',
      '"All Requirements"',
      '""',
      totals.requirements_analysis_hours,
      totals.designing_hours,
      totals.coding_hours,
      totals.testing_hours,
      totals.project_management_hours,
      totals.total_expended_hours,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `effort_matrix_project_${matrixData?.project_id || 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="section-container effort-dashboard">
      <div className="section-header analytics-header">
        <div>
          <span className="analytics-eyebrow">PROJECT OVERVIEW</span>
          <h2>Effort Allocation & Lifecycle Matrix</h2>
          <p className="section-desc">
            Real-time aggregation of expended person-hours categorized by requirement and software development lifecycle phase.
          </p>
        </div>
        <div className="header-button-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCSV}
            disabled={rawReqs.length === 0}
            title="Download matrix as CSV spreadsheet"
          >
            📥 Export CSV
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      <div className="summary-cards-row">
        <div className="summary-card total">
          <span className="card-label">Total Expended Effort</span>
          <span className="card-value">{totals.total_expended_hours}h</span>
          <span className="card-sub">Cumulative Across 5 Phases</span>
        </div>
        <div className="summary-card phase-card p1">
          <span className="card-label">1. Requirements Analysis</span>
          <span className="card-value">{totals.requirements_analysis_hours}h</span>
          <span className="card-sub">
            {totals.total_expended_hours > 0
              ? `${Math.round((totals.requirements_analysis_hours / totals.total_expended_hours) * 100)}% of effort`
              : '0%'}
          </span>
        </div>
        <div className="summary-card phase-card p2">
          <span className="card-label">2. Designing</span>
          <span className="card-value">{totals.designing_hours}h</span>
          <span className="card-sub">
            {totals.total_expended_hours > 0
              ? `${Math.round((totals.designing_hours / totals.total_expended_hours) * 100)}% of effort`
              : '0%'}
          </span>
        </div>
        <div className="summary-card phase-card p3">
          <span className="card-label">3. Coding</span>
          <span className="card-value">{totals.coding_hours}h</span>
          <span className="card-sub">
            {totals.total_expended_hours > 0
              ? `${Math.round((totals.coding_hours / totals.total_expended_hours) * 100)}% of effort`
              : '0%'}
          </span>
        </div>
        <div className="summary-card phase-card p4">
          <span className="card-label">4. Testing</span>
          <span className="card-value">{totals.testing_hours}h</span>
          <span className="card-sub">
            {totals.total_expended_hours > 0
              ? `${Math.round((totals.testing_hours / totals.total_expended_hours) * 100)}% of effort`
              : '0%'}
          </span>
        </div>
        <div className="summary-card phase-card p5">
          <span className="card-label">5. Project Management</span>
          <span className="card-value">{totals.project_management_hours}h</span>
          <span className="card-sub">
            {totals.total_expended_hours > 0
              ? `${Math.round((totals.project_management_hours / totals.total_expended_hours) * 100)}% of effort`
              : '0%'}
          </span>
        </div>
      </div>

      <div className="filter-bar analytics-filter-bar">
        <div className="btn-group">
          <button
            type="button"
            className={`btn-filter ${typeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTypeFilter('all')}
          >
            All Requirements ({rawReqs.length})
          </button>
          <button
            type="button"
            className={`btn-filter ${typeFilter === 'functional' ? 'active' : ''}`}
            onClick={() => setTypeFilter('functional')}
          >
            Functional Only ({rawReqs.filter((r) => r.requirement_type === 'functional').length})
          </button>
          <button
            type="button"
            className={`btn-filter ${typeFilter === 'non_functional' ? 'active' : ''}`}
            onClick={() => setTypeFilter('non_functional')}
          >
            Non-Functional Only ({rawReqs.filter((r) => r.requirement_type === 'non_functional').length})
          </button>
        </div>
        <span className="filter-summary">
          Showing <strong>{filteredReqs.length}</strong> of {rawReqs.length} requirements
        </span>
      </div>

      <div className="card matrix-card">
        <h3>Cumulative Hours by Requirement & SDLC Phase</h3>
        <p className="hint">
          Comprehensive lifecycle audit trail displaying real-time allocation breakdown across all phases for each entered requirement.
        </p>

        <div className="table-responsive">
          <table className="data-table matrix-table">
            <thead>
              <tr className="header-phases">
                <th rowSpan={2} className="th-code">Code</th>
                <th rowSpan={2} className="th-title">Requirement Title & Scope</th>
                <th colSpan={5} className="th-phases-group">
                  Software Development Lifecycle (SDLC) Phases (Hours)
                </th>
                <th rowSpan={2} className="th-total">Total Expended</th>
              </tr>
              <tr className="subheader-phases">
                <th>1. Requirements Analysis</th>
                <th>2. Designing</th>
                <th>3. Coding</th>
                <th>4. Testing</th>
                <th>5. Project Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredReqs.map((row) => (
                <tr key={row.requirement_id}>
                  <td>
                    <span className={`code-badge ${row.requirement_type}`}>
                      {row.requirement_code}
                    </span>
                  </td>
                  <td>
                    <strong>{row.requirement_title}</strong>
                    <span className={`type-tag-inline ${row.requirement_type}`}>
                      {row.requirement_type === 'functional' ? 'FR' : 'NFR'}
                    </span>
                  </td>
                  <td className="cell-num">{row.requirements_analysis_hours > 0 ? `${row.requirements_analysis_hours}h` : '—'}</td>
                  <td className="cell-num">{row.designing_hours > 0 ? `${row.designing_hours}h` : '—'}</td>
                  <td className="cell-num">{row.coding_hours > 0 ? `${row.coding_hours}h` : '—'}</td>
                  <td className="cell-num">{row.testing_hours > 0 ? `${row.testing_hours}h` : '—'}</td>
                  <td className="cell-num">{row.project_management_hours > 0 ? `${row.project_management_hours}h` : '—'}</td>
                  <td className="cell-total">
                    <strong>{row.total_expended_hours}h</strong>
                  </td>
                </tr>
              ))}
              {filteredReqs.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-state">
                    No requirements match the current selection. Go to the <strong>Requirements</strong> tab to enter requirements.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredReqs.length > 0 && (
              <tfoot>
                <tr className="matrix-totals-row">
                  <td colSpan={2}>
                    <strong>LIFECYCLE PHASE TOTALS:</strong>
                  </td>
                  <td className="cell-num"><strong>{totals.requirements_analysis_hours}h</strong></td>
                  <td className="cell-num"><strong>{totals.designing_hours}h</strong></td>
                  <td className="cell-num"><strong>{totals.coding_hours}h</strong></td>
                  <td className="cell-num"><strong>{totals.testing_hours}h</strong></td>
                  <td className="cell-num"><strong>{totals.project_management_hours}h</strong></td>
                  <td className="cell-total grand-total">
                    <strong>{totals.total_expended_hours}h</strong>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
