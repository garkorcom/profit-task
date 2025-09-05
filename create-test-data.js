// Test data creation script for StartWorkPage diagnosis
// Run this in browser console on http://localhost:3000/start-work

async function createTestData() {
  console.log('🎯 Creating test data for StartWorkPage diagnosis...');
  
  // Get current user
  const auth = window.firebase?.auth?.();
  if (!auth?.currentUser) {
    console.error('❌ No authenticated user found. Please login first.');
    return;
  }
  
  const userId = auth.currentUser.uid;
  const db = window.firebase.firestore();
  
  try {
    // Create Test Project A
    console.log('📁 Creating Test Project A...');
    const projectRef = db.collection('projects').doc();
    const projectData = {
      id: projectRef.id,
      name: 'Test Project A',
      description: 'Эталонный проект для тестирования StartWorkPage',
      status: 'active',
      type: 'development',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userId
    };
    await projectRef.set(projectData);
    console.log('✅ Project created:', projectData.name);
    
    // Create Test Task A1
    console.log('📋 Creating Test Task A1...');
    const taskRef = db.collection('users').doc(userId).collection('tasks').doc();
    const taskData = {
      id: taskRef.id,
      task: 'Test Task A1',
      description: 'Эталонная задача для диагностики',
      projectId: projectRef.id,
      projectName: projectData.name,
      status: 'assigned',
      priority: 'high',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userId
    };
    await taskRef.set(taskData);
    console.log('✅ Task created:', taskData.task);
    
    // Create Test Estimate A2
    console.log('💰 Creating Test Estimate A2...');
    const estimateRef = db.collection('users').doc(userId).collection('estimates').doc();
    const estimateData = {
      id: estimateRef.id,
      name: 'Test Estimate A2',
      description: 'Эталонная смета для диагностики',
      projectId: projectRef.id,
      projectName: projectData.name,
      status: 'active',
      items: [
        {
          id: 'service-1',
          name: 'Service 1 - Frontend Development',
          description: 'Разработка пользовательского интерфейса',
          quantity: 40,
          rate: 1500,
          total: 60000
        },
        {
          id: 'service-2', 
          name: 'Service 2 - Backend API',
          description: 'Разработка серверной части',
          quantity: 30,
          rate: 1800,
          total: 54000
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: userId
    };
    await estimateRef.set(estimateData);
    console.log('✅ Estimate created:', estimateData.name);
    
    console.log('🎉 Test data creation completed!');
    console.log('📊 Created:');
    console.log('  - 1 Project: ' + projectData.name);
    console.log('  - 1 Task: ' + taskData.task + ' (priority: high, status: assigned)');
    console.log('  - 1 Estimate: ' + estimateData.name + ' (2 services)');
    console.log('');
    console.log('🔄 Refresh the page to see the data...');
    
    return {
      project: projectData,
      task: taskData,
      estimate: estimateData
    };
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

// Export for manual execution
window.createTestData = createTestData;
console.log('💡 Run createTestData() in console to create test data');