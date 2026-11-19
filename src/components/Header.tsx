import React from 'react';
import type { Project } from '../types';

interface HeaderProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (id: number) => void;
  onOpenNewProjectModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projects,
  currentProject,
  onSelectProject,
  onOpenNewProjectModal,
  activeTab,
  setActiveTab,
}) => {
  const tabs = [
    { id: 'matrix', label: '📊 Effort Analytics' },
    { id: 'logger', label: '⏱️ Timesheet Entry' },
    { id: 'requirements', label: '📋 Requirements' },
    { id: 'overview', label: '🏢 Project & Team' },
    { id: 'risks', label: '⚠️ Risk Register' },
  ];

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-brand">
          <div className="logo-badge">PI</div>
          <div>
            <h1>Project Insight</h1>
            <p className="subtitle">Enterprise Resource Intelligence & SDLC Effort Monitoring</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="project-selector-wrapper">
            <label className="selector-label">Active Project:</label>
            <select
              className="project-dropdown"
              value={currentProject?.project_id || ''}
              onChange={(e) => onSelectProject(Number(e.target.value))}
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name} ({p.total_hours || 0} hrs)
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenNewProjectModal}
          >
            + New Project
          </button>
        </div>
      </div>

      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
