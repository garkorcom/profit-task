export interface Attachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

export interface Task {
  id?: string;
  code: string;
  title: string;
  description?: string;
  type: 'task' | 'milestone' | 'bug' | 'feature' | 'epic';
  projectId: string;
  parentTaskId?: string;
  status: 'new' | 'in_progress' | 'review' | 'testing' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  progress: number;
  plannedStartDate?: Date;
  plannedEndDate?: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  deadline?: Date;
  estimatedHours: number;
  actualHours: number;
  remainingHours: number;
  plannedHours?: number;
  assigneeId: string;
  assignees?: string[];
  reviewerId?: string;
  watchers?: string[];
  dependencies?: string[];
  blockedBy?: string[];
  blocks?: string[];
  attachments?: Attachment[];
  checklistItems?: ChecklistItem[];
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  deletedAt?: Date;
}
