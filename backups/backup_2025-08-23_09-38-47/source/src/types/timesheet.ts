export interface TimesheetEntry {
  id?: string;
  employeeId: string;
  projectId: string;
  taskId?: string;
  date: Date;
  hours: number;
  rate: number;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
