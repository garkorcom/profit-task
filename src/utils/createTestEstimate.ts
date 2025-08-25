import { addEstimate } from '../api/estimateApi';

// Функция для быстрого создания тестовой сметы
export const createTestEstimate = async (userId: string, projectId: string) => {
  const testEstimate = {
    number: `TEST-${Date.now()}`,
    name: 'Тестовая смета для проверки',
    description: 'Смета для тестирования выбора в учете времени',
    projectId: projectId,
    contractorId: '',
    status: 'draft' as const,
    items: [
      {
        id: 'item-1',
        name: 'Установка розетки',
        quantity: 5,
        unit: 'шт',
        unitPrice: 500,
        total: 2500,
        type: 'work' as const,
        level: 0,
        order: 0
      },
      {
        id: 'item-2', 
        name: 'Прокладка кабеля',
        quantity: 20,
        unit: 'м',
        unitPrice: 100,
        total: 2000,
        type: 'work' as const,
        level: 0,
        order: 1
      },
      {
        id: 'item-3',
        name: 'Розетка двойная',
        quantity: 5,
        unit: 'шт',
        unitPrice: 300,
        total: 1500,
        type: 'material' as const,
        level: 0,
        order: 2
      }
    ],
    total: 6000,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const estimateId = await addEstimate(userId, testEstimate);
    console.log('✅ Тестовая смета создана:', estimateId);
    return estimateId;
  } catch (error) {
    console.error('❌ Ошибка создания тестовой сметы:', error);
    throw error;
  }
};

// Делаем функцию доступной глобально для консоли браузера
if (typeof window !== 'undefined') {
  (window as any).createTestEstimate = createTestEstimate;
}
