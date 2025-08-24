import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { Employee, getEmployeeLinkByAuthUid } from '../api/employeeApi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isCurrentUserAdmin: boolean;
  employeeData: Employee | null; // Данные сотрудника из Firestore
  ownerUid: string | null; // UID владельца данных
}

const AuthContext = createContext<AuthContextType>({ 
    currentUser: null, 
    loading: true, 
    isCurrentUserAdmin: false,
    employeeData: null,
    ownerUid: null
});

export const useAuth = () => useContext(AuthContext);

export const login = () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [isCurrentUserAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // После входа пользователя, пытаемся найти его связь в employeeAuthLinks
        const link = await getEmployeeLinkByAuthUid(user.uid);
        if (link) {
            setOwnerUid(link.ownerUid);
            // Загружаем полные данные сотрудника
            const employeeRef = doc(db, `users/${link.ownerUid}/employees`, link.employeeId);
            const employeeSnap = await getDoc(employeeRef);
            if (employeeSnap.exists()) {
                const empData = { id: employeeSnap.id, ...employeeSnap.data() } as Employee;
                setEmployeeData(empData);
                // Проверяем, является ли он админом
                setIsAdmin(empData.role === 'admin');
            }
        } else {
            // Если связи нет, возможно, это сам владелец/админ
            const adminEmployeeDoc = await getAdminEmployeeDoc(user.uid);
            if(adminEmployeeDoc) {
                setIsAdmin(true);
                setOwnerUid(user.uid); // Важно: устанавливаем ownerUid для самого админа
                setEmployeeData({ id: adminEmployeeDoc.id, ...adminEmployeeDoc.data() } as Employee);
            } else {
                // Если нет ни связи, ни админской записи - это обычный пользователь без доступа
                setIsAdmin(false);
                setEmployeeData(null);
                setOwnerUid(null);
            }
        }
      } else {
        // Пользователь не авторизован
        setIsAdmin(false);
        setEmployeeData(null);
        setOwnerUid(null);
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, isCurrentUserAdmin, employeeData, ownerUid }}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper function to check if the user is an admin in their own employee list
const getAdminEmployeeDoc = async (uid: string) => {
    try {
        // First, try to find a directly linked admin document
        let q = query(
            collection(db, `users/${uid}/employees`),
            where('role', '==', 'admin'),
            where('authUid', '==', uid)
        );
        let querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0];
        }

        // If not found, fall back to finding any admin document (for legacy or manual setup)
        q = query(
            collection(db, `users/${uid}/employees`),
            where('role', '==', 'admin')
        );
        querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            return querySnapshot.docs[0];
        }

        return null;
    } catch (error) {
        // This might fail due to permissions if the user is not the owner, which is expected.
        // We can ignore this error for non-admins.
        const typedError = error as any;
        if (typedError.code !== 'permission-denied') {
             console.error("Error checking for admin role:", error);
        }
        return null;
    }
}