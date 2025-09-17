// Инициализация Firebase SDK
// Здесь подключаем Firebase App, Auth и Firestore.
// Конфигурацию берём из консоли Firebase (Project settings → Your apps (Web)).
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork, initializeFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// !!! ВАЖНО: Замените на ваши данные из консоли Firebase !!!
// Для продакшена рекомендуется хранить значения в .env.local (REACT_APP_*)
const firebaseConfig = {
  apiKey: "AIzaSyChIcIXwcyFMSybKprc_LbeqjZIOeu84kw",
  authDomain: "profit-task.firebaseapp.com",
  projectId: "profit-task",
  storageBucket: "profit-task.firebasestorage.app",
  messagingSenderId: "833518013631",
  appId: "1:833518013631:web:b6f55cd89deb72294fca0a"
};

const app = initializeApp(firebaseConfig);

// Экспортируем инстансы для использования по всему приложению
export const auth = getAuth(app);

// Инициализируем Firestore с оптимизированными настройками
export const db = (() => {
  try {
    // Пытаемся инициализировать с настройками
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      cacheSizeBytes: 40000000, // 40MB cache для offline поддержки
    });
  } catch (error) {
    // Если не получилось (уже инициализирован), используем существующий
    console.warn('⚠️ Using existing Firestore instance:', error);
    return getFirestore(app);
  }
})();

export const functions = getFunctions(app);
export const storage = getStorage(app);

/**
 * ============================================================================
 * FIRESTORE CONNECTION OPTIMIZATION
 * ============================================================================
 * 
 * Настройки для улучшения соединения с Firestore и устранения таймаутов:
 * - experimentalAutoDetectLongPolling: автоматическое определение long polling
 * - Функции для ручного управления сетевым состоянием
 * - Обработка проблем с соединением
 * ============================================================================
 */

// Логируем успешную инициализацию с оптимизированными настройками
console.log('🔥 Firestore initialized with connection optimizations:', {
  experimentalAutoDetectLongPolling: true,
  cacheSizeBytes: '40MB',
  offlineSupport: true
});

// Функции для управления сетевым состоянием Firestore
export const reconnectFirestore = async () => {
  try {
    console.log('🔄 Attempting to reconnect Firestore...');
    await disableNetwork(db);
    await enableNetwork(db);
    console.log('✅ Firestore reconnection successful');
  } catch (error) {
    console.error('❌ Firestore reconnection failed:', error);
  }
};

// Функция для проверки состояния соединения
export const checkFirestoreConnection = () => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection check timeout'));
    }, 5000);
    
    // Простой запрос для проверки соединения
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, '_connection_test', 'test'))
        .then(() => {
          clearTimeout(timeout);
          resolve(true);
        })
        .catch((error) => {
          clearTimeout(timeout);
          if (error.code === 'permission-denied') {
            // Если получили permission-denied, значит соединение работает
            resolve(true);
          } else {
            reject(error);
          }
        });
    });
  });
};

// Подключение к эмуляторам в режиме разработки
if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
  // Подключаем эмуляторы только если они еще не подключены
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.log('Emulators already connected or not available:', error);
  }
}