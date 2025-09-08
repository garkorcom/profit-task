import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Employee } from '../api/employeeApi';
import { getUserProfile, UserProfile } from '../api/userApi';
import { CustomClaims, getUserCustomClaims } from './customClaims';
import { AuditHelpers } from '../api/auditLogApi';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  customClaims: CustomClaims | null;
  loading: boolean;
  employeeData: Employee | null;
  logout: () => Promise<void>;
  refreshCustomClaims: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, 
  userProfile: null,
  customClaims: null,
  loading: true,
  employeeData: null,
  logout: async () => {},
  refreshCustomClaims: async () => {}
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
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  // Функция для обновления Custom Claims
  const refreshCustomClaims = async () => {
    if (currentUser) {
      try {
        const { refreshUserCustomClaims } = await import('./customClaims');
        const claims = await refreshUserCustomClaims(currentUser);
        setCustomClaims(claims);
        console.log('Custom Claims refreshed:', claims);
      } catch (error) {
        console.error('Error refreshing custom claims:', error);
        setCustomClaims(null);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setCustomClaims(null); // Сбрасываем claims при смене пользователя
      
      if (user) {
        // TODO: Записываем успешный логин в audit log (отключено до развертывания Cloud Functions)
        // try {
        //   await AuditHelpers.loginSuccess({
        //     ipAddress: window.location.hostname // IP будет определен на сервере
        //   });
        // } catch (error) {
        //   console.error('Error logging login success to audit log:', error);
        // }

        // Получаем Custom Claims через утилиты
        try {
          const claims = await getUserCustomClaims(user);
          setCustomClaims(claims);
          console.log('Custom Claims loaded:', claims);
        } catch (error) {
          console.error('Error fetching custom claims:', error);
          setCustomClaims(null);
        }

        // Загружаем профиль пользователя (создание теперь на backend)
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // Профиль создается автоматически через onUserCreate trigger
            // Показываем loading до завершения создания
            console.log('Profile not found, waiting for backend creation...');
            setUserProfile(null);
          }
          
          // Если есть связь с сотрудником, загружаем данные
          if (profile && profile.employeeId) {
            const employeeDoc = await getDoc(doc(db, 'employees', profile.employeeId));
            if (employeeDoc.exists()) {
              setEmployeeData({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
            } else {
              setEmployeeData(null);
            }
          } else if (profile) {
            // Пытаемся найти по старой схеме (uid = employeeId)
            const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
            if (employeeDoc.exists()) {
              setEmployeeData({ id: employeeDoc.id, ...employeeDoc.data() } as Employee);
              // TODO: Связывание профиля теперь через Cloud Function
              console.log('Found legacy employee mapping, needs admin linking');
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
        setCustomClaims(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    customClaims,
    loading,
    employeeData,
    logout: async () => {
      // TODO: Записываем логаут в audit log (отключено до развертывания Cloud Functions)
      // try {
      //   await AuditHelpers.logout({
      //     source: 'WEB_APP'
      //   });
      // } catch (error) {
      //   console.error('Error logging logout to audit log:', error);
      // }
      return signOut(auth);
    },
    refreshCustomClaims
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};