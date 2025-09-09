/**
 * ============================================================================
 * E2E TESTS - T3 OPTIMIZATION CRITICAL PATHS (Time-to-Track < 3 seconds)
 * ============================================================================
 * 
 * End-to-end tests that measure and validate the T3 optimization system.
 * These tests ensure that users can start tracking time in under 3 seconds
 * through various entry points and scenarios.
 * 
 * TESTED SCENARIOS:
 * 1. Smart Widget Quick Start (Target: <1s)
 * 2. Command Palette Launch (Target: <2s)  
 * 3. Task Switching via TimeIndicator (Target: <1s)
 * 4. Continue Last Task (Target: <1s)
 * 5. Geolocation Triggers (Target: <3s)
 * 6. Offline/Online Scenarios (Target: <3s after sync)
 * 
 * @version 1.0.0
 * @since 2024-09-09
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const T3_THRESHOLD = 3000; // 3 seconds maximum
const T1_THRESHOLD = 1000; // 1 second optimal
const T2_THRESHOLD = 2000; // 2 seconds good

// Test data
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

const TEST_TASK_DATA = {
  projectName: 'T3 Test Project',
  taskName: 'Performance Testing Task',
  estimateName: 'Quick Start Estimate'
};

test.describe('T3 Optimization - Critical Time-to-Track Metrics', () => {
  
  test.beforeEach(async ({ page }) => {
    // Setup: Login and prepare test environment
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USER.email);
    await page.fill('[data-testid="password-input"]', TEST_USER.password);
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Ensure no active timer
    const activeTimer = page.locator('[data-testid="active-timer"]');
    if (await activeTimer.isVisible()) {
      await page.click('[data-testid="stop-timer"]');
      await expect(activeTimer).not.toBeVisible();
    }
  });

  test.describe('🚀 Scenario 1: Smart Widget Quick Start', () => {
    
    test('should start timer in <1s via smart suggestion', async ({ page }) => {
      // Arrange: Navigate to dashboard with smart widget
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="smart-start-widget"]')).toBeVisible();
      
      // Wait for suggestions to load
      await expect(page.locator('[data-testid="smart-suggestion-0"]')).toBeVisible();
      
      // Act: Measure time to start
      const startTime = Date.now();
      await page.click('[data-testid="smart-suggestion-0"]');
      
      // Wait for active timer to appear (optimistic update)
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const timeToStart = Date.now() - startTime;
      
      // Assert: T1 performance requirement  
      expect(timeToStart).toBeLessThan(T1_THRESHOLD);
      console.log(`✅ Smart Widget Start Time: ${timeToStart}ms`);
      
      // Verify timer is actually running
      const timerText = await page.locator('[data-testid="timer-display"]').textContent();
      expect(timerText).toMatch(/\d+:\d+/);
      
      // Verify task information is displayed
      expect(page.locator('[data-testid="current-task-name"]')).toBeVisible();
    });

    test('should show loading state during background sync', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Mock slow network for background operations
      await page.route('**/firestore.googleapis.com/**', route => {
        setTimeout(() => route.continue(), 2000); // 2s delay
      });
      
      const startTime = Date.now();
      await page.click('[data-testid="smart-suggestion-0"]');
      
      // Should still show optimistic UI immediately
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const optimisticTime = Date.now() - startTime;
      expect(optimisticTime).toBeLessThan(T1_THRESHOLD);
      
      // Should show sync indicator
      await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
      
      // Should complete sync within reasonable time
      await expect(page.locator('[data-testid="sync-indicator"]')).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle smart suggestions error gracefully', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Mock API error
      await page.route('**/timeEntries/**', route => {
        route.abort('failed');
      });
      
      // Should show error state but allow manual start
      await expect(page.locator('[data-testid="suggestions-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="manual-start-button"]')).toBeVisible();
      
      const startTime = Date.now();
      await page.click('[data-testid="manual-start-button"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      const fallbackTime = Date.now() - startTime;
      expect(fallbackTime).toBeLessThan(T3_THRESHOLD);
    });
  });

  test.describe('⌨️ Scenario 2: Command Palette Launch', () => {
    
    test('should start timer via Ctrl+K in <2s', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Act: Open command palette
      const startTime = Date.now();
      await page.keyboard.press('Control+K');
      
      // Wait for palette to open
      await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
      
      // Type to search for task
      await page.keyboard.type('Deploy');
      
      // Select first result
      await page.keyboard.press('Enter');
      
      // Wait for timer to start
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const timeToStart = Date.now() - startTime;
      
      // Assert: T2 performance requirement
      expect(timeToStart).toBeLessThan(T2_THRESHOLD);
      console.log(`⌨️ Command Palette Start Time: ${timeToStart}ms`);
      
      // Verify palette is closed
      await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/dashboard');
      
      await page.keyboard.press('Control+K');
      await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
      
      // Navigate with arrows
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowUp');
      
      const startTime = Date.now();
      await page.keyboard.press('Enter');
      
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const keyboardTime = Date.now() - startTime;
      expect(keyboardTime).toBeLessThan(T1_THRESHOLD);
    });

    test('should show fuzzy search results', async ({ page }) => {
      await page.goto('/dashboard');
      
      await page.keyboard.press('Control+K');
      await page.keyboard.type('dply'); // Fuzzy match for "Deploy"
      
      // Should show matching suggestions
      const suggestions = page.locator('[data-testid^="command-suggestion-"]');
      await expect(suggestions.first()).toBeVisible();
      
      const suggestionText = await suggestions.first().textContent();
      expect(suggestionText?.toLowerCase()).toContain('deploy');
    });
  });

  test.describe('🔄 Scenario 3: Task Switching via TimeIndicator', () => {
    
    test('should switch tasks in <1s with no time gap', async ({ page }) => {
      // Arrange: Start initial task
      await page.goto('/dashboard');
      await page.click('[data-testid="smart-suggestion-0"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      // Let it run for a moment
      await page.waitForTimeout(2000);
      
      // Get current time for gap verification
      const currentTime1 = await page.locator('[data-testid="timer-display"]').textContent();
      
      // Act: Switch via TimeIndicator
      await page.hover('[data-testid="time-indicator"]');
      await page.click('[data-testid="expand-indicator"]');
      
      const switchStartTime = Date.now();
      await page.click('[data-testid="quick-switch-button"]');
      
      // Should show immediate switch (optimistic)
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const switchTime = Date.now() - switchStartTime;
      
      // Assert: T1 performance for switching
      expect(switchTime).toBeLessThan(T1_THRESHOLD);
      console.log(`🔄 Task Switch Time: ${switchTime}ms`);
      
      // Verify task actually changed
      const newTaskName = await page.locator('[data-testid="current-task-name"]').textContent();
      expect(newTaskName).toBeDefined();
      
      // Verify no significant time gap (timer should continue from where it left off)
      const currentTime2 = await page.locator('[data-testid="timer-display"]').textContent();
      expect(currentTime2).not.toBe(currentTime1); // Should be different
      expect(currentTime2).toMatch(/\d+:\d+/); // Should be valid time format
    });

    test('should show switch suggestions in TimeIndicator', async ({ page }) => {
      // Start a task first
      await page.goto('/dashboard');
      await page.click('[data-testid="smart-suggestion-0"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      // Expand TimeIndicator
      await page.click('[data-testid="expand-indicator"]');
      
      // Should show switch suggestions
      await expect(page.locator('[data-testid="switch-suggestions"]')).toBeVisible();
      const suggestions = page.locator('[data-testid^="switch-suggestion-"]');
      await expect(suggestions.first()).toBeVisible();
      
      // Should show current task info
      await expect(page.locator('[data-testid="current-task-info"]')).toBeVisible();
    });
  });

  test.describe('⏯️ Scenario 4: Continue Last Task', () => {
    
    test('should continue last task in <1s', async ({ page }) => {
      // Arrange: Start and stop a task to create "last task"
      await page.goto('/dashboard');
      await page.click('[data-testid="smart-suggestion-0"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      // Stop the task
      await page.click('[data-testid="stop-timer"]');
      await expect(page.locator('[data-testid="active-timer"]')).not.toBeVisible();
      
      // Should show "Continue" option
      await expect(page.locator('[data-testid="continue-last-task"]')).toBeVisible();
      
      // Act: Continue last task
      const startTime = Date.now();
      await page.click('[data-testid="continue-last-task"]');
      
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const continueTime = Date.now() - startTime;
      
      // Assert: T1 performance
      expect(continueTime).toBeLessThan(T1_THRESHOLD);
      console.log(`⏯️ Continue Task Time: ${continueTime}ms`);
      
      // Should restore previous task context
      const taskName = await page.locator('[data-testid="current-task-name"]').textContent();
      expect(taskName).toBeDefined();
    });

    test('should restore task context after page refresh', async ({ page }) => {
      // Start a task
      await page.goto('/dashboard');
      await page.click('[data-testid="smart-suggestion-0"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      const originalTaskName = await page.locator('[data-testid="current-task-name"]').textContent();
      
      // Refresh page
      await page.reload();
      
      // Should restore active timer
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      // Should restore same task
      const restoredTaskName = await page.locator('[data-testid="current-task-name"]').textContent();
      expect(restoredTaskName).toBe(originalTaskName);
      
      // Timer should be running
      const timerText = await page.locator('[data-testid="timer-display"]').textContent();
      expect(timerText).toMatch(/\d+:\d+/);
    });
  });

  test.describe('📍 Scenario 5: Geolocation Triggers', () => {
    
    test('should trigger geofence notification in <3s', async ({ page, context }) => {
      // Grant geolocation permission
      await context.grantPermissions(['geolocation']);
      
      await page.goto('/dashboard');
      
      // Mock entering work location
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: {
              latitude: 55.7558, // Moscow coordinates
              longitude: 37.6173,
              accuracy: 10
            },
            timestamp: Date.now()
          });
        };
      });
      
      // Trigger geolocation check
      const startTime = Date.now();
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'));
      });
      
      // Should show geofence notification
      await expect(page.locator('[data-testid="geofence-notification"]')).toBeVisible({ timeout: T3_THRESHOLD });
      const notificationTime = Date.now() - startTime;
      
      expect(notificationTime).toBeLessThan(T3_THRESHOLD);
      console.log(`📍 Geofence Trigger Time: ${notificationTime}ms`);
      
      // Should offer to start timer
      await expect(page.locator('[data-testid="geofence-start-button"]')).toBeVisible();
    });

    test('should start timer from geofence notification', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await page.goto('/dashboard');
      
      // Setup geolocation
      await page.evaluate(() => {
        navigator.geolocation.getCurrentPosition = (success) => {
          success({
            coords: { latitude: 55.7558, longitude: 37.6173, accuracy: 10 },
            timestamp: Date.now()
          });
        };
      });
      
      // Trigger and wait for notification
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await expect(page.locator('[data-testid="geofence-notification"]')).toBeVisible();
      
      // Start timer from notification
      const startTime = Date.now();
      await page.click('[data-testid="geofence-start-button"]');
      
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const geoStartTime = Date.now() - startTime;
      
      expect(geoStartTime).toBeLessThan(T2_THRESHOLD);
      
      // Should record geolocation data
      await expect(page.locator('[data-testid="location-indicator"]')).toBeVisible();
    });
  });

  test.describe('🌐 Scenario 6: Offline/Online Scenarios', () => {
    
    test('should start timer offline with optimistic UI', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Go offline
      await context.setOffline(true);
      
      // Attempt to start timer
      const startTime = Date.now();
      await page.click('[data-testid="smart-suggestion-0"]');
      
      // Should still show active timer (optimistic)
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const offlineStartTime = Date.now() - startTime;
      
      expect(offlineStartTime).toBeLessThan(T1_THRESHOLD);
      console.log(`🌐 Offline Start Time: ${offlineStartTime}ms`);
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Restore connection
      await context.setOffline(false);
      
      // Should sync and remove offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="sync-success"]')).toBeVisible();
    });

    test('should handle sync conflicts gracefully', async ({ page, context }) => {
      await page.goto('/dashboard');
      
      // Start timer online
      await page.click('[data-testid="smart-suggestion-0"]');
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      
      // Go offline and make changes
      await context.setOffline(true);
      await page.click('[data-testid="pause-timer"]');
      
      // Simulate conflicting changes in another tab/device
      await page.evaluate(() => {
        localStorage.setItem('pending-sync-conflicts', JSON.stringify([{
          type: 'time_entry_conflict',
          local: { status: 'paused' },
          remote: { status: 'active' }
        }]));
      });
      
      // Come back online
      await context.setOffline(false);
      
      // Should detect and resolve conflict
      await expect(page.locator('[data-testid="sync-conflict-dialog"]')).toBeVisible({ timeout: 3000 });
      
      // Auto-resolve or allow user choice
      if (await page.locator('[data-testid="auto-resolve-conflict"]').isVisible()) {
        await page.click('[data-testid="auto-resolve-conflict"]');
      }
      
      await expect(page.locator('[data-testid="sync-conflict-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('📊 Performance Monitoring & Analytics', () => {
    
    test('should track T3 metrics for all start methods', async ({ page }) => {
      const startMethods = [
        { method: 'smart-widget', selector: '[data-testid="smart-suggestion-0"]', threshold: T1_THRESHOLD },
        { method: 'manual-button', selector: '[data-testid="manual-start-button"]', threshold: T2_THRESHOLD },
        { method: 'command-palette', action: async () => {
          await page.keyboard.press('Control+K');
          await page.keyboard.press('Enter');
        }, threshold: T2_THRESHOLD }
      ];

      const metrics = [];

      for (const { method, selector, action, threshold } of startMethods) {
        // Reset state
        await page.goto('/dashboard');
        
        const startTime = Date.now();
        
        if (action) {
          await action();
        } else if (selector) {
          await page.click(selector);
        }
        
        await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
        const timeToStart = Date.now() - startTime;
        
        metrics.push({ method, timeToStart, threshold });
        
        // Stop timer for next iteration
        await page.click('[data-testid="stop-timer"]');
        await expect(page.locator('[data-testid="active-timer"]')).not.toBeVisible();
      }

      // Assert all methods meet their thresholds
      metrics.forEach(({ method, timeToStart, threshold }) => {
        expect(timeToStart, `${method} should be under ${threshold}ms`).toBeLessThan(threshold);
        console.log(`📊 ${method}: ${timeToStart}ms (threshold: ${threshold}ms)`);
      });

      // Log overall T3 compliance
      const avgTime = metrics.reduce((sum, m) => sum + m.timeToStart, 0) / metrics.length;
      console.log(`📈 Average T3 Time: ${avgTime}ms`);
      expect(avgTime).toBeLessThan(T2_THRESHOLD);
    });

    test('should measure memory usage during extended operation', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Get initial memory baseline
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      // Perform multiple start/stop cycles
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="smart-suggestion-0"]');
        await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
        await page.waitForTimeout(1000);
        await page.click('[data-testid="stop-timer"]');
        await expect(page.locator('[data-testid="active-timer"]')).not.toBeVisible();
      }

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`🧠 Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(1)}%)`);
        
        // Should not increase memory by more than 50% during normal operation
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });
  });

  test.describe('♿ Accessibility & Usability', () => {
    
    test('should be fully keyboard accessible', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Tab navigation should work
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to start timer with Enter
      const startTime = Date.now();
      await page.keyboard.press('Enter');
      
      await expect(page.locator('[data-testid="active-timer"]')).toBeVisible();
      const keyboardTime = Date.now() - startTime;
      
      expect(keyboardTime).toBeLessThan(T2_THRESHOLD);
      console.log(`♿ Keyboard Start Time: ${keyboardTime}ms`);
    });

    test('should announce status changes to screen readers', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Check for ARIA live regions
      await expect(page.locator('[aria-live="polite"]')).toBeVisible();
      
      // Start timer and check announcements
      await page.click('[data-testid="smart-suggestion-0"]');
      
      // Should announce timer start
      const announcement = page.locator('[aria-live="polite"]');
      await expect(announcement).toContainText(/timer.*started/i);
    });
  });
});