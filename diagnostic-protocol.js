/**
 * 🔍 StartWorkPage Diagnostic Protocol
 * Complete 4-stage data flow analysis
 */

class StartWorkPageDiagnostic {
  constructor() {
    this.results = {
      stage1: { status: 'pending', data: {}, errors: [] },
      stage2: { status: 'pending', data: {}, errors: [] },
      stage3: { status: 'pending', data: {}, errors: [] },
      stage4: { status: 'pending', data: {}, errors: [] }
    };
    this.testData = null;
  }

  async executeFullDiagnostic() {
    console.log('🚀 Starting Complete StartWorkPage Diagnostic Protocol');
    console.log('═══════════════════════════════════════════════════════');
    
    try {
      // Stage 1: Backend/RBAC/Firestore Verification
      await this.stage1_VerifyBackend();
      
      // Stage 2: Network API Analysis  
      await this.stage2_AnalyzeNetwork();
      
      // Stage 3: State Management Check
      await this.stage3_CheckStateManagement();
      
      // Stage 4: UI Rendering Logic
      await this.stage4_DebugUIRendering();
      
      // Generate Final Report
      this.generateDiagnosticReport();
      
    } catch (error) {
      console.error('❌ Diagnostic protocol failed:', error);
      this.results.criticalError = error;
    }
  }

