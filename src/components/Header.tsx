import React, { useEffect, useState } from 'react';
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

  const [showClientInfo, setShowClientInfo] = useState(false);

  const [clientInfo, setClientInfo] = useState<
    Record<string, string | number | null> | null
  >(null);

  const [clientLoading, setClientLoading] = useState(false);

  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
      if (!showClientInfo) {
        return;
      }

      const projectId = currentProject?.project_id;

      if (!projectId) {
        setClientInfo(null);
        setClientError('No project selected.');
        setClientLoading(false);
        return;
      }

      const controller = new AbortController();

      const fetchClientInfo = async () => {
        setClientLoading(true);
        setClientError(null);
        setClientInfo(null);

        try {
          const response = await fetch(
            `/api/projects/${projectId}/client`,
            {
              method: 'GET',
              signal: controller.signal,
            }
          );

          if (!response.ok) {
            throw new Error(
              response.status === 404
                ? 'No client information found for this project.'
                : `Failed to load client information (${response.status}).`
            );
          }

          const data = await response.json();

          if (!controller.signal.aborted) {
            setClientInfo(data);
          }

        } catch (error) {
          if (!controller.signal.aborted) {
            setClientError(
              error instanceof Error
                ? error.message
                : 'Unable to retrieve client information.'
            );
          }
        } finally {
          if (!controller.signal.aborted) {
            setClientLoading(false);
          }
        }
      };

      void fetchClientInfo();

      return () => {
        controller.abort();
      };

    }, [showClientInfo, currentProject?.project_id]);

  const clientFields = [
    { key: 'client_id', label: 'Client ID' },
    { key: 'client_name', label: 'Client Name' },
    { key: 'contact_title', label: 'Contact Title' },
    { key: 'address_line1', label: 'Address Line 1' },
    { key: 'address_line2', label: 'Address Line 2' },
    { key: 'city', label: 'City' },
    { key: 'state_region', label: 'State / Region' },
    { key: 'postal_code', label: 'Postal Code' },
    { key: 'country', label: 'Country' },
    { key: 'direct_phone', label: 'Direct Phone' },
    { key: 'mobile_phone', label: 'Mobile Phone' },
    { key: 'email', label: 'Email' },
  ];

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
            
            {/* Client Information Button */}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowClientInfo(true)}
                aria-haspopup="dialog"
                style={{
                  padding: '10px 16px',
                  background: 'rgba(148, 163, 184, 0.12)',
                  color: 'inherit',
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  borderRadius: 9,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                🏢 Client Information ↗
              </button>
            </div>

            {/* Client Profile Modal */}
            {showClientInfo && (
              <div
                role="presentation"
                onClick={() => setShowClientInfo(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 9999,
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 20,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="client-profile-title"
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setShowClientInfo(false);
                    }
                  }}
                  style={{
                    width: '100%',
                    maxWidth: 720,
                    maxHeight: '85vh',
                    overflowY: 'hidden',
                    background: '#ffffff',
                    color: '#1e293b',
                    borderRadius: 14,
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
                    padding: 24,
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      paddingBottom: 16,
                      marginBottom: 24,
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <h2
                        id="client-profile-title"
                        style={{
                          margin: 0,
                          fontSize: 21,
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        Client Profile
                      </h2>

                      <p
                        style={{
                          margin: '5px 0 0',
                          fontSize: 12,
                          color: '#64748b',
                        }}
                      >
                        Business details and contact information
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowClientInfo(false)}
                      aria-label="Close client profile"
                      style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 22,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Read-only Client Profile */}
                  {clientLoading && (
                    <div
                      style={{
                        padding: '18px 0',
                        color: '#64748b',
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                    >
                      Loading client information...
                    </div>
                  )}

                  {clientError && (
                    <div
                      role="alert"
                      style={{
                        padding: 14,
                        background: '#fef2f2',
                        color: '#b91c1c',
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 16,
                      }}
                    >
                      {clientError}
                    </div>
                  )}

                   {!clientLoading && !clientError && clientInfo && (
                    <>
                      {[
                        {
                      title: 'CLIENT OVERVIEW',
                      icon: '🏢',
                      fields: [
                        ['client_id', 'Client ID'],
                        ['client_name', 'Client Name'],
                        ['contact_title', 'Contact Title'],
                      ],
                    },
                    {
                      title: 'BUSINESS ADDRESS',
                      icon: '📍',
                      fields: [
                        ['address_line1', 'Address Line 1'],
                        ['address_line2', 'Address Line 2'],
                        ['city', 'City'],
                        ['state_region', 'State / Region'],
                        ['postal_code', 'Postal Code'],
                        ['country', 'Country'],
                      ],
                    },
                    {
                      title: 'CONTACT INFORMATION',
                      icon: '☎️',
                      fields: [
                        ['direct_phone', 'Direct Phone'],
                        ['mobile_phone', 'Mobile Phone'],
                        ['email', 'Email'],
                      ],
                    },
                  ].map(section => (
                    <section
                      key={section.title}
                      style={{ marginBottom: 24 }}
                    >
                      {/* Section Heading */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          color: '#64748b',
                        }}
                      >
                        <span>{section.icon}</span>
                        {section.title}
                      </div>

                      {/* Formal Information Table */}
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 9,
                          overflow: 'hidden',
                        }}
                      >
                        {section.fields.map(([key, label], index) => {
                          const value = clientInfo?.[key];

                          return (
                            <div
                              key={key}
                              style={{
                                display: 'grid',
                                gridTemplateColumns:
                                  'minmax(115px, 35%) minmax(0, 1fr)',
                                background:
                                  index % 2 === 0
                                    ? '#f8fafc'
                                    : '#ffffff',
                                borderBottom:
                                  index < section.fields.length - 1
                                    ? '1px solid #e2e8f0'
                                    : 'none',
                              }}
                            >
                              {/* Field Label */}
                              <div
                                style={{
                                  padding: '11px 14px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: '#64748b',
                                  borderRight: '1px solid #e2e8f0',
                                }}
                              >
                                {label}
                              </div>

                              {/* Read-only Field Value */}
                              <div
                                style={{
                                  padding: '11px 14px',
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: '#1e293b',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {value === null ||
                                value === undefined ||
                                value === ''
                                  ? '—'
                                  : value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                   </>
              )}

                  {/* Modal Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      paddingTop: 16,
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowClientInfo(false)}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '10px 24px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}



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
