import { useAuth } from '../auth/AuthContext';
import {
    getEmployeesStream, addEmployee, updateEmployee, deleteEmployee,
    getTimesheetsByEmployeeStream, addTimesheetEntry, deleteTimesheetEntry,
    getTimesheetsByProjectStream
} from '../api/employeeApi';
import { getProjectsStream, addProject, updateProject, deleteProject, getProjectStream } from '../api/projectApi';
import { getTasksStream, addTask, updateTask, deleteTask, getTasksByProjectStream } from '../api/taskApi';
import { getContractorsStream } from '../api/contractorApi';

/**
 * Хук, который предоставляет все функции API, автоматически используя
 * правильный UID (текущий пользователь).
 */
export const useApi = () => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const api = {
    // --- Employee API ---
    getEmployeesStream: (callback: any) => getEmployeesStream(uid!, callback),
    addEmployee: (data: any) => addEmployee(uid!, data),
    updateEmployee: (employeeId: string, updates: any) => updateEmployee(uid!, employeeId, updates),
    deleteEmployee: (employeeId: string) => deleteEmployee(uid!, employeeId),

    // --- Timesheet API ---
    getTimesheetsByEmployeeStream: (employeeId: string, callback: any) => getTimesheetsByEmployeeStream(uid!, employeeId, callback),
    addTimesheetEntry: (entry: any) => addTimesheetEntry(uid!, entry),
    deleteTimesheetEntry: (entryId: string) => deleteTimesheetEntry(uid!, entryId),
    getTimesheetsByProjectStream: (projectId: string, callback: any) => getTimesheetsByProjectStream(uid!, projectId, callback),

    // --- Project API ---
    getProjectsStream: (callback: any) => getProjectsStream(uid!, callback),
    getProjectStream: (projectId: string, callback: any) => getProjectStream(uid!, projectId, callback),
    addProject: (data: any) => addProject(uid!, data),
    updateProject: (projectId: string, updates: any) => updateProject(uid!, projectId, updates),
    deleteProject: (projectId: string) => deleteProject(uid!, projectId),

    // --- Task API ---
    getTasksStream: (callback: any) => getTasksStream(uid!, callback),
    getTasksByProjectStream: (projectId: string, callback: any) => getTasksByProjectStream(uid!, projectId, callback),
    addTask: (data: any) => addTask(uid!, data),
    updateTask: (taskId: string, updates: any) => updateTask(uid!, taskId, updates),
    deleteTask: (taskId: string) => deleteTask(uid!, taskId),

    // --- Contractor API ---
    getContractorsStream: (callback: any) => getContractorsStream(uid!, callback),
  };

  return api;
};
