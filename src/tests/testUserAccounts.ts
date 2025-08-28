/**
 * Тестовый модуль для проверки аккаунтов пользователей и их свойств
 */

import { 
  getUserProfile, 
  updateUserProfile, 
  createOrUpdateUserProfile,
  getUsersByRole,
  UserProfile 
} from '../api/userApi';
import { auth } from '../firebase/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export interface UserTestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
  properties?: string[];
}

/**
 * Проверка структуры профиля пользователя
 */
export async function testUserProfileStructure(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'User Profile Structure',
        success: false,
        error: 'Profile not found'
      };
    }
    
    // Проверяем все обязательные поля
    const requiredFields = ['id', 'email', 'role', 'isActive'];
    const missingFields = requiredFields.filter(field => !(field in profile));
    
    if (missingFields.length > 0) {
      return {
        test: 'User Profile Structure',
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }
    
    // Собираем все свойства профиля
    const properties = Object.keys(profile);
    
    return {
      test: 'User Profile Structure',
      success: true,
      data: profile,
      properties: properties
    };
  } catch (error: any) {
    return {
      test: 'User Profile Structure',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование ролей пользователя
 */
export async function testUserRoles(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'User Roles',
        success: false,
        error: 'Profile not found'
      };
    }
    
    const validRoles = ['owner', 'manager', 'employee', 'contractor'];
    const isValidRole = validRoles.includes(profile.role);
    
    if (!isValidRole) {
      return {
        test: 'User Roles',
        success: false,
        error: `Invalid role: ${profile.role}`,
        data: { currentRole: profile.role, validRoles }
      };
    }
    
    // Проверяем функции получения пользователей по ролям
    const owners = await getUsersByRole('owner');
    const managers = await getUsersByRole('manager');
    const employees = await getUsersByRole('employee');
    
    return {
      test: 'User Roles',
      success: true,
      data: {
        currentRole: profile.role,
        statistics: {
          owners: owners.length,
          managers: managers.length,
          employees: employees.length
        }
      }
    };
  } catch (error: any) {
    return {
      test: 'User Roles',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование обновления профиля
 */
export async function testProfileUpdate(userId: string): Promise<UserTestResult> {
  try {
    const originalProfile = await getUserProfile(userId);
    
    if (!originalProfile) {
      return {
        test: 'Profile Update',
        success: false,
        error: 'Profile not found'
      };
    }
    
    // Тестовые обновления
    const testUpdates = {
      position: `Test Position ${Date.now()}`,
      department: `Test Department ${Date.now()}`,
      hourlyRate: Math.floor(Math.random() * 1000) + 100
    };
    
    await updateUserProfile(userId, testUpdates);
    
    // Получаем обновленный профиль
    const updatedProfile = await getUserProfile(userId);
    
    // Проверяем, что обновления применились
    const updatesApplied = 
      updatedProfile?.position === testUpdates.position &&
      updatedProfile?.department === testUpdates.department &&
      updatedProfile?.hourlyRate === testUpdates.hourlyRate;
    
    // Возвращаем оригинальные значения
    await updateUserProfile(userId, {
      position: originalProfile.position,
      department: originalProfile.department,
      hourlyRate: originalProfile.hourlyRate
    });
    
    return {
      test: 'Profile Update',
      success: updatesApplied,
      data: {
        originalValues: {
          position: originalProfile.position,
          department: originalProfile.department,
          hourlyRate: originalProfile.hourlyRate
        },
        testValues: testUpdates,
        updateSuccess: updatesApplied
      }
    };
  } catch (error: any) {
    return {
      test: 'Profile Update',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование часовой ставки и финансовых полей
 */
export async function testFinancialFields(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'Financial Fields',
        success: false,
        error: 'Profile not found'
      };
    }
    
    const financialFields = {
      hourlyRate: profile.hourlyRate || 0,
      hasHourlyRate: typeof profile.hourlyRate === 'number',
      isValidRate: !profile.hourlyRate || profile.hourlyRate >= 0
    };
    
    return {
      test: 'Financial Fields',
      success: financialFields.isValidRate,
      data: financialFields,
      properties: ['hourlyRate']
    };
  } catch (error: any) {
    return {
      test: 'Financial Fields',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование каналов уведомлений
 */
export async function testNotificationChannels(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'Notification Channels',
        success: false,
        error: 'Profile not found'
      };
    }
    
    const notificationData = {
      email: profile.email || '',
      whatsappPhone: profile.whatsappPhone || '',
      telegramUsername: profile.telegramUsername || '',
      telegramUserId: profile.telegramUserId || '',
      preferredChannel: profile.preferredNotificationChannel || 'email',
      hasEmail: !!profile.email,
      hasWhatsApp: !!profile.whatsappPhone,
      hasTelegram: !!profile.telegramUsername || !!profile.telegramUserId
    };
    
    const validChannels = ['email', 'telegram', 'whatsapp'];
    const isValidChannel = validChannels.includes(notificationData.preferredChannel);
    
    return {
      test: 'Notification Channels',
      success: isValidChannel && notificationData.hasEmail,
      data: notificationData,
      properties: [
        'email',
        'whatsappPhone',
        'telegramUsername',
        'telegramUserId',
        'preferredNotificationChannel'
      ]
    };
  } catch (error: any) {
    return {
      test: 'Notification Channels',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование статуса активности пользователя
 */
export async function testUserActivityStatus(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'Activity Status',
        success: false,
        error: 'Profile not found'
      };
    }
    
    const originalStatus = profile.isActive;
    
    // Тестируем изменение статуса через обновление профиля
    await updateUserProfile(userId, { isActive: false });
    const deactivatedProfile = await getUserProfile(userId);
    
    await updateUserProfile(userId, { isActive: true });
    const reactivatedProfile = await getUserProfile(userId);
    
    // Возвращаем оригинальный статус
    await updateUserProfile(userId, { isActive: originalStatus });
    
    const statusChangeWorked = 
      deactivatedProfile?.isActive === false &&
      reactivatedProfile?.isActive === true;
    
    return {
      test: 'Activity Status',
      success: statusChangeWorked,
      data: {
        originalStatus,
        deactivationWorked: deactivatedProfile?.isActive === false,
        reactivationWorked: reactivatedProfile?.isActive === true
      }
    };
  } catch (error: any) {
    return {
      test: 'Activity Status',
      success: false,
      error: error.message
    };
  }
}

/**
 * Проверка связей с другими сущностями
 */
export async function testUserRelations(userId: string): Promise<UserTestResult> {
  try {
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      return {
        test: 'User Relations',
        success: false,
        error: 'Profile not found'
      };
    }
    
    const relations = {
      hasEmployeeLink: !!profile.employeeId,
      hasContractorLink: !!profile.contractorId,
      employeeId: profile.employeeId || null,
      contractorId: profile.contractorId || null
    };
    
    return {
      test: 'User Relations',
      success: true,
      data: relations,
      properties: ['employeeId', 'contractorId']
    };
  } catch (error: any) {
    return {
      test: 'User Relations',
      success: false,
      error: error.message
    };
  }
}

/**
 * Запуск всех тестов аккаунта
 */
export async function runAllAccountTests(userId: string): Promise<UserTestResult[]> {
  const results: UserTestResult[] = [];
  
  // 1. Тест структуры профиля
  const structureResult = await testUserProfileStructure(userId);
  results.push(structureResult);
  
  // 2. Тест ролей
  const rolesResult = await testUserRoles(userId);
  results.push(rolesResult);
  
  // 3. Тест обновления профиля
  const updateResult = await testProfileUpdate(userId);
  results.push(updateResult);
  
  // 4. Тест финансовых полей
  const financialResult = await testFinancialFields(userId);
  results.push(financialResult);
  
  // 5. Тест каналов уведомлений
  const notificationResult = await testNotificationChannels(userId);
  results.push(notificationResult);
  
  // 6. Тест статуса активности
  const activityResult = await testUserActivityStatus(userId);
  results.push(activityResult);
  
  // 7. Тест связей с другими сущностями
  const relationsResult = await testUserRelations(userId);
  results.push(relationsResult);
  
  return results;
}

/**
 * Анализ результатов тестов аккаунтов
 */
export function analyzeAccountTestResults(results: UserTestResult[]): {
  summary: string;
  allProperties: string[];
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const allProperties = new Set<string>();
  
  results.forEach(result => {
    if (!result.success) {
      issues.push(`${result.test}: ${result.error}`);
    }
    if (result.properties) {
      result.properties.forEach(prop => allProperties.add(prop));
    }
  });
  
  const recommendations: string[] = [];
  
  // Рекомендации на основе найденных проблем
  if (issues.length > 0) {
    recommendations.push('Fix identified issues in user profile management');
  }
  
  // Проверка наличия всех важных свойств
  const importantProperties = ['hourlyRate', 'role', 'isActive', 'preferredNotificationChannel'];
  const missingImportant = importantProperties.filter(prop => !allProperties.has(prop));
  
  if (missingImportant.length > 0) {
    recommendations.push(`Add missing important properties: ${missingImportant.join(', ')}`);
  }
  
  // Общие рекомендации
  recommendations.push('Implement user profile validation on save');
  recommendations.push('Add user profile versioning for audit trail');
  recommendations.push('Implement role-based access control (RBAC)');
  recommendations.push('Add two-factor authentication support');
  recommendations.push('Implement user profile export/import functionality');
  
  const summary = `Account tests completed: ${results.length}, Failed: ${results.filter(r => !r.success).length}`;
  
  return { 
    summary, 
    allProperties: Array.from(allProperties).sort(),
    issues, 
    recommendations 
  };
}
