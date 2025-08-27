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

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'owner' | 'manager' | 'employee' | 'contractor';
  department?: string;
  position?: string;
  employeeId?: string; // Связь с таблицей employees
  contractorId?: string; // Связь с таблицей contractors
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

// Создание или обновление профиля пользователя при входе
export const createOrUpdateUserProfile = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<UserProfile>
): Promise<UserProfile> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Создаем новый профиль, тщательно отбирая поля
    const newProfile: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || '',
      phoneNumber: firebaseUser.phoneNumber || '',
      role: additionalData?.role || 'employee',
      department: additionalData?.department || '',
      position: additionalData?.position || '',
      employeeId: additionalData?.employeeId || '',
      contractorId: additionalData?.contractorId || '',
      whatsappPhone: additionalData?.whatsappPhone || '',
      telegramUsername: additionalData?.telegramUsername || '',
      telegramUserId: additionalData?.telegramUserId || '',
      preferredNotificationChannel: additionalData?.preferredNotificationChannel || 'email',
      hourlyRate: additionalData?.hourlyRate || 0,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  } else {
    // Обновляем существующий профиль, тщательно отбирая поля
    const updates: { [key: string]: any } = {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (firebaseUser.email) updates.email = firebaseUser.email;
    if (firebaseUser.displayName) updates.displayName = firebaseUser.displayName;
    if (firebaseUser.photoURL) updates.photoURL = firebaseUser.photoURL;
    if (firebaseUser.phoneNumber) updates.phoneNumber = firebaseUser.phoneNumber;
    
    // Добавляем доп. данные, если они есть
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        if (value !== undefined) {
          updates[key] = value;
        }
      }
    }
    
    await updateDoc(userRef, updates);
    const updatedProfile = await getDoc(userRef);
    return { ...updatedProfile.data(), id: userRef.id } as UserProfile;
  }
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
