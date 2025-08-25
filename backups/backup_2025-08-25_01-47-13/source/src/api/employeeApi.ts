import { db } from '../firebase/firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, getDoc, setDoc } from 'firebase/firestore';
import { TimesheetEntry } from '../types/timesheet';

export interface Employee {
  id: string;
  personnelNumber: string; // Табельный номер
  fullName: string;        // ФИО
  position?: string;       // Должность
  department?: string;     // Подразделение
  isActive?: boolean;      // Статус
  role?: 'worker' | 'manager' | 'accountant' | 'admin'; // Права доступа (базово)
  authUid?: string; // UID из Firebase Auth для привязки
  email?: string; // Email из Google аккаунта
  // Мессенджеры
  whatsappPhone?: string; // Телефон в международном формате для WhatsApp
  telegramUserId?: string; // Telegram user id (числовой)
  telegramUsername?: string; // Telegram @username
  preferredNotificationChannel?: 'system' | 'email' | 'telegram' | 'whatsapp';
  isTelegramAuthorized?: boolean; // Авторизован в Telegram боте
  createdAt?: any;
  updatedAt?: any;
}

// Re-export TimesheetEntry to maintain a single point of reference for other files if needed
export type { TimesheetEntry };

// ===== Employees CRUD =====
export const getEmployeesStream = (userId: string, callback: (employees: Employee[]) => void) => {
  const path = `users/${userId}/employees`;
  const q = query(collection(db, path), orderBy('fullName', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Employee[];
    callback(list);
  });
};

export const addEmployee = async (userId: string, data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
  const path = `users/${userId}/employees`;
  const payload = { ...data, isActive: data.isActive ?? true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  const ref = await addDoc(collection(db, path), payload);
  return ref.id;
};

export const updateEmployee = async (userId: string, employeeId: string, updates: Partial<Employee>) => {
  const ref = doc(db, `users/${userId}/employees/${employeeId}`);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() } as any);
};

export const deleteEmployee = async (userId: string, employeeId: string) => {
  await deleteDoc(doc(db, `users/${userId}/employees/${employeeId}`));
};


// ===== Employee Auth Linking =====

// Глобальная коллекция для связи auth Uid с ID сотрудника и ID владельца (админа)
export interface EmployeeAuthLink {
  ownerUid: string; // ID пользователя-владельца (администратора)
  employeeId: string; // ID документа сотрудника в users/{ownerUid}/employees
  employeeName: string;
  email: string;
}

/**
* Находит связь сотрудника по его auth UID.
*/
export const getEmployeeLinkByAuthUid = async (authUid: string): Promise<EmployeeAuthLink | null> => {
  const linkRef = doc(db, 'employeeAuthLinks', authUid);
  const docSnap = await getDoc(linkRef);
  if (docSnap.exists()) {
    return docSnap.data() as EmployeeAuthLink;
  }
  return null;
};

/**
* Создает или обновляет связь между Google-аккаунтом и профилем сотрудника.
*/
export const setEmployeeAuthLink = async (authUid: string, linkData: EmployeeAuthLink) => {
  const linkRef = doc(db, 'employeeAuthLinks', authUid);
  await setDoc(linkRef, linkData, { merge: true });
};

/**
 * Удаляет связь для сотрудника.
 */
export const removeEmployeeAuthLink = async (authUid: string) => {
  const linkRef = doc(db, 'employeeAuthLinks', authUid);
  await deleteDoc(linkRef);
};


// ===== Timesheets =====
export const getTimesheetsByEmployeeStream = (userId: string, employeeId: string, callback: (items: TimesheetEntry[]) => void) => {
  const path = `users/${userId}/timesheetEntries`;
  const q = query(collection(db, path), where('employeeId', '==', employeeId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list = (snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimesheetEntry[])
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    callback(list);
  });
  return unsubscribe;
};

export const getTimesheetsByProjectStream = (userId: string, projectId: string, callback: (items: TimesheetEntry[]) => void) => {
  const path = `users/${userId}/timesheetEntries`;
  const q = query(collection(db, path), where('projectId', '==', projectId));
  return onSnapshot(q, (snapshot) => {
    const list = (snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TimesheetEntry[])
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    callback(list);
  });
};

export const addTimesheetEntry = async (userId: string, entry: Omit<TimesheetEntry, 'id' | 'createdAt' | 'updatedAt' | 'approvedAt'>) => {
  const path = `users/${userId}/timesheetEntries`;
  const payload = { 
    ...entry,
    date: entry.date instanceof Date ? entry.date : new Date(entry.date),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: userId 
  };
  const ref = await addDoc(collection(db, path), payload);
  return ref.id;
};

export const deleteTimesheetEntry = async (userId: string, entryId: string) => {
  const entryRef = doc(db, `users/${userId}/timesheetEntries`, entryId);
  await deleteDoc(entryRef);
};
