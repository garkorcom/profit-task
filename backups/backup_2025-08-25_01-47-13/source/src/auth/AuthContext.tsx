import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Employee } from '../api/employeeApi';
import { createOrUpdateUserProfile, UserProfile } from '../api/userApi';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  employeeData: Employee | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  userProfile: null,
  loading: true,
  employeeData: null,
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const login = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Создаем или обновляем профиль пользователя
        try {
          const profile = await createOrUpdateUserProfile(user);
          setUserProfile(profile);
          
          // Если есть связь с сотрудником, загружаем данные
          if (profile.employeeId) {
            const employeeDoc = await getDoc(doc(db, 'employees', profile.employeeId));
            if (employeeDoc.exists()) {
              setEmployeeData({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
            } else {
              setEmployeeData(null);
            }
          } else {
            // Пытаемся найти по старой схеме (uid = employeeId)
            const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
            if (employeeDoc.exists()) {
              setEmployeeData({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
              // Автоматически связываем профиль с сотрудником
              await createOrUpdateUserProfile(user, { employeeId: user.uid });
            } else {
              setEmployeeData(null);
            }
          }
        } catch (error) {
          console.error('Error fetching user profile or employee data:', error);
          setUserProfile(null);
          setEmployeeData(null);
        }
      } else {
        setUserProfile(null);
        setEmployeeData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    employeeData,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};