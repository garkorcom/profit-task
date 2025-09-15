/**
 * Простой тест прав доступа для ERP системы
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  collection,
  doc,
  addDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator,
  signInAnonymously 
} from 'firebase/auth';

// Конфигурация для эмуляторов
const firebaseConfig = {
  apiKey: "test",
  authDomain: "test.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "test-app-id"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Подключение к эмуляторам
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  console.log('✅ Connected to Firebase emulators');
} catch (error) {
  console.log('⚠️  Emulators already connected');
}

async function testPermissions() {
  console.log('🧪 Testing ERP permissions...\n');
  
  try {
    // Аутентификация
    await signInAnonymously(auth);
    const user = auth.currentUser;
    console.log(`✅ Authenticated as: ${user.uid}`);
    
    // Тест 1: Создание элемента номенклатуры
    console.log('\n1. Testing items collection...');
    const itemRef = await addDoc(
      collection(db, `users/${user.uid}/items`),
      {
        type: 'product',
        code: 'TEST-001',
        name: 'Test Item',
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }
    );
    console.log(`✅ Created item: ${itemRef.id}`);
    
    // Тест 2: Создание склада
    console.log('\n2. Testing warehouses collection...');
    const warehouseRef = await addDoc(
      collection(db, `users/${user.uid}/warehouses`),
      {
        code: 'WH-001',
        name: 'Test Warehouse',
        isActive: true,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }
    );
    console.log(`✅ Created warehouse: ${warehouseRef.id}`);
    
    // Тест 3: Создание транзакции склада
    console.log('\n3. Testing warehouse transactions...');
    const transactionRef = await addDoc(
      collection(db, `users/${user.uid}/warehouses/${warehouseRef.id}/transactions`),
      {
        type: 'receipt',
        itemId: itemRef.id,
        quantity: 100,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }
    );
    console.log(`✅ Created transaction: ${transactionRef.id}`);
    
    // Тест 4: Создание партии
    console.log('\n4. Testing stock lots...');
    const lotRef = await addDoc(
      collection(db, `users/${user.uid}/warehouses/${warehouseRef.id}/stockLots`),
      {
        itemId: itemRef.id,
        lotNumber: 'LOT-001',
        quantity: 100,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }
    );
    console.log(`✅ Created lot: ${lotRef.id}`);
    
    // Тест 5: Создание резервирования
    console.log('\n5. Testing reservations...');
    const reservationRef = await addDoc(
      collection(db, `users/${user.uid}/reservations`),
      {
        itemId: itemRef.id,
        warehouseId: warehouseRef.id,
        quantity: 50,
        type: 'estimate',
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      }
    );
    console.log(`✅ Created reservation: ${reservationRef.id}`);
    
    console.log('\n🎉 All tests passed! ERP permissions are working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error code:', error.code);
  }
}

// Ждем 3 секунды для запуска эмуляторов
setTimeout(testPermissions, 3000);
