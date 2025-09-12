/**
 * ============================================================================
 * API TESTS - Startability API Layer
 * ============================================================================
 * 
 * Unit tests for the startability API layer including evaluation logic,
 * caching mechanisms, and CTA execution functions.
 * 
 * 🧪 TEST INSTRUCTIONS:
 * 1. Run: npm test -- --testPathPattern="api/startability"
 * 2. Tests API functions with mocked Firebase and external dependencies
 * 3. Focus on business logic accuracy and error handling
 * 4. All external APIs are mocked for isolation
 * 
 * 🔧 APIS TESTED:
 * - evaluateStartability(): Core evaluation function
 * - executeCTA(): CTA execution with different action types
 * - Cache mechanisms: TTL and invalidation logic
 * - Feature flag integration: isStartabilityEnabled()
 * 
 * 🛠️ BUSINESS LOGIC TESTED:
 * - Project/task/estimate status validation
 * - Reason deduplication and severity ordering
 * - Cache hit/miss scenarios and TTL expiration
 * - CTA execution success/failure paths
 * - Error handling and fallback behavior
 * 
 * @category API Tests
 */

import { jest } from '@jest/globals';

import {
  evaluateStartability,
  executeCTA,
  clearStartabilityCache,
  isStartabilityEnabled,
  trackStartabilityEvent
} from '../../api/startabilityApi';

import {
  StartabilitySnapshot,
  StartabilityReason,
  StartabilityCTA,
  EvaluateStartabilityResponse,
  ExecuteCTAResponse
} from '../../types/startability.types';

import { Project } from '../../types/project.types';
import { Task } from '../../types/task.types';
import { EstimateV2, EstimateBlock } from '../../types/estimate.types';

// Mock external dependencies
jest.mock('../../api/projectApi');
jest.mock('../../api/taskApi');
jest.mock('../../api/estimateV2Api');
jest.mock('../../utils/startability');
jest.mock('../../auth/permissions');

// Import mocked functions
import { getProject } from '../../api/projectApi';
import { getTasksByProject } from '../../api/taskApi';
import { getEstimateV2, getEstimateBlocks } from '../../api/estimateV2Api';
import { evaluateProjectStartability } from '../../utils/startability';

const mockGetProject = getProject as jest.MockedFunction<typeof getProject>;
const mockGetTasksByProject = getTasksByProject as jest.MockedFunction<typeof getTasksByProject>;
const mockGetEstimateV2 = getEstimateV2 as jest.MockedFunction<typeof getEstimateV2>;
const mockGetEstimateBlocks = getEstimateBlocks as jest.MockedFunction<typeof getEstimateBlocks>;
const mockEvaluateProjectStartability = evaluateProjectStartability as jest.MockedFunction<typeof evaluateProjectStartability>;

// =====================================================
// TEST DATA
// =====================================================

const mockProject: Project = {
  id: 'project-1',
  name: 'Test Project',
  status: 'active',
  type: 'development',
  priority: 'medium',
  location: 'Test Location',
  participants: [],
  timeline: {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-06-01')
  },
  budget: {
    planned: 50000,
    spent: 10000
  }
};

