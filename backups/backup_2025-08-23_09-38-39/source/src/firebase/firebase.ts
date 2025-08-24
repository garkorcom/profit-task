// Инициализация Firebase SDK
// Здесь подключаем Firebase App, Auth и Firestore.
// Конфигурацию берём из консоли Firebase (Project settings → Your apps (Web)).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;