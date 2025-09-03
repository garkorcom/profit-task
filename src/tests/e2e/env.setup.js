/**
 * Настройка переменных окружения для E2E тестов
 * Firebase Emulator Suite конфигурация
 */

// Firebase Emulator переменные окружения
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST = 'localhost:5001';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';

// Переменные для тестирования Firebase
process.env.REACT_APP_FIREBASE_API_KEY = 'test-api-key';
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = 'my-business-app-test.firebaseapp.com';
process.env.REACT_APP_FIREBASE_PROJECT_ID = 'my-business-app-test';
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = 'my-business-app-test.appspot.com';
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.REACT_APP_FIREBASE_APP_ID = 'test-app-id';

// Настройки для тестового режима
process.env.NODE_ENV = 'test';
process.env.REACT_APP_TESTING_MODE = 'true';
process.env.REACT_APP_USE_EMULATOR = 'true';

// Отключение сетевых запросов в тестах
process.env.REACT_APP_DISABLE_ANALYTICS = 'true';
process.env.REACT_APP_DISABLE_CRASHLYTICS = 'true';

// Настройки для Jest
process.env.TZ = 'UTC';

// Логирование для отладки
if (process.env.DEBUG_E2E_TESTS) {
  console.log('E2E Test Environment Variables:');
  console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
  console.log('FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log('FIREBASE_FUNCTIONS_EMULATOR_HOST:', process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST);
  console.log('REACT_APP_USE_EMULATOR:', process.env.REACT_APP_USE_EMULATOR);
}