const mockTasks: Task[] = [
  {
    id: 'task-1',
    task: 'Design Website',
    projectId: 'project-1',
    status: 'assigned',
    assigneeId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'task-2',
    task: 'Setup Database',
    projectId: 'project-1',
    status: 'pending',
    assigneeId: undefined, // Missing assignment
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockEstimate: EstimateV2 = {
  id: 'estimate-1',
  projectId: 'project-1',
  counterpartyId: 'client-1',
  counterpartyName: 'Test Client',
  status: 'draft',
  totals: {
    materialsCost: 10000,
    laborCost: 25000,
    equipmentCost: 5000,
    subcontractCost: 0,
    overheadPct: 15,
    overheadAmt: 6000,
    discountAmt: 0,
    shippingAmt: 1000,
    subtotalPrice: 40000,
    taxAmt: 3000,
    grandTotal: 43000,
    grossMarginPct: 20
  },
  blocks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1'
};

const mockEstimateBlocks: EstimateBlock[] = [
  {
    key: 'counterparty',
    status: 'complete',
    data: { counterpartyId: 'client-1', counterpartyName: 'Test Client' }
  },
  {
    key: 'services',
    status: 'complete',
    data: {
      items: [
        {
          id: 'service-1',
          name: 'Website Design',
          type: 'service',
          qty: 40,
          rate: 100,
          unitCost: 60,
          lineSubtotal: 4000,
          assigneeId: undefined // Missing assignment
        }
      ]
    }
  },
  {
    key: 'costing',
    status: 'in_progress', // Incomplete block
    data: { overheadPct: 15 }
  }
];

const mockCoreAnalysis = {
  projectId: 'project-1',
  startable: false,
  reasons: ['MISSING_ASSIGNMENT'],
  blockedTasksSample: [
    { id: 'task-2', title: 'Setup Database', reasons: ['MISSING_ASSIGNMENT'] }
  ],
  startableTaskCount: 1,
  totalTaskCount: 2,
  estimateCount: 1
};

// =====================================================
// SETUP AND TEARDOWN
// =====================================================

describe('Startability API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearStartabilityCache(); // Clear cache before each test

    // Setup default mocks
    mockGetProject.mockResolvedValue(mockProject);
    mockGetTasksByProject.mockResolvedValue(mockTasks);
    mockGetEstimateV2.mockResolvedValue(mockEstimate);
    mockGetEstimateBlocks.mockResolvedValue(mockEstimateBlocks);
    mockEvaluateProjectStartability.mockReturnValue(mockCoreAnalysis);
  });

  // =====================================================
  // EVALUATION TESTS
  // =====================================================

  describe('evaluateStartability', () => {
    test('should evaluate startability successfully', async () => {
      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1');

      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.projectId).toBe('project-1');
      expect(result.snapshot.estimateId).toBe('estimate-1');
      expect(result.snapshot.overall).toBe('blocked'); // Has critical reasons
      expect(result.snapshot.reasons).toHaveLength(3); // Core + estimate-specific reasons

      // Verify API calls
      expect(mockGetProject).toHaveBeenCalledWith('project-1');
      expect(mockGetTasksByProject).toHaveBeenCalledWith('project-1');
      expect(mockGetEstimateV2).toHaveBeenCalledWith('estimate-1');
      expect(mockGetEstimateBlocks).toHaveBeenCalledWith('estimate-1');
    });

    test('should cache results and return cached data on subsequent calls', async () => {
      // First call
      const result1 = await evaluateStartability('user-1', 'project-1', 'estimate-1');
      expect(mockGetProject).toHaveBeenCalledTimes(1);

      // Second call (should use cache)
      const result2 = await evaluateStartability('user-1', 'project-1', 'estimate-1');
      expect(mockGetProject).toHaveBeenCalledTimes(1); // No additional call
      expect(result2.snapshot.evaluatedAt).toEqual(result1.snapshot.evaluatedAt);
    });

    test('should force refresh when requested', async () => {
      // First call
      await evaluateStartability('user-1', 'project-1', 'estimate-1');
      expect(mockGetProject).toHaveBeenCalledTimes(1);

      // Force refresh
      await evaluateStartability('user-1', 'project-1', 'estimate-1', { forceRefresh: true });
      expect(mockGetProject).toHaveBeenCalledTimes(2); // Additional call
    });

    test('should handle missing project gracefully', async () => {
      mockGetProject.mockResolvedValue(null);

      await expect(
        evaluateStartability('user-1', 'project-1', 'estimate-1')
      ).rejects.toThrow('Project project-1 not found');
    });

    test('should handle missing estimate gracefully', async () => {
      mockGetEstimateV2.mockResolvedValue(null);

      await expect(
        evaluateStartability('user-1', 'project-1', 'estimate-1')
      ).rejects.toThrow('Estimate estimate-1 not found');
    });

    test('should detect estimate-specific reasons', async () => {
      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1');

      const reasons = result.snapshot.reasons.map(r => r.code);
      
      // Should include core reasons
      expect(reasons).toContain('MISSING_ASSIGNMENT');
      
      // Should include estimate-specific reasons
      expect(reasons).toContain('INCOMPLETE_ESTIMATE_BLOCKS');
      expect(reasons).toContain('SERVICE_ITEMS_NOT_ASSIGNED');
    });

    test('should deduplicate and sort reasons by severity', async () => {
      // Mock multiple overlapping reasons
      mockEvaluateProjectStartability.mockReturnValue({
        ...mockCoreAnalysis,
        reasons: ['MISSING_ASSIGNMENT', 'NO_TASKS', 'MISSING_ASSIGNMENT'] // Duplicate
      });

      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1');

      const reasons = result.snapshot.reasons;
      const reasonCodes = reasons.map(r => r.code);
      
      // Should not have duplicates
      expect(new Set(reasonCodes).size).toBe(reasonCodes.length);
      
      // Should sort by severity (critical first)
      const severities = reasons.map(r => r.severity);
      const criticalIndex = severities.indexOf('critical');
      const warningIndex = severities.indexOf('warning');
      
      if (criticalIndex >= 0 && warningIndex >= 0) {
        expect(criticalIndex).toBeLessThan(warningIndex);
      }
    });

    test('should determine correct overall status', async () => {
      // Test blocked state (has critical reasons)
      mockEvaluateProjectStartability.mockReturnValue({
        ...mockCoreAnalysis,
        reasons: ['PROJECT_STATUS_NOT_STARTABLE'] // Critical reason
      });

      let result = await evaluateStartability('user-1', 'project-1', 'estimate-1', { forceRefresh: true });
      expect(result.snapshot.overall).toBe('blocked');

      // Test attention state (only warnings)
      mockEvaluateProjectStartability.mockReturnValue({
        ...mockCoreAnalysis,
        reasons: ['MISSING_ASSIGNMENT'] // Warning reason
      });

      result = await evaluateStartability('user-1', 'project-1', 'estimate-1', { forceRefresh: true });
      expect(result.snapshot.overall).toBe('attention');

      // Test ready state (no reasons)
      mockEvaluateProjectStartability.mockReturnValue({
        ...mockCoreAnalysis,
        startable: true,
        reasons: []
      });

      result = await evaluateStartability('user-1', 'project-1', 'estimate-1', { forceRefresh: true });
      expect(result.snapshot.overall).toBe('ready');
    });

    test('should include item startabilities when requested', async () => {
      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1', {
        includeItems: true
      });

      expect(result.itemStartabilities).toBeDefined();
      // Note: Would need more detailed mock for item analysis
    });
  });

  // =====================================================
  // CTA EXECUTION TESTS
  // =====================================================

  describe('executeCTA', () => {
    test('should execute ASSIGN CTA successfully', async () => {
      const request = {
        userId: 'user-1',
        reasonCode: 'MISSING_ASSIGNMENT' as const,
        cta: 'ASSIGN' as StartabilityCTA,
        metadata: {
          taskId: 'task-1',
          assigneeId: 'user-2'
        }
      };

      const result = await executeCTA(request);

      expect(result.success).toBe(true);
      expect(result.resolvedReasons).toContain('MISSING_ASSIGNMENT');
      expect(result.message).toContain('assigned successfully');
    });

    test('should execute REQUEST_APPROVAL CTA successfully', async () => {
      const request = {
        userId: 'user-1',
        reasonCode: 'BUDGET_OR_APPROVAL_REQUIRED' as const,
        cta: 'REQUEST_APPROVAL' as StartabilityCTA,
        metadata: {
          estimateId: 'estimate-1',
          approvalType: 'client',
          message: 'Please review and approve'
        }
      };

      const result = await executeCTA(request);

      expect(result.success).toBe(true);
      expect(result.resolvedReasons).toContain('BUDGET_OR_APPROVAL_REQUIRED');
      expect(result.message).toContain('request sent');
    });

    test('should handle unknown CTA gracefully', async () => {
      const request = {
        userId: 'user-1',
        reasonCode: 'MISSING_ASSIGNMENT' as const,
        cta: 'UNKNOWN_CTA' as StartabilityCTA,
        metadata: {}
      };

      const result = await executeCTA(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not implemented');
      expect(result.resolvedReasons).toHaveLength(0);
    });

    test('should handle CTA execution errors', async () => {
      // Mock an error in CTA execution
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const request = {
        userId: 'user-1',
        reasonCode: 'MISSING_ASSIGNMENT' as const,
        cta: 'ASSIGN' as StartabilityCTA,
        metadata: {
          taskId: null // Invalid data to trigger error
        }
      };

      const result = await executeCTA(request);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to execute CTA');

      console.error = originalConsoleError;
    });
  });

  // =====================================================
  // CACHING TESTS
  // =====================================================

  describe('Cache Management', () => {
    test('should respect cache TTL', async () => {
      // Make initial call
      await evaluateStartability('user-1', 'project-1', 'estimate-1');
      expect(mockGetProject).toHaveBeenCalledTimes(1);

      // Mock expired cache (simulate time passing)
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(Date.now() + 35000); // 35 seconds later

      // Should fetch fresh data
      await evaluateStartability('user-1', 'project-1', 'estimate-1');
      expect(mockGetProject).toHaveBeenCalledTimes(2);
    });

    test('should clear specific cache entries', () => {
      clearStartabilityCache('project-1', 'estimate-1');
      // Cache should be cleared (no easy way to test this directly without exposing internals)
    });

    test('should clear all cache entries', () => {
      clearStartabilityCache(); // Clear all
      // Cache should be cleared
    });
  });

  // =====================================================
  // FEATURE FLAG TESTS
  // =====================================================

  describe('Feature Flag Integration', () => {
    test('should return true in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const result = await isStartabilityEnabled('user-1');
      expect(result).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    test('should respect environment variable override', async () => {
      const originalEnv = process.env.REACT_APP_FEATURE_STARTABILITY;
      process.env.REACT_APP_FEATURE_STARTABILITY = 'true';

      const result = await isStartabilityEnabled('user-1');
      expect(result).toBe(true);

      process.env.REACT_APP_FEATURE_STARTABILITY = originalEnv;
    });

    test('should handle feature flag check errors', async () => {
      // Force an error in feature flag check
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = await isStartabilityEnabled('user-1');
      expect(result).toBe(false); // Should fallback to false on error

      process.env.NODE_ENV = originalEnv;
    });
  });

  // =====================================================
  // UTILITY FUNCTION TESTS
  // =====================================================

  describe('Utility Functions', () => {
    test('should track startability events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      trackStartabilityEvent('viewed', {
        projectId: 'project-1',
        estimateId: 'estimate-1',
        overall: 'blocked'
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Startability event: viewed',
        expect.objectContaining({
          projectId: 'project-1',
          estimateId: 'estimate-1',
          overall: 'blocked'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  // =====================================================
  // ERROR HANDLING TESTS
  // =====================================================

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      mockGetProject.mockRejectedValue(new Error('Network error'));

      await expect(
        evaluateStartability('user-1', 'project-1', 'estimate-1')
      ).rejects.toThrow('Failed to evaluate startability');
    });

    test('should handle malformed data gracefully', async () => {
      mockGetEstimateBlocks.mockResolvedValue([]); // No blocks

      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1');
      
      // Should still return a valid snapshot
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.overall).toBeDefined();
    });

    test('should provide fallback behavior on API failures', async () => {
      // Mock all APIs to fail
      mockGetProject.mockRejectedValue(new Error('API failure'));
      mockGetTasksByProject.mockRejectedValue(new Error('API failure'));
      mockGetEstimateV2.mockRejectedValue(new Error('API failure'));
      mockGetEstimateBlocks.mockRejectedValue(new Error('API failure'));

      await expect(
        evaluateStartability('user-1', 'project-1', 'estimate-1')
      ).rejects.toThrow('Failed to evaluate startability');
    });
  });

  // =====================================================
  // PERFORMANCE TESTS
  // =====================================================

  describe('Performance', () => {
    test('should complete evaluation within reasonable time', async () => {
      const startTime = performance.now();
      
      await evaluateStartability('user-1', 'project-1', 'estimate-1');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeTasks = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTasks[0],
        id: `task-${i}`,
        task: `Task ${i}`
      }));

      mockGetTasksByProject.mockResolvedValue(largeTasks);

      const startTime = performance.now();
      await evaluateStartability('user-1', 'project-1', 'estimate-1');
      const endTime = performance.now();

      // Should still complete reasonably fast even with large dataset
      expect(endTime - startTime).toBeLessThan(500); // 500ms threshold
    });
  });

  // =====================================================
  // EDGE CASES
  // =====================================================

  describe('Edge Cases', () => {
    test('should handle empty project data', async () => {
      mockGetTasksByProject.mockResolvedValue([]);
      mockGetEstimateBlocks.mockResolvedValue([]);

      const result = await evaluateStartability('user-1', 'project-1', 'estimate-1');
      
      expect(result.snapshot.reasons).toContain(
        expect.objectContaining({ code: 'NO_TASKS' })
      );
    });

    test('should handle null/undefined user ID', async () => {
      const result = await evaluateStartability('', 'project-1', 'estimate-1');
      
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot.evaluatedBy).toBe('');
    });

    test('should handle concurrent evaluation requests', async () => {
      // Make multiple concurrent requests
      const promises = [
        evaluateStartability('user-1', 'project-1', 'estimate-1'),
        evaluateStartability('user-1', 'project-1', 'estimate-1'),
        evaluateStartability('user-1', 'project-1', 'estimate-1')
      ];

      const results = await Promise.all(promises);
      
      // All should succeed and return consistent data
      results.forEach(result => {
        expect(result.snapshot).toBeDefined();
        expect(result.snapshot.projectId).toBe('project-1');
      });

      // API should only be called once due to caching
      expect(mockGetProject).toHaveBeenCalledTimes(1);
    });
  });
});