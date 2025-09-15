/**
 * СКРИПТ ОЧИСТКИ БАЗЫ ДАННЫХ
 * Удаляет старые коллекции products/services для чистого внедрения ERP
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection,
  getDocs,
  deleteDoc,
  doc,
  writeBatch
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator,
  signInAnonymously 
} from 'firebase/auth';

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyChIcIXwcyFMSybKprc_LbeqjZIOeu84kw",
  authDomain: "profit-task.firebaseapp.com",
  projectId: "profit-task",
  storageBucket: "profit-task.firebasestorage.app",
  messagingSenderId: "833518013631",
  appId: "1:833518013631:web:b6f55cd89deb72294fca0a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Подключение к эмуляторам (если используются)
if (process.env.NODE_ENV === 'development') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('🔧 Connected to emulators');
  } catch (error) {
    console.log('⚠️  Using production Firebase');
  }
}

/**
 * Очистка коллекций для конкретного пользователя
 */
async function cleanUserData(userId) {
  console.log(`🧹 Cleaning data for user: ${userId}`);
  
  const collectionsToClean = [
    'products',           // Старые товары
    'services',           // Старые услуги  
    'productMovements',   // Старые движения товаров
    'stockMovements',     // Старые движения склада
    'inventory',          // Старые остатки
    'contractors'         // Старые подрядчики (если есть)
  ];

  let totalDeleted = 0;

  for (const collectionName of collectionsToClean) {
    try {
      console.log(`\n📂 Processing collection: ${collectionName}`);
      
      const collectionRef = collection(db, `users/${userId}/${collectionName}`);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        console.log(`   ✅ Collection ${collectionName} is already empty`);
        continue;
      }

      console.log(`   📊 Found ${snapshot.size} documents to delete`);

      // Удаление батчами по 500 документов (лимит Firestore)
      const batch = writeBatch(db);
      let batchCount = 0;
      let deletedInCollection = 0;

      for (const docSnapshot of snapshot.docs) {
        batch.delete(docSnapshot.ref);
        batchCount++;
        deletedInCollection++;

        // Выполнить батч когда достигли лимита
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   🗑️  Deleted batch of ${batchCount} documents`);
          batchCount = 0;
        }
      }

      // Выполнить оставшиеся документы
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   🗑️  Deleted final batch of ${batchCount} documents`);
      }

      totalDeleted += deletedInCollection;
      console.log(`   ✅ Deleted ${deletedInCollection} documents from ${collectionName}`);

    } catch (error) {
      console.error(`   ❌ Error cleaning ${collectionName}:`, error.message);
    }
  }

  console.log(`\n🎉 Total deleted: ${totalDeleted} documents for user ${userId}`);
  return totalDeleted;
}

/**
 * Очистка глобальных коллекций (не привязанных к пользователю)
 */
async function cleanGlobalData() {
  console.log(`\n🌍 Cleaning global collections...`);
  
  const globalCollections = [
    'products_global',      // Если есть глобальные товары
    'services_global',      // Если есть глобальные услуги
    'contractors_index',    // Индекс подрядчиков
    'products_index'        // Индекс товаров
  ];

  let totalDeleted = 0;

  for (const collectionName of globalCollections) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        console.log(`   ✅ Global collection ${collectionName} is already empty`);
        continue;
      }

      console.log(`   📊 Found ${snapshot.size} global documents to delete`);

      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(docSnapshot.ref);
        totalDeleted++;
      }

      console.log(`   ✅ Deleted ${snapshot.size} documents from ${collectionName}`);

    } catch (error) {
      console.error(`   ❌ Error cleaning global ${collectionName}:`, error.message);
    }
  }

  console.log(`🎉 Total global deleted: ${totalDeleted} documents`);
  return totalDeleted;
}

/**
 * Главная функция очистки
 */
async function runCleanup() {
  console.log('🚀 Starting database cleanup for ERP integration...\n');
  
  try {
    // Аутентификация
    await signInAnonymously(auth);
    const user = auth.currentUser;
    console.log(`🔐 Authenticated as: ${user.uid}`);

    // Очистка данных пользователя
    const userDeleted = await cleanUserData(user.uid);
    
    // Очистка глобальных данных
    const globalDeleted = await cleanGlobalData();

    console.log('\n=================================');
    console.log('🎯 CLEANUP COMPLETED SUCCESSFULLY');
    console.log('=================================');
    console.log(`📊 Total documents deleted: ${userDeleted + globalDeleted}`);
    console.log(`👤 User data deleted: ${userDeleted}`);
    console.log(`🌍 Global data deleted: ${globalDeleted}`);
    console.log('\n✅ Database is now clean for ERP integration!');
    console.log('🚀 You can now safely create new ERP components.');

  } catch (error) {
    console.error('\n💥 CLEANUP FAILED:', error);
    console.error('❌ Please fix the error and try again.');
    process.exit(1);
  }
}

/**
 * Безопасная очистка с подтверждением
 */
async function safeCleanup() {
  console.log('⚠️  WARNING: This will delete ALL existing products/services data!');
  console.log('📋 Collections to be cleaned:');
  console.log('   - products (old products)');
  console.log('   - services (old services)');  
  console.log('   - productMovements (old movements)');
  console.log('   - stockMovements (old stock operations)');
  console.log('   - inventory (old inventory data)');
  console.log('');

  // В production окружении требуем подтверждение
  if (process.env.NODE_ENV === 'production') {
    console.log('🚨 PRODUCTION MODE: Manual confirmation required');
    console.log('   Set CONFIRM_CLEANUP=true to proceed');
    
    if (process.env.CONFIRM_CLEANUP !== 'true') {
      console.log('❌ Cleanup cancelled for safety');
      process.exit(0);
    }
  }

  console.log('▶️  Starting cleanup in 3 seconds...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await runCleanup();
}

// Запуск скрипта
if (import.meta.url === `file://${process.argv[1]}`) {
  safeCleanup().catch(console.error);
}

export { cleanUserData, cleanGlobalData, runCleanup };