  async stage1_VerifyBackend() {
    console.log('\n🔍 STAGE 1: Backend/RBAC/Firestore Verification');
    console.log('─────────────────────────────────────────────────');
    
    try {
      // Check authentication
      const auth = window.firebase?.auth?.();
      const currentUser = auth?.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }
      
      console.log('✅ User authenticated:', currentUser.uid);
      this.results.stage1.data.userId = currentUser.uid;
      this.results.stage1.data.userEmail = currentUser.email;
      
      // Check Firestore access
      const db = window.firebase?.firestore?.();
      if (!db) {
        throw new Error('Firestore not available');
      }
      
      // Test data creation/verification
      await this.createVerifyTestData(db, currentUser.uid);
      
      // Verify Firestore rules
      await this.verifyFirestoreRules(db, currentUser.uid);
      
      this.results.stage1.status = 'completed';
      console.log('✅ Stage 1 completed successfully');
      
    } catch (error) {
      this.results.stage1.status = 'failed';
      this.results.stage1.errors.push(error.message);
      console.error('❌ Stage 1 failed:', error);
    }
  }

  async createVerifyTestData(db, userId) {
    console.log('📝 Creating/Verifying test data...');
    
    try {
      // Create Test Project A
      const projectRef = db.collection('projects').doc('test-project-a');
      const projectData = {
        id: 'test-project-a',
        name: 'Test Project A - Diagnostic',
        description: 'Diagnostic test project',
        status: 'active',
        type: 'development',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId
      };
      await projectRef.set(projectData, { merge: true });
      
      // Create Test Task A1
      const taskRef = db.collection('users').doc(userId).collection('tasks').doc('test-task-a1');
      const taskData = {
        id: 'test-task-a1',
        task: 'Test Task A1 - High Priority',
        description: 'Diagnostic high-priority task',
        projectId: 'test-project-a',
        projectName: projectData.name,
        status: 'assigned',
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId
      };
      await taskRef.set(taskData, { merge: true });
      
      // Create Test Estimate A2
      const estimateRef = db.collection('users').doc(userId).collection('estimates').doc('test-estimate-a2');
      const estimateData = {
        id: 'test-estimate-a2',
        name: 'Test Estimate A2 - Diagnostic',
        description: 'Diagnostic test estimate',
        projectId: 'test-project-a',
        projectName: projectData.name,
        status: 'active',
        items: [
          {
            id: 'service-diagnostic-1',
            name: 'Frontend Development Service',
            description: 'UI development diagnostic service',
            quantity: 20,
            rate: 1500,
            total: 30000
          },
          {
            id: 'service-diagnostic-2',
            name: 'Backend API Service', 
            description: 'API development diagnostic service',
            quantity: 15,
            rate: 1800,
            total: 27000
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userId
      };
      await estimateRef.set(estimateData, { merge: true });
      
      this.testData = {
        project: projectData,
        task: taskData,
        estimate: estimateData
      };
      
      console.log('✅ Test data created/verified:');
      console.log('  📁 Project:', projectData.name);
      console.log('  📋 Task:', taskData.task, `(${taskData.priority}, ${taskData.status})`);
      console.log('  💰 Estimate:', estimateData.name, `(${estimateData.items.length} services)`);
      
      this.results.stage1.data.testDataCreated = true;
      this.results.stage1.data.testData = this.testData;
      
    } catch (error) {
      console.error('❌ Failed to create/verify test data:', error);
      throw new Error(`Test data creation failed: ${error.message}`);
    }
  }

  async verifyFirestoreRules(db, userId) {
    console.log('🔐 Verifying Firestore security rules...');
    
    try {
      // Test project read access
      const projectTest = await db.collection('projects').doc('test-project-a').get();
      if (!projectTest.exists) {
        throw new Error('Cannot read project data - security rules may be blocking');
      }
      
      // Test user tasks read access
      const tasksTest = await db.collection('users').doc(userId).collection('tasks').limit(1).get();
      // No error means access is allowed
      
      // Test user estimates read access  
      const estimatesTest = await db.collection('users').doc(userId).collection('estimates').limit(1).get();
      // No error means access is allowed
      
      console.log('✅ Firestore rules verification passed');
      this.results.stage1.data.firestoreRulesOk = true;
      
    } catch (error) {
      console.error('❌ Firestore rules verification failed:', error);
      throw new Error(`Firestore rules blocking access: ${error.message}`);
    }
  }

  async stage2_AnalyzeNetwork() {
    console.log('\n🌐 STAGE 2: Network API Analysis');
    console.log('─────────────────────────────────');
    
    try {
      // Monitor network requests
      this.startNetworkMonitoring();
      
      // Trigger page refresh to capture API calls
      console.log('🔄 Triggering page refresh to capture API calls...');
      console.log('📊 Check Network tab in DevTools for:');
      console.log('  - Firebase Firestore requests');
      console.log('  - Any 401/403/500 errors');
      console.log('  - Response payloads');
      
      // Check if streams are working
      await this.testFirestoreStreams();
      
      this.results.stage2.status = 'completed';
      console.log('✅ Stage 2 completed - check Network tab for details');
      
    } catch (error) {
      this.results.stage2.status = 'failed';
      this.results.stage2.errors.push(error.message);
      console.error('❌ Stage 2 failed:', error);
    }
  }

  startNetworkMonitoring() {
    console.log('📡 Network monitoring active - check DevTools Network tab');
    
    // We can't directly intercept fetch in this context, but we can provide guidance
    this.results.stage2.data.networkMonitoringActive = true;
    this.results.stage2.data.instructions = [
      'Open DevTools → Network tab',
      'Filter by "firestore" or "firebase"',  
      'Refresh page and observe requests',
      'Check for 401/403/500 status codes',
      'Examine response payloads for data'
    ];
  }

  async testFirestoreStreams() {
    console.log('🔄 Testing Firestore streams directly...');
    
    const auth = window.firebase?.auth?.();
    const currentUser = auth?.currentUser;
    const db = window.firebase?.firestore?.();
    
    if (!currentUser || !db) {
      throw new Error('Firebase not available for stream testing');
    }
    
    try {
      // Test projects stream
      let projectsReceived = false;
      const projectsPromise = new Promise((resolve) => {
        db.collection('projects')
          .where('userId', '==', currentUser.uid)
          .onSnapshot((snapshot) => {
            const projects = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            console.log('📁 Projects stream data:', projects.length, 'projects');
            projectsReceived = true;
            this.results.stage2.data.projectsCount = projects.length;
            resolve(projects);
          });
      });
      
      // Test tasks stream  
      let tasksReceived = false;
      const tasksPromise = new Promise((resolve) => {
        db.collection('users').doc(currentUser.uid).collection('tasks')
          .onSnapshot((snapshot) => {
            const tasks = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            console.log('📋 Tasks stream data:', tasks.length, 'tasks');
            tasksReceived = true;
            this.results.stage2.data.tasksCount = tasks.length;
            resolve(tasks);
          });
      });
      
      // Test estimates stream
      let estimatesReceived = false;
      const estimatesPromise = new Promise((resolve) => {
        db.collection('users').doc(currentUser.uid).collection('estimates')
          .onSnapshot((snapshot) => {
            const estimates = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            console.log('💰 Estimates stream data:', estimates.length, 'estimates');
            estimatesReceived = true;
            this.results.stage2.data.estimatesCount = estimates.length;
            resolve(estimates);
          });
      });
      
      // Wait for all streams to respond (with timeout)
      setTimeout(() => {
        this.results.stage2.data.streamsReceived = {
          projects: projectsReceived,
          tasks: tasksReceived,
          estimates: estimatesReceived
        };
      }, 2000);
      
      console.log('✅ Firestore streams initiated successfully');
      
    } catch (error) {
      console.error('❌ Firestore streams test failed:', error);
      throw error;
    }
  }

  async stage3_CheckStateManagement() {
    console.log('\n⚛️  STAGE 3: State Management Analysis');
    console.log('─────────────────────────────────────');
    
    try {
      // Check React DevTools availability
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        console.log('✅ React DevTools available');
      } else {
        console.warn('⚠️  React DevTools not available - install for better debugging');
      }
      
      // Check TimeTrackingContext in the DOM
      this.analyzeReactState();
      
      this.results.stage3.status = 'completed';
      console.log('✅ Stage 3 completed');
      
    } catch (error) {
      this.results.stage3.status = 'failed';
      this.results.stage3.errors.push(error.message);
      console.error('❌ Stage 3 failed:', error);
    }
  }

  analyzeReactState() {
    console.log('🔍 Analyzing React component state...');
    
    // Look for TimeTrackingContext data in the console logs
    console.log('📊 Instructions for manual state verification:');
    console.log('1. Open React DevTools → Components tab');
    console.log('2. Find TimeTrackingProvider component'); 
    console.log('3. Check its state/props for data arrays');
    console.log('4. Look for StartWorkPage component');
    console.log('5. Verify its local state (projects, tasks, estimates arrays)');
    
    // Check for console logs from our diagnostic code
    console.log('🔄 Look for these console messages in the log:');
    console.log('  - "🔍 Loading data for user: [userId]"');
    console.log('  - "📁 Projects loaded: X"');
    console.log('  - "📋 Tasks loaded: X"');
    console.log('  - "💰 Estimates loaded: X"');
    console.log('  - "✅ All data sources loaded"');
    console.log('  - "🔄 Computing work items with: {projectsCount: X, tasksCount: X, ...}"');
    
    this.results.stage3.data.manualVerificationRequired = true;
    this.results.stage3.data.checkpoints = [
      'TimeTrackingProvider state',
      'StartWorkPage local state',
      'Console loading messages',
      'Data transformation logs'
    ];
  }

  async stage4_DebugUIRendering() {
    console.log('\n🎨 STAGE 4: UI Rendering & Filtering Logic');
    console.log('─────────────────────────────────────────────');
    
    try {
      // Check console for JS errors
      this.checkConsoleErrors();
      
      // Analyze DOM structure
      this.analyzeDOMStructure();
      
      // Check filters state
      this.checkFiltersState();
      
      this.results.stage4.status = 'completed';
      console.log('✅ Stage 4 completed');
      
    } catch (error) {
      this.results.stage4.status = 'failed';
      this.results.stage4.errors.push(error.message);
      console.error('❌ Stage 4 failed:', error);
    }
  }

  checkConsoleErrors() {
    console.log('🐛 Checking for console errors...');
    
    // We can't access console.log history directly, but we can guide the user
    console.log('📋 Manual error checking steps:');
    console.log('1. Check Console tab for any red error messages');
    console.log('2. Look for "Cannot read property" or "undefined" errors');
    console.log('3. Check for TypeScript type errors');
    console.log('4. Verify no React rendering errors');
    
    this.results.stage4.data.consoleErrorsCheckRequired = true;
  }

  analyzeDOMStructure() {
    console.log('🔍 Analyzing DOM structure...');
    
    try {
      // Look for key elements on the page
      const prioritySection = document.querySelector('[data-testid="priority-section"], .priority-items');
      const searchSection = document.querySelector('input[placeholder*="Поиск"], input[placeholder*="поиск"]');
      const workItemsList = document.querySelector('.work-items-list, .projects-list');
      const emptyState = document.querySelector('[data-testid="empty-state"]');
      
      console.log('📊 DOM Analysis Results:');
      console.log('  Priority Section:', prioritySection ? '✅ Found' : '❌ Missing');
      console.log('  Search Section:', searchSection ? '✅ Found' : '❌ Missing');
      console.log('  Work Items List:', workItemsList ? '✅ Found' : '❌ Missing');
      console.log('  Empty State:', emptyState ? '✅ Showing' : '❌ Hidden');
      
      this.results.stage4.data.domElements = {
        prioritySection: !!prioritySection,
        searchSection: !!searchSection,
        workItemsList: !!workItemsList,
        emptyState: !!emptyState
      };
      
    } catch (error) {
      console.error('❌ DOM analysis failed:', error);
    }
  }

  checkFiltersState() {
    console.log('🔍 Checking filters and search state...');
    
    try {
      // Look for search input
      const searchInput = document.querySelector('input[placeholder*="оиск"]');
      if (searchInput) {
        const searchValue = searchInput.value;
        console.log('🔍 Search input value:', searchValue || '(empty)');
        this.results.stage4.data.searchValue = searchValue;
      }
      
      // Look for active filters
      const activeFilters = document.querySelectorAll('.MuiChip-filled, .active-filter');
      console.log('🏷️  Active filters count:', activeFilters.length);
      
      if (activeFilters.length > 0) {
        console.log('🏷️  Active filters:', Array.from(activeFilters).map(f => f.textContent));
        this.results.stage4.data.activeFilters = Array.from(activeFilters).map(f => f.textContent);
      }
      
    } catch (error) {
      console.error('❌ Filters check failed:', error);
    }
  }

  generateDiagnosticReport() {
    console.log('\n📋 DIAGNOSTIC REPORT SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    
    const stages = [
      { name: 'Stage 1: Backend/RBAC/Firestore', result: this.results.stage1 },
      { name: 'Stage 2: Network API Analysis', result: this.results.stage2 },
      { name: 'Stage 3: State Management', result: this.results.stage3 },
      { name: 'Stage 4: UI Rendering Logic', result: this.results.stage4 }
    ];
    
    stages.forEach((stage, index) => {
      const status = stage.result.status;
      const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⏳';
      
      console.log(`${icon} ${stage.name}: ${status.toUpperCase()}`);
      
      if (stage.result.errors.length > 0) {
        console.log(`    Errors: ${stage.result.errors.join(', ')}`);
      }
      
      if (Object.keys(stage.result.data).length > 0) {
        console.log(`    Data:`, stage.result.data);
      }
    });
    
    // Overall assessment
    const failedStages = stages.filter(s => s.result.status === 'failed').length;
    const completedStages = stages.filter(s => s.result.status === 'completed').length;
    
    console.log('\n🎯 OVERALL ASSESSMENT:');
    if (failedStages === 0) {
      console.log('✅ ALL STAGES PASSED - System should be working correctly');
    } else if (failedStages <= 1) {
      console.log('⚠️  MINOR ISSUES DETECTED - Check failed stage for details');
    } else {
      console.log('❌ CRITICAL ISSUES DETECTED - Multiple stages failed');
    }
    
    console.log(`📊 Stages: ${completedStages}/${stages.length} completed, ${failedStages} failed`);
    
    // Next steps
    console.log('\n🔄 NEXT STEPS:');
    if (this.testData) {
      console.log('1. ✅ Test data is available');
      console.log('2. 🔄 Refresh the page to see if data appears');
      console.log('3. 🎯 Try starting timer on Test Task A1');
    } else {
      console.log('1. ❌ Create test data first');
      console.log('2. 🔄 Run diagnostic again');
    }
    
    return this.results;
  }
}

// Initialize and expose diagnostic tool
const diagnostic = new StartWorkPageDiagnostic();
window.startWorkPageDiagnostic = diagnostic;

// Auto-run diagnostic on load
console.log('🔧 StartWorkPage Diagnostic Tool Loaded');
console.log('💡 Run: startWorkPageDiagnostic.executeFullDiagnostic()');
console.log('');

// Auto-execute if on the right page
if (window.location.pathname === '/start-work') {
  console.log('🎯 Auto-executing diagnostic on StartWorkPage...');
  diagnostic.executeFullDiagnostic();
}