/**
 * ============================================================================
 * E2E TESTS - Estimate Constructor Complete Flow
 * ============================================================================
 * 
 * End-to-end tests for the complete estimate construction workflow.
 * Tests full user scenarios from creation to completion using Playwright.
 * 
 * 🧪 TEST INSTRUCTIONS:
 * 1. Run: npm run test:e2e
 * 2. Requires Playwright setup with browser automation
 * 3. Tests complete user workflows with real UI interactions
 * 4. Uses data-testid attributes for reliable element selection
 * 
 * 🔧 SCENARIOS TESTED:
 * - Complete estimate creation flow (all 8 blocks)
 * - Block validation and error handling
 * - Real-time calculation updates
 * - Template application workflow
 * - Status transition business rules
 * - Collaborative editing scenarios
 * - Auto-save and draft persistence
 * - Network error resilience
 * - Keyboard navigation accessibility
 * - Data consistency across refreshes
 * 
 * 🛠️ E2E COVERAGE:
 * - User authentication flow
 * - Complete estimate construction
 * - Block-by-block data entry
 * - Calculation engine accuracy
 * - Real-time collaboration
 * - Error recovery scenarios
 * 
 * @category E2E Tests
 * @requires @playwright/test
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const testEstimate = {
  counterparty: {
    name: 'Test Construction Co.',
    email: 'test@construction.com',
    phone: '+1-555-0123'
  },
  project: {
    name: 'Office Building Renovation',
    address: '123 Main St, Los Angeles, CA'
  },
  services: [
    {
      name: 'Site Preparation',
      quantity: 1,
      unit: 'lot',
      rate: 5000
    },
    {
      name: 'Foundation Work',
      quantity: 500,
      unit: 'sq ft',
      rate: 15
    }
  ]
};

test.describe('Estimate Constructor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create complete estimate from scratch', async ({ page }) => {
    // Navigate to new estimate
    await page.goto('/estimates/new');
    await expect(page.locator('[data-testid="estimate-constructor"]')).toBeVisible();

    // Verify all 8 blocks are present and empty
    const blockKeys = [
      'counterparty', 'project', 'services', 'products', 
      'costing', 'estimate_tasks', 'communication', 'statuses'
    ];
    
    for (const blockKey of blockKeys) {
      await expect(page.locator(`[data-testid="block-${blockKey}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="block-${blockKey}-status"]`)).toHaveText('empty');
    }

    // Fill Counterparty Block
    await page.click('[data-testid="block-counterparty-edit"]');
    await page.fill('[data-testid="counterparty-search"]', testEstimate.counterparty.name);
    await page.click('[data-testid="counterparty-create-new"]');
    await page.fill('[data-testid="counterparty-name"]', testEstimate.counterparty.name);
    await page.fill('[data-testid="counterparty-email"]', testEstimate.counterparty.email);
    await page.fill('[data-testid="counterparty-phone"]', testEstimate.counterparty.phone);
    await page.click('[data-testid="counterparty-save"]');
    
    // Verify block status changed to complete
    await expect(page.locator('[data-testid="block-counterparty-status"]')).toHaveText('complete');

    // Fill Project Block
    await page.click('[data-testid="block-project-edit"]');
    await page.fill('[data-testid="project-search"]', testEstimate.project.name);
    await page.click('[data-testid="project-create-new"]');
    await page.fill('[data-testid="project-name"]', testEstimate.project.name);
    await page.fill('[data-testid="project-address"]', testEstimate.project.address);
    await page.click('[data-testid="project-save"]');
    
    await expect(page.locator('[data-testid="block-project-status"]')).toHaveText('complete');

    // Fill Services Block
    await page.click('[data-testid="block-services-edit"]');
    
    for (const service of testEstimate.services) {
      await page.click('[data-testid="add-service-item"]');
      await page.fill('[data-testid="service-name"]:last-of-type', service.name);
      await page.fill('[data-testid="service-quantity"]:last-of-type', service.quantity.toString());
      await page.fill('[data-testid="service-unit"]:last-of-type', service.unit);
      await page.fill('[data-testid="service-rate"]:last-of-type', service.rate.toString());
    }
    
    await page.click('[data-testid="services-save"]');
    await expect(page.locator('[data-testid="block-services-status"]')).toHaveText('complete');

    // Fill Costing Block
    await page.click('[data-testid="block-costing-edit"]');
    await page.fill('[data-testid="overhead-percentage"]', '15');
    await page.fill('[data-testid="profit-target"]', '20');
    await page.click('[data-testid="costing-save"]');
    
    await expect(page.locator('[data-testid="block-costing-status"]')).toHaveText('complete');

    // Verify totals are calculated
    const expectedSubtotal = testEstimate.services.reduce((sum, service) => 
      sum + (service.quantity * service.rate), 0
    );
    
    await expect(page.locator('[data-testid="estimate-subtotal"]'))
      .toContainText(expectedSubtotal.toLocaleString());

    // Save estimate
    await page.click('[data-testid="save-estimate"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Estimate saved successfully');
    
    // Verify estimate number is generated
    await expect(page.locator('[data-testid="estimate-number"]'))
      .toHaveText(/EST-\d{4}-\d{5}/);
  });

  test('should handle block validation errors gracefully', async ({ page }) => {
    await page.goto('/estimates/new');

    // Try to save services with invalid data
    await page.click('[data-testid="block-services-edit"]');
    await page.click('[data-testid="add-service-item"]');
    await page.fill('[data-testid="service-name"]:last-of-type', 'Test Service');
    await page.fill('[data-testid="service-quantity"]:last-of-type', '-5'); // Invalid negative quantity
    await page.fill('[data-testid="service-rate"]:last-of-type', '100');
    
    await page.click('[data-testid="services-save"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]'))
      .toContainText('Quantity must be positive');
    
    // Block should remain in_progress status
    await expect(page.locator('[data-testid="block-services-status"]')).toHaveText('in_progress');
  });

  test('should update totals in real-time when changing values', async ({ page }) => {
    await page.goto('/estimates/new');

    // Add a service
    await page.click('[data-testid="block-services-edit"]');
    await page.click('[data-testid="add-service-item"]');
    await page.fill('[data-testid="service-name"]:last-of-type', 'Test Service');
    await page.fill('[data-testid="service-quantity"]:last-of-type', '10');
    await page.fill('[data-testid="service-rate"]:last-of-type', '100');
    
    // Check initial total
    await expect(page.locator('[data-testid="line-total"]:last-of-type')).toHaveText('$1,000.00');
    
    // Change quantity
    await page.fill('[data-testid="service-quantity"]:last-of-type', '20');
    
    // Total should update immediately
    await expect(page.locator('[data-testid="line-total"]:last-of-type')).toHaveText('$2,000.00');
    
    // Check estimate subtotal updates
    await expect(page.locator('[data-testid="estimate-subtotal"]')).toHaveText('$2,000.00');
  });

  test('should support estimate templates', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Open templates dialog
    await page.click('[data-testid="use-template-button"]');
    await expect(page.locator('[data-testid="templates-dialog"]')).toBeVisible();
    
    // Select a template
    await page.click('[data-testid="template-web-app-basic"]');
    await page.click('[data-testid="apply-template"]');
    
    // Verify template data is loaded
    await expect(page.locator('[data-testid="block-services-status"]')).toHaveText('complete');
    await expect(page.locator('[data-testid="service-item"]')).toHaveCount(5); // Template has 5 services
    
    // Verify totals are calculated from template
    await expect(page.locator('[data-testid="estimate-subtotal"]')).not.toHaveText('$0.00');
  });

  test('should handle status transitions correctly', async ({ page }) => {
    // Create and complete an estimate first
    await createCompleteEstimate(page);
    
    // Try to transition to internal review
    await page.click('[data-testid="change-status-button"]');
    await page.click('[data-testid="status-internal-review"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="status-change-confirmation"]')).toBeVisible();
    await page.click('[data-testid="confirm-status-change"]');
    
    // Status should update
    await expect(page.locator('[data-testid="estimate-status"]')).toHaveText('Internal Review');
    
    // Try invalid transition (back to draft)
    await page.click('[data-testid="change-status-button"]');
    await expect(page.locator('[data-testid="status-draft"]')).toBeDisabled();
  });

  test('should support collaborative editing', async ({ page, context }) => {
    // Create a new estimate
    await page.goto('/estimates/new');
    const estimateId = await createBasicEstimate(page);
    
    // Open same estimate in another tab (simulating another user)
    const page2 = await context.newPage();
    await page2.goto(`/estimates/${estimateId}`);
    
    // Edit counterparty in first tab
    await page.click('[data-testid="block-counterparty-edit"]');
    await page.fill('[data-testid="counterparty-name"]', 'Updated Company Name');
    await page.click('[data-testid="counterparty-save"]');
    
    // Second tab should show update notification
    await expect(page2.locator('[data-testid="real-time-update-notification"]'))
      .toContainText('Estimate was updated by another user');
    
    // Second tab should show updated data after refresh
    await page2.reload();
    await expect(page2.locator('[data-testid="counterparty-name"]'))
      .toHaveValue('Updated Company Name');
  });

  test('should persist draft changes automatically', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Start filling out estimate
    await page.click('[data-testid="block-counterparty-edit"]');
    await page.fill('[data-testid="counterparty-name"]', 'Draft Company');
    
    // Navigate away without saving
    await page.goto('/dashboard');
    
    // Come back to estimates
    await page.goto('/estimates/new');
    
    // Should restore draft data
    await expect(page.locator('[data-testid="draft-restored-notification"]'))
      .toContainText('Draft estimate restored');
    
    await page.click('[data-testid="block-counterparty-edit"]');
    await expect(page.locator('[data-testid="counterparty-name"]'))
      .toHaveValue('Draft Company');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Simulate network failure
    await page.route('**/api/estimates', route => route.abort());
    
    // Try to save estimate
    await createBasicEstimate(page);
    await page.click('[data-testid="save-estimate"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Failed to save estimate. Please try again.');
    
    // Should offer retry option
    await expect(page.locator('[data-testid="retry-save-button"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Tab through blocks
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="block-counterparty"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="block-project"]')).toBeFocused();
    
    // Enter key should open block for editing
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="project-edit-dialog"]')).toBeVisible();
    
    // Escape should close dialog
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="project-edit-dialog"]')).not.toBeVisible();
  });

  test('should maintain data consistency across page refreshes', async ({ page }) => {
    await page.goto('/estimates/new');
    
    // Fill some data
    const testData = await createBasicEstimate(page);
    
    // Refresh page
    await page.reload();
    
    // Data should persist
    await page.click('[data-testid="block-counterparty-edit"]');
    await expect(page.locator('[data-testid="counterparty-name"]'))
      .toHaveValue(testData.counterpartyName);
  });
});

