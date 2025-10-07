/**
 * Utility script to make a user an administrator
 * This calls the Firebase Cloud Function to update user role
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';

export const makeUserAdmin = async (email: string, role: 'owner' | 'manager' = 'owner') => {
  try {
    console.log(`Making ${email} an admin with role: ${role}`);
    
    const updateUserRole = httpsCallable(functions, 'updateUserRole');
    
    const result = await updateUserRole({
      email: email,
      role: role,
      isActive: true
    });
    
    console.log('Successfully updated user role:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error making user admin:', error);
    throw error;
  }
};

// Function to make garkor.com@gmail.com specifically an owner
export const makeGarkorAdmin = async () => {
  return makeUserAdmin('garkor.com@gmail.com', 'owner');
};