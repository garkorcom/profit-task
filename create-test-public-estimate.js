/**
 * Создание тестовой публичной сметы
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config
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

async function createTestPublicEstimate() {
  // Используем тестового пользователя (замените на реальный ID пользователя)
  const testUserId = 'm4Uzwwc2jLRlZKzhkmMc9uu2L8c2'; // Один из пользователей из предыдущего поиска
  const estimateId = 'public-test-' + Date.now();
  
  console.log('🔧 Creating test public estimate...');
  console.log('📋 User ID:', testUserId);
  console.log('📋 Estimate ID:', estimateId);
  
  try {
    // Создаем тестовую смету со статусом "sent"
    const estimateData = {
      id: estimateId,
      number: `EST-TEST-${Date.now()}`,
      status: 'sent', // Публичный статус
      title: 'Тестовая публичная смета для диагностики',
      terms: 'Это тестовая смета, созданная для проверки публичного доступа. Она должна быть доступна по прямой ссылке без входа в систему.',
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: testUserId,
      revision: 1,
      
      // V2 структура с totals
      totals: {
        materialsCost: 800,
        laborCost: 1500,
        equipmentCost: 200,
        subcontractCost: 0,
        overheadPct: 10,
        overheadAmt: 250,
        discountAmt: 0,
        shippingAmt: 0,
        subtotalPrice: 2500,
        taxAmt: 500,
        grandTotal: 3000,
        grossMarginPct: 20
      },
      
      // Блоки услуг
      blocks: [
        {
          key: 'services',
          data: {
            rows: [
              {
                id: '1',
                name: 'Консультация и анализ требований',
                description: 'Детальный анализ потребностей клиента и техническая консультация',
                quantity: 8,
                unit: 'час',
                unitPrice: 100,
                totalCost: 800,
                pert: {
                  optimistic: 6,
                  mostLikely: 8,
                  pessimistic: 12
                }
              },
              {
                id: '2', 
                name: 'Разработка технического решения',
                description: 'Проектирование архитектуры и создание технической документации',
                quantity: 10,
                unit: 'час',
                unitPrice: 150,
                totalCost: 1500,
                pert: {
                  optimistic: 8,
                  mostLikely: 10,
                  pessimistic: 14
                }
              },
              {
                id: '3',
                name: 'Настройка оборудования',
                description: 'Установка и настройка необходимого оборудования',
                quantity: 2,
                unit: 'шт',
                unitPrice: 100,
                totalCost: 200,
                pert: {
                  optimistic: 1,
                  mostLikely: 2,
                  pessimistic: 3
                }
              }
            ]
          }
        }
      ]
    };

    // Сохраняем в коллекцию estimates
    await setDoc(
      doc(db, 'users', testUserId, 'estimates', estimateId),
      estimateData
    );

    console.log('✅ Test public estimate created successfully!');
    console.log('📊 Estimate data:', {
      id: estimateId,
      number: estimateData.number,
      status: estimateData.status,
      total: estimateData.totals.grandTotal,
      userId: testUserId
    });
    
    const publicUrl = `http://localhost:3000/public/estimate/${estimateId}`;
    console.log('🔗 Public URL:', publicUrl);
    console.log('');
    console.log('🎉 You can now test the public estimate at:');
    console.log(publicUrl);
    
    return estimateId;
    
  } catch (error) {
    console.error('❌ Error creating test estimate:', error);
    throw error;
  }
}

createTestPublicEstimate().then((estimateId) => {
  console.log('🏁 Test completed successfully');
  console.log('📋 New estimate ID:', estimateId);
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
