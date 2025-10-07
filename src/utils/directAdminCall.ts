/**
 * Direct admin utility for console use
 * Call this from browser console to make users admin
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';

// Make this available globally for console use
(window as any).makeAdmin = async (email: string, role: 'owner' | 'manager' = 'owner') => {
  try {
    console.log(`🔧 Making ${email} an admin with role: ${role}`);
    
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    
    const result = await updateUserRole({
      email: email,
      role: role,
      isActive: true
    });
    
    console.log('✅ Successfully updated user role:', result.data);
    alert(`Successfully made ${email} an ${role}!`);
    
    // Suggest page refresh
    if (window.confirm('Role updated! Refresh page to see changes?')) {
      window.location.reload();
    }
    
    return result.data;
  } catch (error: any) {
    console.error('❌ Error making user admin:', error);
    alert(`Error: ${error.message || error}`);
    throw error;
  }
};

// СПЕЦИАЛЬНАЯ ФУНКЦИЯ для инициализации первого админа
(window as any).initFirstAdmin = async (email: string = '') => {
  try {
    if (!email) {
      const { auth } = await import('../firebase/firebase');
      email = auth.currentUser?.email || '';
    }
    
    if (!email) {
      alert('No email provided and no user logged in');
      return;
    }

    console.log(`🔧 Initializing first admin: ${email}`);
    
    const initializeFirstAdmin = httpsCallable(functions, 'initializeFirstAdmin');
    
    const result = await initializeFirstAdmin({
      email: email,
      secret: 'init-admin-2025'
    });
    
    console.log('✅ Successfully initialized first admin:', result.data);
    alert(`Successfully made ${email} the first admin!`);
    
    // Suggest page refresh
    if (window.confirm('Admin initialized! Refresh page to see changes?')) {
      window.location.reload();
    }
    
    return result.data;
  } catch (error: any) {
    console.error('❌ Error initializing first admin:', error);
    alert(`Error: ${error.message || error}`);
    throw error;
  }
};

// Quick functions for specific users
(window as any).makeCurrentUserAdmin = async () => {
  const { auth } = await import('../firebase/firebase');
  const currentUserEmail = auth.currentUser?.email;
  
  if (!currentUserEmail) {
    alert('No user logged in');
    return;
  }
  
  // Try init first admin first, fall back to regular method
  try {
    return await (window as any).initFirstAdmin(currentUserEmail);
  } catch (error: any) {
    if (error.message?.includes('already has an owner')) {
      console.log('System already has owner, trying regular method...');
      return (window as any).makeAdmin(currentUserEmail, 'owner');
    }
    throw error;
  }
};

(window as any).makeGarkorAdmin = async () => {
  // Try init first admin first, fall back to regular method
  try {
    return await (window as any).initFirstAdmin('garkor.com@gmail.com');
  } catch (error: any) {
    if (error.message?.includes('already has an owner')) {
      console.log('System already has owner, trying regular method...');
      return (window as any).makeAdmin('garkor.com@gmail.com', 'owner');
    }
    throw error;
  }
};

(window as any).directFirestoreAdmin = async (email: string = '') => {
  try {
    const { auth, db } = await import('../firebase/firebase');
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    
    if (!email) {
      email = auth.currentUser?.email || '';
    }
    
    if (!email) {
      alert('No email provided and no user logged in');
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      alert('User not authenticated');
      return;
    }

    console.log(`🔧 Setting user profile directly in Firestore: ${email}`);
    
    // Обновляем профиль напрямую в Firestore
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      email: email,
      displayName: email.split('@')[0],
      role: 'owner',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: 'direct-admin-util'
    }, { merge: true });
    
    console.log('✅ Successfully updated user profile in Firestore');
    alert(`Successfully updated profile for ${email}! Custom Claims will need to be set separately.`);
    
    if (window.confirm('Profile updated! Refresh page to see changes?')) {
      window.location.reload();
    }
    
    return { success: true, method: 'firestore-direct' };
  } catch (error: any) {
    console.error('❌ Error updating profile directly:', error);
    alert(`Error: ${error.message || error}`);
    throw error;
  }
};

console.log('🚀 Admin utilities loaded! Use in console:');
console.log('directFirestoreAdmin() - update your profile directly (FALLBACK)');
console.log('makeCurrentUserAdmin() - make yourself admin (tries init first)');
console.log('makeGarkorAdmin() - make garkor.com@gmail.com admin (tries init first)');
console.log('initFirstAdmin("email@example.com") - initialize first system admin (SAFE)');
console.log('makeAdmin("email@example.com", "owner") - make any user admin (requires existing admin)');