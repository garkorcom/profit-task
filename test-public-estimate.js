/**
 * Быстрый тест публичной сметы
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function testPublicEstimate() {
  const estimateId = 'public-test-1758079790472';
  
  console.log('🔍 Searching for estimate:', estimateId);
  
  try {
    // Получаем всех пользователей
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    console.log(`📁 Checking ${usersSnapshot.docs.length} users...`);
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`👤 Checking user: ${userId}`);
      
      // Проверяем estimates коллекцию
      try {
        const estimateDoc = await getDoc(doc(db, 'users', userId, 'estimates', estimateId));
        if (estimateDoc.exists()) {
          const data = estimateDoc.data();
          console.log('✅ FOUND in estimates collection!');
          console.log('📊 Data:', {
            id: estimateDoc.id,
            number: data.number,
            status: data.status,
            title: data.title,
            createdAt: data.createdAt,
            userId: userId
          });
          return;
        }
      } catch (error) {
        console.log(`❌ Error checking estimates for ${userId}:`, error.message);
      }
      
      // Проверяем estimatesV2 коллекцию
      try {
        const estimateDocV2 = await getDoc(doc(db, 'users', userId, 'estimatesV2', estimateId));
        if (estimateDocV2.exists()) {
          const data = estimateDocV2.data();
          console.log('✅ FOUND in estimatesV2 collection!');
          console.log('📊 Data:', {
            id: estimateDocV2.id,
            number: data.number,
            status: data.status,
            title: data.title,
            createdAt: data.createdAt,
            userId: userId
          });
          return;
        }
      } catch (error) {
        console.log(`❌ Error checking estimatesV2 for ${userId}:`, error.message);
      }
    }
    
    console.log('❌ Estimate not found in any collection');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

testPublicEstimate().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
