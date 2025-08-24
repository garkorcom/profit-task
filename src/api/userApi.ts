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
  isActive: boolean;
  lastLogin?: any;
  createdAt: any;
  updatedAt: any;
}

// Создание или обновление профиля пользователя при входе
export const createOrUpdateUserProfile = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<UserProfile>
): Promise<UserProfile> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Создаем новый профиль
    const newProfile: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      phoneNumber: firebaseUser.phoneNumber || undefined,
      role: 'employee', // По умолчанию
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    await setDoc(userRef, newProfile);
    return { ...newProfile, id: firebaseUser.uid };
  } else {
    // Обновляем существующий профиль
    const updates = {
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || userSnap.data().displayName,
      photoURL: firebaseUser.photoURL || userSnap.data().photoURL,
      phoneNumber: firebaseUser.phoneNumber || userSnap.data().phoneNumber,
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    await updateDoc(userRef, updates);
    return { ...userSnap.data(), ...updates, id: firebaseUser.uid } as UserProfile;
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
  await updateDoc(userRef, {
    ...updates,
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
