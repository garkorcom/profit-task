/**
 * Настройка окружения для E2E тестов Include_Mode
 * Подключение к Firebase Emulator Suite
 */

import '@testing-library/jest-dom';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, terminate } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Конфигурация для тестирования
const testFirebaseConfig = {
  projectId: 'my-business-app-test',
  apiKey: 'test-api-key',
  authDomain: 'localhost',
  storageBucket: 'test-bucket',
  messagingSenderId: 'test-sender',
  appId: 'test-app-id'
};

let testApp: any;
let testDb: any;
let testAuth: any;
let testFunctions: any;

// Настройка перед всеми тестами
beforeAll(async () => {
  // Инициализируем тестовое приложение Firebase
  testApp = initializeApp(testFirebaseConfig, 'test-app-e2e');
  testDb = getFirestore(testApp);
  testAuth = getAuth(testApp);
  testFunctions = getFunctions(testApp);

  // Подключаемся к эмуляторам
  try {
    connectFirestoreEmulator(testDb, 'localhost', 8080);
  } catch (error) {
    // Эмулятор уже подключен
  }

  try {
    connectAuthEmulator(testAuth, 'http://localhost:9099');
  } catch (error) {
    // Эмулятор уже подключен
  }

  try {
    connectFunctionsEmulator(testFunctions, 'localhost', 5001);
  } catch (error) {
    // Эмулятор уже подключен
  }

  // Устанавливаем глобальные переменные для тестов
  (global as any).testApp = testApp;
  (global as any).testDb = testDb;
  (global as any).testAuth = testAuth;
  (global as any).testFunctions = testFunctions;
});

// Очистка после всех тестов
afterAll(async () => {
  if (testDb) {
    await terminate(testDb);
  }

  if (testApp) {
    await deleteApp(testApp);
  }

  // Очищаем существующие приложения
  const existingApps = getApps();
  await Promise.all(existingApps.map(app => deleteApp(app)));
});

// Увеличиваем таймаут для E2E тестов
jest.setTimeout(30000);

// Моки для компонентов, которые могут вызывать проблемы в тестах
jest.mock('../../components/maps/GeolocationService', () => ({
  getCurrentPosition: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 55.7558,
      longitude: 37.6176,
      accuracy: 10
    }
  })),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
}));

// Мок для уведомлений
jest.mock('../../utils/notifications', () => ({
  showNotification: jest.fn(),
  showError: jest.fn(),
  showSuccess: jest.fn(),
  showWarning: jest.fn()
}));

// Мок для роутера
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/test' }),
  useParams: () => ({ projectId: 'test-project' })
}));

// Вспомогательные функции для тестов
export const testHelpers = {
  // Ожидание обработки Cloud Functions
  waitForCloudFunction: (ms: number = 3000) => 
    new Promise(resolve => setTimeout(resolve, ms)),

  // Создание тестовых данных
  createTestTimeEntry: (overrides = {}) => ({
    id: `test-entry-${Date.now()}`,
    userId: 'test-user-123',
    taskId: 'test-task-456',
    projectId: 'test-project-789',
    date: new Date().toISOString().split('T')[0],
    hours: 4,
    description: 'Test time entry',
    status: 'draft' as const,
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createTestEstimateTask: (overrides = {}) => ({
    id: `test-task-${Date.now()}`,
    projectId: 'test-project-789',
    name: 'Test Task',
    category: 'Development',
    includeMode: 'COGS' as const,
    estimatedHours: 8,
    hourlyRate: 75,
    status: 'active',
    createdBy: 'test-user-123',
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  createTestLaborRate: (overrides = {}) => ({
    id: `test-rate-${Date.now()}`,
    userId: 'test-user-123',
    hourlyRate: 75,
    burdenFactor: 1.3,
    overtimeMultiplier15: 1.5,
    overtimeMultiplier20: 2.0,
    shiftMultiplier: 1.1,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
    createdAt: new Date().toISOString(),
    ...overrides
  }),

  // Очистка коллекций
  async clearCollection(collectionName: string, userId: string = 'test-user-123') {
    // В реальных E2E тестах здесь будет очистка данных эмулятора
    console.log(`Clearing collection: users/${userId}/${collectionName}`);
  },

  // Проверка существования документа
  async documentExists(path: string): Promise<boolean> {
    try {
      const doc = await testDb.doc(path).get();
      return doc.exists;
    } catch (error) {
      return false;
    }
  },

  // Получение количества документов в коллекции
  async getCollectionSize(collectionPath: string): Promise<number> {
    try {
      const snapshot = await testDb.collection(collectionPath).get();
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }
};

// Экспортируем для использования в тестах
export { testApp, testDb, testAuth, testFunctions };