import { useState, useEffect, useCallback } from 'react';
import type {
  Project,
  ProjectMember,
  Requirement,
  SDLCPhase,
  TimeEntry,
  EffortMatrixData,
  Risk,
  User,
} from './types';
import { api } from './api';
import { Header } from './components/Header';
import { EffortMatrix } from './components/EffortMatrix';
import { EffortLogger } from './components/EffortLogger';
import { RequirementsView } from './components/RequirementsView';
import { ProjectOverview } from './components/ProjectOverview';
import { RiskManagement } from './components/RiskManagement';
import './App.css';

interface ClientDetails {
  client_id: number;
  client_name: string;
  contact_title: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state_region: string | null;
  postal_code: string | null;
  country: string;
  direct_phone: string;
  mobile_phone: string | null;
  email: string | null;
}

function App() {
  const [activeTab, setActiveTab] = useState<string>('matrix');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Projects list and active selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number>(1);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // New Project Modal State
  const [showNewProjectModal, setShowNewProjectModal] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectOwner, setNewProjectOwner] = useState<string>('');
  const [newProjectDesc, setNewProjectDesc] = useState<string>('');
  const [newProjectMethodology, setNewProjectMethodology] = useState<string>('Agile / Iterative');
  const [newProjectEndDate, setNewProjectEndDate] = useState<string>('');
  const [creatingProject, setCreatingProject] = useState<boolean>(false);
  const [showNewClientDetails, setShowNewClientDetails] = useState(false);

  const [clientMode, setClientMode] = useState<'existing' | 'new'>(
  'existing'
  );

  const [availableClients, setAvailableClients] = useState<
    { client_id: number; client_name: string }[]
  >([]);

  const [selectedClientId, setSelectedClientId] = useState('');

  const [selectedClient, setSelectedClient] =
    useState<ClientDetails | null>(null);

  const [clientsLoading, setClientsLoading] = useState(false);

  const [clientLookupError, setClientLookupError] =
    useState<string | null>(null);

  const emptyNewClient = {
    client_name: '',
    contact_title: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state_region: '',
    postal_code: '',
    country: '',
    direct_phone: '',
    mobile_phone: '',
    email: '',
  };

  const [newClient, setNewClient] = useState(emptyNewClient);

  type NewClientField = keyof typeof emptyNewClient;

  const updateNewClient = (
    field: NewClientField,
    value: string
  ) => {
    setNewClient(prev => ({
      ...prev,
      [field]: value,
    }));
  };  

  useEffect(() => {
    if (!showNewProjectModal) return;

    const controller = new AbortController();

    const loadClients = async () => {
      setClientsLoading(true);
      setClientLookupError(null);

      try {
        const response = await fetch('/api/clients', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to load existing clients.');
        }

        const data: {
          client_id: number;
          client_name: string;
        }[] = await response.json();

        if (!controller.signal.aborted) {
          setAvailableClients(data);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setClientLookupError(
            error instanceof Error
              ? error.message
              : 'Unable to load clients.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setClientsLoading(false);
        }
      }
    };

    void loadClients();

    return () => controller.abort();
  }, [showNewProjectModal]);

  useEffect(() => {
    if (
      !showNewProjectModal ||
      clientMode !== 'existing' ||
      !selectedClientId
    ) {
      setSelectedClient(null);
      return;
    }

    const controller = new AbortController();

    const loadClientDetails = async () => {
      setSelectedClient(null);
      setClientLookupError(null);

      try {
        const response = await fetch(
          `/api/clients/${selectedClientId}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Unable to retrieve client details.');
        }

        const client: ClientDetails = await response.json();

        if (!controller.signal.aborted) {
          setSelectedClient(client);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setClientLookupError(
            error instanceof Error
              ? error.message
              : 'Unable to load client details.'
          );
        }
      }
    };

    void loadClientDetails();

    return () => controller.abort();
  }, [showNewProjectModal, clientMode, selectedClientId]);

  // Active Project Data
  const [phases, setPhases] = useState<SDLCPhase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [matrixData, setMatrixData] = useState<EffortMatrixData | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);

  // 1. Initial Load of Projects list & global phases/users
  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [allProjects, allPhases, allUsers] = await Promise.all([
        api.getProjects().catch(() => []),
        api.getPhases().catch(() => []),
        api.getUsers().catch(() => []),
      ]);

      setProjects(allProjects);
      setPhases(allPhases);
      setUsers(allUsers);

      if (allProjects.length > 0) {
        // Default to first project if current not in list
        const activeId = allProjects[0].project_id;
        setCurrentProjectId(activeId);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize project management suite');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // 2. Load Active Project details whenever currentProjectId changes
  const loadProjectDetails = useCallback(async (projId: number) => {
    if (!projId) return;
    try {
      const [
        proj,
        membersData,
        reqsData,
        matrix,
        entries,
        risksData,
      ] = await Promise.all([
        api.getProject(projId).catch(() => null),
        api.getProjectMembers(projId).catch(() => []),
        api.getRequirements(projId).catch(() => []),
        api.getEffortMatrix(projId).catch(() => null),
        api.getTimeEntries(projId).catch(() => []),
        api.getRisks(projId).catch(() => []),
      ]);

      if (proj) setCurrentProject(proj);
      setMembers(membersData);
      setRequirements(reqsData);
      setMatrixData(matrix);
      setRecentEntries(entries);
      setRisks(risksData);
    } catch (err) {
      setError((err as Error).message || 'Failed to load project data');
    }
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectDetails(currentProjectId);
    }
  }, [currentProjectId, loadProjectDetails]);

  // Project creation handler
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProjectName.trim() || !newProjectDesc.trim()) {
      return;
    }

    if (clientMode === 'existing') {
      if (
        !selectedClientId ||
        !selectedClient ||
        selectedClient.client_id !== Number(selectedClientId)
      ) {
        alert('Please select an existing client.');
        return;
      }
    } else {
      if (
        !newClient.client_name.trim() ||
        !newClient.address_line1.trim() ||
        !newClient.city.trim() ||
        !newClient.country.trim() ||
        !newClient.direct_phone.trim()
      ) {
        alert('Please complete the required client information.');
        return;
      }
    }

    setCreatingProject(true);

    try {
      const clientPayload =
        clientMode === 'existing'
          ? {
              client_id: Number(selectedClientId),
            }
          : {
              client: {
                ...newClient,
              },
            };

      const created = await api.createProject({
        project_name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        owner_name:
          newProjectOwner.trim() || 'Lead Project Manager',
        methodology: newProjectMethodology,
        target_end_date: newProjectEndDate || undefined,
        ...clientPayload,
      });

      console.log('Created project response:', created);

      // Project creation succeeded.
      // Reset all form fields.
      setNewProjectName('');
      setNewProjectOwner('');
      setNewProjectDesc('');
      setNewProjectMethodology('Agile / Iterative');
      setNewProjectEndDate('');

      setClientMode('existing');
      setSelectedClientId('');
      setSelectedClient(null);
      setNewClient({ ...emptyNewClient });
      setShowNewClientDetails(false);
      setClientLookupError(null);

      // Close the modal after successful creation.
      setShowNewProjectModal(false);

      // Select the newly created project.
      setCurrentProjectId(created.project_id);

      // Refresh the project list separately.
      try {
        const updatedProjects = await api.getProjects();
        setProjects(updatedProjects);
      } catch (refreshError) {
        console.error(
          'Project created but project list refresh failed:',
          refreshError
        );

        setError(
          'Project created successfully, but the project list could not be refreshed.'
        );
      }

    } catch (err) {
      console.error('Project creation failed:', err);

      alert(
        (err as Error).message ||
        'Failed to create new project'
      );

    } finally {
      setCreatingProject(false);
    }
  };


  // Handlers for Project Updates
  const handleUpdateProject = async (data: Partial<Project> & { owner_name?: string }) => {
    if (!currentProject) return;
    const updated = await api.updateProject(currentProject.project_id, data);
    setCurrentProject(updated);
    // Refresh project dropdown
    const updatedProjects = await api.getProjects();
    setProjects(updatedProjects);
  };

  const handleAddMember = async (data: { full_name: string; role_name: string; email?: string }) => {
    await api.addProjectMember(currentProjectId, data);
    const updatedMembers = await api.getProjectMembers(currentProjectId);
    setMembers(updatedMembers);
  };

  const handleRemoveMember = async (memberId: number) => {
    await api.removeProjectMember(currentProjectId, memberId);
    setMembers((prev) => prev.filter((m) => m.member_id !== memberId));
  };

  // Requirements handlers
  const handleAddRequirement = async (data: Partial<Requirement>) => {
    await api.createRequirement(currentProjectId, data);
    const [updatedReqs, updatedMatrix] = await Promise.all([
      api.getRequirements(currentProjectId),
      api.getEffortMatrix(currentProjectId),
    ]);
    setRequirements(updatedReqs);
    setMatrixData(updatedMatrix);
  };

  const handleDeleteRequirement = async (id: number) => {
    await api.deleteRequirement(id);
    const [updatedReqs, updatedMatrix] = await Promise.all([
      api.getRequirements(currentProjectId),
      api.getEffortMatrix(currentProjectId),
    ]);
    setRequirements(updatedReqs);
    setMatrixData(updatedMatrix);
  };

  // Effort Logging handler
  const handleLogEffort = async (data: {
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
  }) => {
    await api.logEffort({ project_id: currentProjectId, ...data });
    const [updatedMatrix, updatedEntries, updatedProject, allProjects] = await Promise.all([
      api.getEffortMatrix(currentProjectId),
      api.getTimeEntries(currentProjectId),
      api.getProject(currentProjectId),
      api.getProjects(),
    ]);
    setMatrixData(updatedMatrix);
    setRecentEntries(updatedEntries);
    if (updatedProject) setCurrentProject(updatedProject);
    setProjects(allProjects);
  };

  // Risks handlers
  const handleAddRisk = async (data: Partial<Risk>) => {
    await api.createRisk(currentProjectId, data);
    const updatedRisks = await api.getRisks(currentProjectId);
    setRisks(updatedRisks);
  };

  const handleUpdateRisk = async (id: number, data: Partial<Risk>) => {
    await api.updateRisk(id, data);
    const updatedRisks = await api.getRisks(currentProjectId);
    setRisks(updatedRisks);
  };

  const handleDeleteRisk = async (id: number) => {
    await api.deleteRisk(id);
    setRisks((prev) => prev.filter((r) => r.risk_id !== id));
  };

  return (
    <div className="app-layout">
      <Header
        projects={projects}
        currentProject={currentProject}
        onSelectProject={(id) => setCurrentProjectId(id)}
        onOpenNewProjectModal={() => setShowNewProjectModal(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="app-main">
        {error && (
          <div className="alert-error">
            <strong>Connection Warning:</strong> {error}
            <button type="button" className="btn-retry" onClick={() => loadProjectDetails(currentProjectId)}>
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading enterprise project intelligence...</p>
          </div>
        ) : (
          <>
            {activeTab === 'matrix' && (
              <EffortMatrix
                matrixData={matrixData}
                loading={loading}
                onRefresh={() => loadProjectDetails(currentProjectId)}
              />
            )}

            {activeTab === 'logger' && (
              <EffortLogger
                requirements={requirements}
                phases={phases}
                users={users}
                recentEntries={recentEntries}
                onLogEffort={handleLogEffort}
              />
            )}

            {activeTab === 'requirements' && (
              <RequirementsView
                requirements={requirements}
                onAddRequirement={handleAddRequirement}
                onDeleteRequirement={handleDeleteRequirement}
              />
            )}

            {activeTab === 'overview' && (
              <ProjectOverview
                project={currentProject}
                members={members}
                users={users}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onUpdateProject={handleUpdateProject}
              />
            )}

            {activeTab === 'risks' && (
              <RiskManagement
                risks={risks}
                requirements={requirements}
                users={users}
                onAddRisk={handleAddRisk}
                onUpdateRisk={handleUpdateRisk}
                onDeleteRisk={handleDeleteRisk}
              />
            )}
          </>
        )}
      </main>

      {/* Modal for Creating a New Project Dynamically */}
      {showNewProjectModal && (
        <div className="modal-overlay">
          <div
              className="modal-content"
              style={{
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowNewProjectModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="form-stack">
              <div className="form-group">
                <label>Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Healthcare Clinical Records Portal"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Project Manager Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Tanner Giddens"
                  value={newProjectOwner}
                  onChange={(e) => setNewProjectOwner(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>High-Level Software Project Description *</label>
                <textarea
                  rows={4}
                  placeholder="Core objectives, operational scope, and system boundaries..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Development Methodology</label>
                  <select
                    value={newProjectMethodology}
                    onChange={(e) => setNewProjectMethodology(e.target.value)}
                  >
                    <option value="Agile / Iterative">Agile / Iterative</option>
                    <option value="Scrum">Scrum</option>
                    <option value="Waterfall">Waterfall</option>
                    <option value="Kanban">Kanban</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Delivery Date</label>
                  <input
                    type="date"
                    value={newProjectEndDate}
                    onChange={(e) => setNewProjectEndDate(e.target.value)}
                  />
                </div>
              </div>

            {/* Client Information Section */}
            <div
              style={{
                marginTop: 18,
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              
              {/* Client Association Heading */}
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8fafc',
                  color: '#1e293b',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <strong style={{ fontSize: 14 }}>
                  🏢 Client Association
                </strong>

                <p
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    margin: '6px 0 14px',
                  }}
                >
                  Choose an existing client or register a new one.
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    flexWrap: 'wrap',
                  }}
                >
                  <label>
                    <input
                      type="radio"
                      name="clientMode"
                      checked={clientMode === 'existing'}
                      onChange={() => {
                        setClientMode('existing');
                        setClientLookupError(null);
                      }}
                    />
                    {' '}Existing Client
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="clientMode"
                      checked={clientMode === 'new'}
                      onChange={() => {
                        setClientMode('new');
                        setShowNewClientDetails(true);
                        setClientLookupError(null);
                      }}
                    />
                    {' '}New Client
                  </label>
                </div>
              </div>

              {/* Existing Client Selection */}
              {clientMode === 'existing' && (
                <div
                  style={{
                    padding: 18,
                    background: '#ffffff',
                    color: '#1e293b',
                  }}
                >
                  <div className="form-group">
                    <label htmlFor="existing-client">
                      Select Client *
                    </label>

                    <select
                      id="existing-client"
                      value={selectedClientId}
                      onChange={e => {
                        setSelectedClientId(e.target.value);
                        setSelectedClient(null);
                      }}
                      required
                      disabled={clientsLoading}
                    >
                      <option value="">
                        {clientsLoading
                          ? 'Loading clients...'
                          : '-- Select Client --'}
                      </option>

                      {availableClients.map(client => (
                        <option
                          key={client.client_id}
                          value={client.client_id}
                        >
                          {client.client_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClient && (
                    <div
                      style={{
                        marginTop: 14,
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px 14px',
                          background: '#f1f5f9',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        EXISTING CLIENT PROFILE
                      </div>

                      {([
                        ['Client ID', selectedClient.client_id],
                        ['Client Name', selectedClient.client_name],
                        ['Contact Title', selectedClient.contact_title],
                        ['Address Line 1', selectedClient.address_line1],
                        ['Address Line 2', selectedClient.address_line2],
                        ['City', selectedClient.city],
                        ['State / Region', selectedClient.state_region],
                        ['Postal Code', selectedClient.postal_code],
                        ['Country', selectedClient.country],
                        ['Direct Phone', selectedClient.direct_phone],
                        ['Mobile Phone', selectedClient.mobile_phone],
                        ['Email', selectedClient.email],
                      ] as const).map(([label, value], index) => (
                        <div
                          key={label}
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              'minmax(110px, 38%) minmax(0, 1fr)',
                            background:
                              index % 2 === 0
                                ? '#f8fafc'
                                : '#ffffff',
                            borderTop: '1px solid #e2e8f0',
                            fontSize: 12,
                          }}
                        >
                          <span
                            style={{
                              padding: '10px 12px',
                              fontWeight: 600,
                              color: '#64748b',
                            }}
                          >
                            {label}
                          </span>

                          <span
                            style={{
                              padding: '10px 12px',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {value === null || value === ''
                              ? '—'
                              : value}
                          </span>
                        </div>
                      ))}

                      <p
                        style={{
                          padding: '0 12px 12px',
                          fontSize: 11,
                          color: '#64748b',
                        }}
                      >
                        These details are read-only.
                        A new project will use this client's existing ID.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {clientLookupError && clientMode === 'existing' && (
                <p
                  role="alert"
                  style={{
                    padding: '0 18px',
                    color: '#b91c1c',
                    fontSize: 12,
                  }}
                >
                  {clientLookupError}
                </p>
              )}

              {clientMode === 'new' && showNewClientDetails && (
                <div
                  id="new-client-details"
                  style={{
                    padding: 18,
                    background: '#ffffff',
                    color: '#1e293b',
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  {/* Client Overview */}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 12,
                    }}
                  >
                    CLIENT OVERVIEW
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="new-client-name">Client Name *</label>
                      <input
                        id="new-client-name"
                        type="text"
                        value={newClient.client_name}
                        onChange={e =>
                          updateNewClient('client_name', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="new-contact-title">Contact Title</label>
                      <input
                        id="new-contact-title"
                        type="text"
                        value={newClient.contact_title}
                        onChange={e =>
                          updateNewClient('contact_title', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Business Address */}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#475569',
                      margin: '20px 0 12px',
                    }}
                  >
                    BUSINESS ADDRESS
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-address1">Address Line 1 *</label>
                    <input
                      id="new-address1"
                      type="text"
                      value={newClient.address_line1}
                      onChange={e =>
                        updateNewClient('address_line1', e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-address2">Address Line 2</label>
                    <input
                      id="new-address2"
                      type="text"
                      value={newClient.address_line2}
                      onChange={e =>
                        updateNewClient('address_line2', e.target.value)
                      }
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="new-city">City *</label>
                      <input
                        id="new-city"
                        type="text"
                        value={newClient.city}
                        onChange={e =>
                          updateNewClient('city', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="new-state">State / Region</label>
                      <input
                        id="new-state"
                        type="text"
                        value={newClient.state_region}
                        onChange={e =>
                          updateNewClient('state_region', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="new-postal">Postal Code</label>
                      <input
                        id="new-postal"
                        type="text"
                        value={newClient.postal_code}
                        onChange={e =>
                          updateNewClient('postal_code', e.target.value)
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="new-country">Country *</label>
                      <input
                        id="new-country"
                        type="text"
                        value={newClient.country}
                        onChange={e =>
                          updateNewClient('country', e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#475569',
                      margin: '20px 0 12px',
                    }}
                  >
                    CONTACT INFORMATION
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="new-direct-phone">Direct Phone *</label>
                      <input style={{
                          height: '45px',
                          minHeight: '45px',
                          boxSizing: 'border-box',
                        }}
                        id="new-direct-phone"
                        type="tel"
                        value={newClient.direct_phone}
                        onChange={e =>
                          updateNewClient('direct_phone', e.target.value)
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="new-mobile-phone">Mobile Phone</label>
                      <input style={{
                          height: '45px',
                          minHeight: '45px',
                          boxSizing: 'border-box',
                        }}
                        id="new-mobile-phone"
                        type="tel"
                        value={newClient.mobile_phone}
                        onChange={e =>
                          updateNewClient('mobile_phone', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-client-email">Email</label>
                    <input style={{
                        height: '45px',
                        minHeight: '45px',
                        boxSizing: 'border-box',
                      }}
                      id="new-client-email"
                      type="email"
                      value={newClient.email}
                      onChange={e =>
                        updateNewClient('email', e.target.value)
                      }
                    />
                  </div>
                </div>
              )}
            </div>


              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewProjectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingProject}
                  >
                  {creatingProject ? 'Initializing Project...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <p>
          © 2026 Project Insight Enterprise Suite. Engineered for SDLC Resource Tracking & Lifecycle Intelligence.
        </p>
      </footer>
    </div>
  );
}

export default App;