// Helper functions
async function createCompleteEstimate(page: Page) {
  await page.goto('/estimates/new');
  
  // Fill all required blocks
  await fillCounterpartyBlock(page);
  await fillProjectBlock(page);
  await fillServicesBlock(page);
  await fillCostingBlock(page);
  
  await page.click('[data-testid="save-estimate"]');
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
}

async function createBasicEstimate(page: Page) {
  const testData = {
    counterpartyName: 'Test Company ' + Date.now(),
    projectName: 'Test Project ' + Date.now()
  };
  
  await fillCounterpartyBlock(page, testData.counterpartyName);
  await fillProjectBlock(page, testData.projectName);
  
  return testData;
}

async function fillCounterpartyBlock(page: Page, name?: string) {
  await page.click('[data-testid="block-counterparty-edit"]');
  await page.fill('[data-testid="counterparty-name"]', name || 'Test Company');
  await page.fill('[data-testid="counterparty-email"]', 'test@company.com');
  await page.click('[data-testid="counterparty-save"]');
}

async function fillProjectBlock(page: Page, name?: string) {
  await page.click('[data-testid="block-project-edit"]');
  await page.fill('[data-testid="project-name"]', name || 'Test Project');
  await page.fill('[data-testid="project-address"]', '123 Test St');
  await page.click('[data-testid="project-save"]');
}

async function fillServicesBlock(page: Page) {
  await page.click('[data-testid="block-services-edit"]');
  await page.click('[data-testid="add-service-item"]');
  await page.fill('[data-testid="service-name"]:last-of-type', 'Test Service');
  await page.fill('[data-testid="service-quantity"]:last-of-type', '10');
  await page.fill('[data-testid="service-rate"]:last-of-type', '100');
  await page.click('[data-testid="services-save"]');
}

async function fillCostingBlock(page: Page) {
  await page.click('[data-testid="block-costing-edit"]');
  await page.fill('[data-testid="overhead-percentage"]', '15');
  await page.click('[data-testid="costing-save"]');
}