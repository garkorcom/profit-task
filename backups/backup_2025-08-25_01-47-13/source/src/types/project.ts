export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProjectType = 'internal' | 'external' | 'support' | 'development';

export interface Project {
  id?: string;
  code: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  plannedHours?: number;
  actualHours?: number;
  budget: number;
  actualCost: number;
  currency: string;
  clientId?: string;
  managerId: string;
  departmentId?: string;
  parentProjectId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
