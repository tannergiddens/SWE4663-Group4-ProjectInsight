import type {
  Client,
  Project,
  ProjectMember,
  Requirement,
  SDLCPhase,
  TimeEntry,
  EffortMatrixData,
  Risk,
  User,
} from './types';

const BASE_URL = '/api';

export interface NewClientInput {
  client_name: string;
  contact_title?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state_region?: string | null;
  postal_code?: string | null;
  country: string;
  direct_phone: string;
  mobile_phone?: string | null;
  email?: string | null;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `HTTP error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {

  // Clients
  async getClients(): Promise<{
    client_id: number;
    client_name: string;
  }[]> {
    return handleResponse(
      await fetch(`${BASE_URL}/clients`)
    );
  },

  async getClientById(clientId: number): Promise<
    NewClientInput & { client_id: number }
  > {
    return handleResponse(
      await fetch(`${BASE_URL}/clients/${clientId}`)
    );
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return handleResponse<Project[]>(await fetch(`${BASE_URL}/projects`));
  },

  async getProject(id: number): Promise<Project> {
    return handleResponse<Project>(await fetch(`${BASE_URL}/projects/${id}`));
  },

  async createProject(data: {
    project_name: string;
    description: string;
    owner_name?: string;
    project_manager_name?: string;
    methodology?: string;
    target_end_date?: string;

    // Existing client association
    client_id?: number;

    // New client registration
    client?: NewClientInput;

  }): Promise<Project> {
    return handleResponse<Project>(
      await fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    );
  },

  async updateProject(id: number, data: Partial<Project> & { owner_name?: string; project_manager_name?: string }): Promise<Project> {
    return handleResponse<Project>(
      await fetch(`${BASE_URL}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  // Team Members
  async getProjectMembers(projectId: number): Promise<ProjectMember[]> {
    return handleResponse<ProjectMember[]>(await fetch(`${BASE_URL}/projects/${projectId}/members`));
  },

  async addProjectMember(
    projectId: number,
    data: { user_id?: number; full_name?: string; email?: string; role_name: string; joined_on?: string }
  ): Promise<ProjectMember> {
    return handleResponse<ProjectMember>(
      await fetch(`${BASE_URL}/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async removeProjectMember(projectId: number, memberId: number): Promise<{ message: string }> {
    return handleResponse<{ message: string }>(
      await fetch(`${BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      })
    );
  },

  // Users
  async getUsers(): Promise<User[]> {
    return handleResponse<User[]>(await fetch(`${BASE_URL}/users`));
  },

  async createUser(data: { full_name: string; email?: string }): Promise<User> {
    return handleResponse<User>(
      await fetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  // SDLC Phases
  async getPhases(): Promise<SDLCPhase[]> {
    return handleResponse<SDLCPhase[]>(await fetch(`${BASE_URL}/effort/phases`));
  },

  // Requirements
  async getRequirements(projectId: number, type?: string): Promise<Requirement[]> {
    const url = type ? `${BASE_URL}/requirements/project/${projectId}?type=${type}` : `${BASE_URL}/requirements/project/${projectId}`;
    return handleResponse<Requirement[]>(await fetch(url));
  },

  async createRequirement(projectId: number, data: Partial<Requirement>): Promise<Requirement> {
    return handleResponse<Requirement>(
      await fetch(`${BASE_URL}/requirements/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async updateRequirement(id: number, data: Partial<Requirement>): Promise<Requirement> {
    return handleResponse<Requirement>(
      await fetch(`${BASE_URL}/requirements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async deleteRequirement(id: number): Promise<{ message: string }> {
    return handleResponse<{ message: string }>(
      await fetch(`${BASE_URL}/requirements/${id}`, {
        method: 'DELETE',
      })
    );
  },

  // Effort Logging & Reports
  async logEffort(data: {
    project_id?: number;
    requirement_id: number;
    user_id?: number;
    user_name?: string;
    contributor_name?: string;
    phase_id?: number;
    phase_hours?: Record<string, number>;
    activity?: string;
    period_type: 'daily' | 'weekly';
    period_start: string;
    period_end?: string;
    hours?: number;
    notes?: string;
  }): Promise<any> {
    return handleResponse(
      await fetch(`${BASE_URL}/effort/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async getTimeEntries(projectId: number): Promise<TimeEntry[]> {
    return handleResponse<TimeEntry[]>(await fetch(`${BASE_URL}/effort/entries?project_id=${projectId}`));
  },

  async getEffortMatrix(projectId: number): Promise<EffortMatrixData> {
    return handleResponse<EffortMatrixData>(await fetch(`${BASE_URL}/effort/matrix/${projectId}`));
  },

  async getEffortSummary(projectId: number): Promise<{
    phases: { phase_id: number; phase_name: string; sequence_no: number; total_hours: number }[];
    total_hours: number;
    requirements_stats: {
      total_count: number;
      functional_count: number;
      non_functional_count: number;
      total_estimated_hours: number;
    };
  }> {
    return handleResponse(await fetch(`${BASE_URL}/effort/summary/${projectId}`));
  },

  // Risks
  async getRisks(projectId: number): Promise<Risk[]> {
    return handleResponse<Risk[]>(await fetch(`${BASE_URL}/risks/project/${projectId}`));
  },

  async createRisk(projectId: number, data: Partial<Risk>): Promise<Risk> {
    return handleResponse<Risk>(
      await fetch(`${BASE_URL}/risks/project/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async updateRisk(id: number, data: Partial<Risk>): Promise<Risk> {
    return handleResponse<Risk>(
      await fetch(`${BASE_URL}/risks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async deleteRisk(id: number): Promise<{ message: string }> {
    return handleResponse<{ message: string }>(
      await fetch(`${BASE_URL}/risks/${id}`, {
        method: 'DELETE',
      })
    );
  },

  // Clients
  async getProjectClient(projectId: number): Promise<Client> {
    return handleResponse<Client>(await fetch(`${BASE_URL}/projects/${projectId}/client`));
  },
};
