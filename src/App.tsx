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
    if (!newProjectName.trim() || !newProjectDesc.trim()) return;

    setCreatingProject(true);
    try {
      const created = await api.createProject({
        project_name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        owner_name: newProjectOwner.trim() || 'Lead Project Manager',
        methodology: newProjectMethodology,
        target_end_date: newProjectEndDate || undefined,
      });

      // Refresh project list
      const updatedProjects = await api.getProjects();
      setProjects(updatedProjects);
      setCurrentProjectId(created.project_id);
      setShowNewProjectModal(false);

      // Reset form
      setNewProjectName('');
      setNewProjectOwner('');
      setNewProjectDesc('');
      setNewProjectEndDate('');
    } catch (err) {
      alert((err as Error).message || 'Failed to create new project');
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
          <div className="modal-content">
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
