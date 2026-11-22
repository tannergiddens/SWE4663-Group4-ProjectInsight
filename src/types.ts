export interface Client {
  client_id: number;
  client_name: string;
  contact_title?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
  direct_phone?: string | null;
  mobile_phone?: string | null;
  email?: string | null;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string | null;
  active: number;
}

export interface ProjectMember {
  member_id: number;
  project_id: number;
  user_id: number;
  role_name: string;
  joined_on: string;
  left_on: string | null;
  full_name: string;
  email: string | null;
}

export interface Project {
  project_id: number;
  client_id: number;
  client_name?: string;
  project_manager_id: number | null;
  project_manager_name?: string;
  project_name: string;
  description: string;
  methodology: string;
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  start_date: string | null;
  target_end_date: string | null;
  total_hours?: number;
}

export type RequirementType = 'functional' | 'non_functional';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type RequirementStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'deferred';

export interface Requirement {
  requirement_id: number;
  project_id: number;
  requirement_code: string;
  requirement_type: RequirementType;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: RequirementStatus;
  estimated_hours: number;
  total_expended_hours?: number;
  requirements_analysis_hours?: number;
  designing_hours?: number;
  coding_hours?: number;
  testing_hours?: number;
  project_management_hours?: number;
}

export interface SDLCPhase {
  phase_id: number;
  phase_name: string;
  sequence_no: number;
}

export interface TimeEntry {
  entry_id: number;
  project_id: number;
  requirement_id: number;
  user_id: number;
  user_name?: string;
  phase_id: number;
  phase_name?: string;
  requirement_code?: string;
  requirement_title?: string;
  activity: string;
  period_type: 'daily' | 'weekly';
  period_start: string;
  period_end: string;
  hours: number;
  notes?: string;
  recorded_at: string;
}

export interface EffortMatrixRow {
  project_id: number;
  requirement_id: number;
  requirement_code: string;
  requirement_title: string;
  requirement_type: RequirementType;
  requirements_analysis_hours: number;
  designing_hours: number;
  coding_hours: number;
  testing_hours: number;
  project_management_hours: number;
  total_expended_hours: number;
}

export interface EffortMatrixData {
  project_id: number;
  requirements: EffortMatrixRow[];
  phase_totals: {
    requirements_analysis_hours: number;
    designing_hours: number;
    coding_hours: number;
    testing_hours: number;
    project_management_hours: number;
    total_expended_hours: number;
  };
}

export interface Risk {
  risk_id: number;
  project_id: number;
  requirement_id: number | null;
  requirement_code?: string;
  requirement_title?: string;
  title: string;
  description: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  status: 'open' | 'in_progress' | 'mitigated' | 'closed' | 'resolved';
  owner_id: number | null;
  owner_name?: string;
  mitigation_plan: string | null;
}
