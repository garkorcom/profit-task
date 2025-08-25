export interface TimesheetEntry {
  id?: string;
  employeeId: string;
  projectId: string;
  taskId?: string;
  date: Date;
  hours: number;
  rate: number;
  description?: string;
  // Фотофиксация
  startPhotoUrl?: string;
  endPhotoUrl?: string;
  // Геолокация (опционально)
  startLocation?: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
  // Комментарий при завершении
  comment?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
