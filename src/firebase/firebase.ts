// Инициализация Firebase SDK
// Здесь подключаем Firebase App, Auth и Firestore.
// Конфигурацию берём из консоли Firebase (Project settings → Your apps (Web)).
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

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