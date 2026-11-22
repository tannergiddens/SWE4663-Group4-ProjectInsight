import React, { useState } from 'react';
import type { Project } from '../types';
import { ClientProfileModal } from './ClientProfileModal';
import './Header.css';

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
  const [showClientInfo, setShowClientInfo] = useState(false);

  const tabs = [
    { id: 'matrix', label: 'Dashboard', icon: '▦' },
    { id: 'overview', label: 'Project Information', icon: '□' },
    { id: 'requirements', label: 'Requirements', icon: '▣' },
    { id: 'logger', label: 'Timesheet Entry', icon: '◷' },
    { id: 'risks', label: 'Risk Register', icon: '△' },
  ];

  return (
    <header className="app-header">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo-badge">PI</div>
          <h1>Project Insight</h1>
        </div>

        <div className="sidebar-project">
          <label className="sidebar-label">Active Project</label>
          <select
            className="sidebar-project-dropdown"
            value={currentProject?.project_id || ''}
            onChange={(e) => onSelectProject(Number(e.target.value))}
          >
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="nav-icon" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-links">
          <button type="button"><span className="nav-icon" aria-hidden="true">☼</span> Settings</button>
          <button type="button"><span className="nav-icon" aria-hidden="true">?</span> Help &amp; getting started</button>
        </div>
      </aside>

      <div className="header-main">
        <div className="header-top">
          <div className="topbar-title">
            <h1>
              {activeTab === 'matrix'
                ? 'Effort Analytics'
                : tabs.find((tab) => tab.id === activeTab)?.label || 'Effort Analytics'}
            </h1>
            <p className="subtitle">Enterprise Resource Intelligence &amp; SDLC Effort Monitoring</p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-client"
              onClick={() => setShowClientInfo(true)}
              aria-haspopup="dialog"
            >
              ↗&nbsp; Client Information
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenNewProjectModal}
            >
              + New Project
            </button>
          </div>
        </div>
      </div>

      {/* Client Profile Modal */}
      <ClientProfileModal
        isOpen={showClientInfo}
        onClose={() => setShowClientInfo(false)}
        projectId={currentProject?.project_id}
      />
    </header>
  );
};
