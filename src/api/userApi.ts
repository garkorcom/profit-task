import { db, auth } from '../firebase/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { UserRole } from '../auth/permissions';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  department?: string;
  position?: string;
  location?: string; // Рабочая локация/филиал
  timezone?: string; // Часовой пояс пользователя
  employeeId?: string; // Связь с таблицей employees
  contractorId?: string; // Связь с таблицей contractors
  hireDate?: any; // Дата найма/начала сотрудничества
  groups?: string[]; // Группы пользователя для RBAC
  whatsappPhone?: string;
  telegramUsername?: string;
  telegramUserId?: string;
  preferredNotificationChannel?: 'email' | 'telegram' | 'whatsapp';
  hourlyRate?: number; // Часовая ставка (себестоимость часа работы)
  isActive: boolean;
  lastLogin?: any;
  createdAt: any;
  updatedAt: any;
}

// Утилита для очистки объекта от undefined полей
const cleanObject = (obj: { [key: string]: any }): { [key: string]: any } => {
  const cleaned: { [key: string]: any } = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

// УСТАРЕЛО: Создание профилей теперь происходит на backend
// Оставлено для обратной совместимости с миграцией
export const createOrUpdateUserProfile = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<UserProfile>
): Promise<UserProfile> => {
  console.warn('DEPRECATED: createOrUpdateUserProfile() is deprecated. Profile creation now happens on backend via onUserCreate trigger');
  
  // Теперь только читаем профиль, создание на backend
  const profile = await getUserProfile(firebaseUser.uid);
  
  if (!profile) {
    throw new Error('Profile not found. Please wait for backend to create profile or contact administrator.');
  }
  
  // Если есть дополнительные данные для обновления - используем безопасное API
  if (additionalData) {
    const { updateSafeProfileFields } = await import('./secureUserApi');
    const safeUpdates: any = {};
    
    // Фильтруем только безопасные поля
    const safeFields = ['displayName', 'phoneNumber', 'whatsappPhone', 'telegramUsername', 'preferredNotificationChannel'];
    for (const [key, value] of Object.entries(additionalData)) {
      if (safeFields.includes(key) && value !== undefined) {
        safeUpdates[key] = value;
      } else if (key === 'role' || key === 'hourlyRate' || key === 'employeeId') {
        console.warn(`Field ${key} cannot be updated directly. Use secure API or contact administrator.`);
      }
    }
    
    if (Object.keys(safeUpdates).length > 0) {
      await updateSafeProfileFields(firebaseUser.uid, safeUpdates);
    }
    
    // Возвращаем обновленный профиль
    return (await getUserProfile(firebaseUser.uid))!;
  }
  
  return profile;
};

// Получение профиля пользователя
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { ...userSnap.data(), id: userSnap.id } as UserProfile;
  }
  
  return null;
};

// Поиск пользователя по email
export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { ...doc.data(), id: doc.id } as UserProfile;
  }
  
  return null;
};

// Обновление профиля пользователя
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  
  // Очищаем объект от undefined перед отправкой
  const cleanedUpdates = cleanObject(updates);

  await updateDoc(userRef, {
    ...cleanedUpdates,
    updatedAt: serverTimestamp()
  });
};

// Связать пользователя с сотрудником
export const linkUserToEmployee = async (
  userId: string, 
  employeeId: string
): Promise<void> => {
  await updateUserProfile(userId, { 
    employeeId, 
    role: 'employee' 
  });
};

// Связать пользователя с подрядчиком
export const linkUserToContractor = async (
  userId: string, 
  contractorId: string
): Promise<void> => {
  await updateUserProfile(userId, { 
    contractorId, 
    role: 'contractor' 
  });
};

// Получить всех пользователей с определенной ролью
export const getUsersByRole = async (role: UserProfile['role']): Promise<UserProfile[]> => {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  } as UserProfile));
};

// Подписка на изменения профиля пользователя
export const getUserProfileStream = (
  userId: string,
  callback: (profile: UserProfile | null) => void
): (() => void) => {
  const userRef = doc(db, 'users', userId);
  
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({ ...doc.data(), id: doc.id } as UserProfile);
    } else {
      callback(null);
    }
  });
};

// Проверка и синхронизация email с Firebase Auth
export const syncEmailWithAuth = async (userId: string): Promise<void> => {
  const user = auth.currentUser;
  if (user && user.uid === userId) {
    await updateUserProfile(userId, {
      email: user.email!
    });
  }
};

// Подписка на изменения всех пользователей
export const getUsersStream = (
  callback: (users: UserProfile[]) => void
): (() => void) => {
  const usersRef = collection(db, 'users');
  
  return onSnapshot(usersRef, (snapshot) => {
    const users = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as UserProfile));
    callback(users);
  });
};
