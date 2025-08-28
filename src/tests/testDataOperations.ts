/**
 * Тестовый модуль для проверки операций сохранения и зависимостей
 */

import { addProject, updateProject, deleteProject } from '../api/projectApi';
import { addTask } from '../api/taskApi';
import { getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { addEstimate, EstimateItem } from '../api/estimateApi';
import { addProduct, reserveStock } from '../api/productApi';

export interface TestResult {
  operation: string;
  success: boolean;
  error?: string;
  data?: any;
  dependencies?: string[];
}

/**
 * Тестирование создания проекта
 */
export async function testCreateProject(userId: string): Promise<TestResult> {
  try {
    const projectData = {
      name: `Test Project ${Date.now()}`,
      status: 'active' as const,
      contractorId: 'test-contractor',
      contractorName: 'Test Contractor',
      budget: 100000
    };
    
    const projectId = await addProject(userId, projectData);
    
    return {
      operation: 'Create Project',
      success: true,
      data: { projectId, ...projectData },
      dependencies: ['User', 'Contractor (optional)']
    };
  } catch (error: any) {
    return {
      operation: 'Create Project',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование создания задачи
 */
export async function testCreateTask(userId: string, projectId: string): Promise<TestResult> {
  try {
    const taskData = {
      task: `Test Task ${Date.now()}`,
      projectId: projectId,
      status: 'new' as const,
      priority: 'medium' as const
    };
    
    const taskId = await addTask(userId, taskData);
    
    return {
      operation: 'Create Task',
      success: true,
      data: { taskId, ...taskData },
      dependencies: ['Project (required)', 'Contractor (optional)', 'EstimateItem (optional)']
    };
  } catch (error: any) {
    return {
      operation: 'Create Task',
      success: false,
      error: error.message,
      dependencies: ['Project (required)']
    };
  }
}

/**
 * Тестирование создания сметы
 */
export async function testCreateEstimate(userId: string, projectId: string): Promise<TestResult> {
  try {
    const items: EstimateItem[] = [
      {
        id: 'item-1',
        name: 'Test Service',
        type: 'service',
        quantity: 10,
        unit: 'час',
        unitPrice: 1000,
        total: 10000,
        level: 0,
        order: 0
      },
      {
        id: 'item-2',
        name: 'Test Material',
        type: 'material',
        quantity: 5,
        unit: 'шт',
        unitPrice: 500,
        total: 2500,
        level: 0,
        order: 1
      }
    ];
    
    const estimateData = {
      projectId: projectId,
      name: `Test Estimate ${Date.now()}`,
      items: items,
      subtotal: 12500,
      total: 12500,
      status: 'draft' as const
    };
    
    const estimateId = await addEstimate(userId, estimateData);
    
    return {
      operation: 'Create Estimate',
      success: true,
      data: { estimateId, ...estimateData },
      dependencies: ['Project (required)', 'Products (for materials)', 'Contractor (optional)']
    };
  } catch (error: any) {
    return {
      operation: 'Create Estimate',
      success: false,
      error: error.message,
      dependencies: ['Project (required)']
    };
  }
}

/**
 * Тестирование создания товара/услуги
 */
export async function testCreateProduct(userId: string): Promise<TestResult> {
  try {
    const productData = {
      name: `Test Product ${Date.now()}`,
      type: 'product' as const,
      unit: 'шт',
      currentStock: 100,
      minStock: 10,
      costPrice: 100,
      salePrice: 150
    };
    
    const productId = await addProduct(userId, productData);
    
    return {
      operation: 'Create Product',
      success: true,
      data: { productId, ...productData },
      dependencies: ['User']
    };
  } catch (error: any) {
    return {
      operation: 'Create Product',
      success: false,
      error: error.message
    };
  }
}

/**
 * Тестирование резервирования товара
 */
export async function testReserveProduct(userId: string, productId: string, taskId: string): Promise<TestResult> {
  try {
    await reserveStock(userId, productId, 10, taskId, 'Test Task');
    
    return {
      operation: 'Reserve Product',
      success: true,
      data: { productId, taskId, quantity: 10 },
      dependencies: ['Product', 'Task']
    };
  } catch (error: any) {
    return {
      operation: 'Reserve Product',
      success: false,
      error: error.message,
      dependencies: ['Product', 'Task']
    };
  }
}

/**
 * Тестирование каскадного удаления
 */
export async function testCascadeDelete(userId: string, projectId: string): Promise<TestResult> {
  const issues: string[] = [];
  
  try {
    // Попытка удалить проект
    await deleteProject(userId, projectId);
    
    // Если удаление прошло успешно, значит нет защиты от каскадного удаления
    issues.push('Project deleted without checking for dependent tasks/estimates');
    
    return {
      operation: 'Cascade Delete Test',
      success: false,
      error: 'No cascade protection',
      data: { issues }
    };
  } catch (error: any) {
    // Ошибка при удалении - это хорошо, значит есть защита
    return {
      operation: 'Cascade Delete Test',
      success: true,
      data: { protection: 'Cascade protection works', error: error.message }
    };
  }
}

/**
 * Тестирование целостности данных при обновлении
 */
export async function testDataIntegrity(userId: string): Promise<TestResult> {
  const issues: string[] = [];
  
  try {
    // Создаем проект
    const projectId = await addProject(userId, {
      name: 'Integrity Test Project',
      status: 'active',
      contractorId: 'contractor-1',
      contractorName: 'Test Contractor'
    });
    
    // Создаем задачу с контрагентом из проекта
    await addTask(userId, {
      task: 'Integrity Test Task',
      projectId: projectId,
      status: 'new',
      contractorId: 'contractor-1',
      contractorName: 'Test Contractor'
    });
    
    // Обновляем проект (меняем контрагента)
    await updateProject(userId, projectId, {
      contractorId: 'contractor-2',
      contractorName: 'New Contractor'
    });
    
    // Проверяем, обновился ли контрагент в задаче
    const tasksQuery = query(
      collection(db, `users/${userId}/tasks`),
      where('projectId', '==', projectId)
    );
    const taskSnapshot = await getDocs(tasksQuery);
    
    if (!taskSnapshot.empty) {
      const taskData = taskSnapshot.docs[0].data();
      if (taskData.contractorId !== 'contractor-2' || taskData.contractorName !== 'New Contractor') {
        issues.push('Task contractor not updated when project contractor changes');
      }
    }
    
    // Создаем смету
    await addEstimate(userId, {
      projectId: projectId,
      name: 'Test Estimate',
      items: [],
      subtotal: 0,
      total: 0,
      status: 'draft'
    });
    
    // Удаляем проект с зависимостями
    try {
      await deleteProject(userId, projectId);
      issues.push('Project deleted with existing tasks and estimates');
    } catch {
      // Ожидаемое поведение - защита от удаления
    }
    
    return {
      operation: 'Data Integrity Test',
      success: issues.length === 0,
      data: { issues },
      dependencies: ['Project-Task', 'Project-Estimate', 'Task-Product']
    };
  } catch (error: any) {
    return {
      operation: 'Data Integrity Test',
      success: false,
      error: error.message
    };
  }
}

/**
 * Запуск всех тестов
 */
export async function runAllTests(userId: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // 1. Тест создания проекта
  const projectResult = await testCreateProject(userId);
  results.push(projectResult);
  
  if (projectResult.success && projectResult.data?.projectId) {
    const projectId = projectResult.data.projectId;
    
    // 2. Тест создания задачи
    const taskResult = await testCreateTask(userId, projectId);
    results.push(taskResult);
    
    // 3. Тест создания сметы
    const estimateResult = await testCreateEstimate(userId, projectId);
    results.push(estimateResult);
    
    // 4. Тест создания товара
    const productResult = await testCreateProduct(userId);
    results.push(productResult);
    
    // 5. Тест резервирования товара
    if (taskResult.success && productResult.success) {
      const reserveResult = await testReserveProduct(
        userId,
        productResult.data.productId,
        taskResult.data.taskId
      );
      results.push(reserveResult);
    }
    
    // 6. Тест каскадного удаления
    const cascadeResult = await testCascadeDelete(userId, projectId);
    results.push(cascadeResult);
  }
  
  // 7. Тест целостности данных
  const integrityResult = await testDataIntegrity(userId);
  results.push(integrityResult);
  
  return results;
}

/**
 * Анализ результатов тестов
 */
export function analyzeTestResults(results: TestResult[]): {
  summary: string;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  results.forEach(result => {
    if (!result.success) {
      issues.push(`${result.operation}: ${result.error}`);
    }
    if (result.data?.issues) {
      issues.push(...result.data.issues);
    }
  });
  
  // Рекомендации на основе найденных проблем
  if (issues.some(i => i.includes('cascade'))) {
    recommendations.push('Implement cascade delete protection for projects with dependencies');
  }
  
  if (issues.some(i => i.includes('contractor'))) {
    recommendations.push('Add automatic update of dependent records when parent changes');
  }
  
  if (issues.some(i => i.includes('stock'))) {
    recommendations.push('Improve stock reservation error handling');
  }
  
  // Общие рекомендации
  recommendations.push('Add transaction support for multi-step operations');
  recommendations.push('Implement data validation before save operations');
  recommendations.push('Add audit logging for critical operations');
  recommendations.push('Create database triggers or Cloud Functions for maintaining data consistency');
  
  const summary = `Tests completed: ${results.length}, Failed: ${results.filter(r => !r.success).length}`;
  
  return { summary, issues, recommendations };
}
