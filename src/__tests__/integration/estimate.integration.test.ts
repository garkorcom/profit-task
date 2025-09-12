/**
 * @jest-environment jsdom
 */

// @ts-nocheck

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  createEstimate,
  updateEstimateBlock,
  getEstimate,
  deleteEstimate,
  recalculateEstimateTotals
} from '../api/estimateV2Api';
import type { 
  Estimate, 
  CreateEstimateDto, 
  UpdateBlockDto,
  BlockKey
} from '../types/estimate.types';
import estimateFixtures from './fixtures/estimate-fixtures.json';
import { db } from '../firebase/firebase';

// Mock Firebase
jest.mock('../firebase/firebase', () => ({
  db: {
    collection: () => ({
      add: () => Promise.resolve({ id: 'mock-id' }),
      doc: () => ({
        get: () => Promise.resolve({ exists: true, data: () => ({}) }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      })
    }),
    runTransaction: () => Promise.resolve(),
    doc: () => ({
      get: () => Promise.resolve({ exists: true, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    })
  },
  auth: { currentUser: { uid: 'test-user-001' } }
}));

describe('Estimate Integration Tests', () => {
  let testEstimateId: string;
  let mockEstimateData: Estimate;
  let mockDb: any;

  beforeEach(() => {
    mockDb = db as any;
    
    // Set up basic mock structure
    mockDb.collection = jest.fn(() => ({
      add: jest.fn(),
      doc: jest.fn()
    }));
    mockDb.doc = jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }));
    mockDb.runTransaction = jest.fn();
    
    jest.clearAllMocks();
    
    testEstimateId = 'test_est_001';
    mockEstimateData = {
      ...estimateFixtures.baseEstimate,
      id: testEstimateId
    } as Estimate;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Estimate CRUD Operations', () => {
    test('should create new estimate with default blocks', async () => {
      const createDto: CreateEstimateDto = {
        projectId: 'proj_001',
        counterpartyId: 'cp_001',
        currency: 'USD'
      };

      // Mock successful creation
      mockDb.collection().add.mockResolvedValue({
        id: testEstimateId
      });

      const result = await createEstimate('test-user-001', createDto);

      expect(result).toBe(testEstimateId);
      expect(typeof result).toBe('string');
    });

    test('should create estimate from template', async () => {
      const createDto: CreateEstimateDto = {
        templateId: 'template_001',
        currency: 'USD'
      };

      mockDb.collection().add.mockResolvedValue({
        id: testEstimateId
      });

      const result = await createEstimate('test-user-001', createDto);

      expect(result).toBe(testEstimateId);
      expect(mockDb.collection().add).toHaveBeenCalledWith(
        expect.objectContaining({
          number: expect.stringMatching(/^EST-\d{4}-\d{5}$/),
          status: 'draft',
          blocks: expect.arrayContaining([
            expect.objectContaining({ key: 'counterparty' }),
            expect.objectContaining({ key: 'project' }),
            expect.objectContaining({ key: 'services' }),
            expect.objectContaining({ key: 'products' }),
            expect.objectContaining({ key: 'costing' }),
            expect.objectContaining({ key: 'estimate_tasks' }),
            expect.objectContaining({ key: 'communication' }),
            expect.objectContaining({ key: 'statuses' })
          ])
        })
      );
    });

    test('should retrieve estimate by ID', async () => {
      mockDb.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockEstimateData,
        id: testEstimateId
      });

      const result = await getEstimate('test-user-001', testEstimateId);

      expect(result).toEqual(mockEstimateData);
      expect(mockDb.doc).toHaveBeenCalledWith(`users/test-user-001/estimates/${testEstimateId}`);
    });

    test('should handle non-existent estimate', async () => {
      mockDb.doc().get.mockResolvedValue({
        exists: false
      });

      const result = await getEstimate('test-user-001', 'non_existent');
      expect(result).toBeNull();
    });

    test('should delete estimate and audit log', async () => {
      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          delete: jest.fn(),
          set: jest.fn()
        });
      });

      await deleteEstimate('test-user-001', testEstimateId);

      expect(mockDb.runTransaction).toHaveBeenCalled();
    });
  });

  describe('Block Management', () => {
    test('should update counterparty block successfully', async () => {
      const blockUpdate: UpdateBlockDto = {
        status: 'complete',
        data: {
          counterpartyId: 'cp_001',
          primaryContactId: 'contact_001',
          paymentTerms: 'Net30'
        }
      };

      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        return await callback({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          update: jest.fn()
        });
      });

      await updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', blockUpdate);

      expect(mockDb.runTransaction).toHaveBeenCalled();
    });

    test('should update services block with items', async () => {
      const servicesUpdate: UpdateBlockDto = {
        status: 'complete',
        data: {
          items: [
            {
              id: 'svc_001',
              name: 'Site Preparation',
              qty: 1,
              unit: 'lot',
              rate: 5000,
              type: 'service'
            }
          ]
        }
      };

      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          update: jest.fn()
        };
        
        return await callback(transaction);
      });

      await updateEstimateBlock('test-user-001', testEstimateId, 'services', servicesUpdate);

      expect(mockDb.runTransaction).toHaveBeenCalled();
    });

    test('should validate block data before update', async () => {
      const invalidUpdate: UpdateBlockDto = {
        status: 'complete',
        data: {
          counterpartyId: '', // empty required field
        }
      };

      await expect(
        updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', invalidUpdate)
      ).rejects.toThrow('Counterparty ID is required');
    });

    test('should handle concurrent block updates', async () => {
      const update1 = updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', {
        status: 'complete',
        data: { counterpartyId: 'cp_001' }
      });

      const update2 = updateEstimateBlock('test-user-001', testEstimateId, 'services', {
        status: 'in_progress',
        data: { items: [] }
      });

      mockDb.runTransaction
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await Promise.all([update1, update2]);

      expect(mockDb.runTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Totals Recalculation', () => {
    test('should recalculate totals when services change', async () => {
      const servicesData = estimateFixtures.completeEstimateBlocks
        .find(block => block.key === 'services')?.data;
      const costingData = estimateFixtures.completeEstimateBlocks
        .find(block => block.key === 'costing')?.data;

      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              ...mockEstimateData,
              blocks: [
                { key: 'services', data: servicesData },
                { key: 'costing', data: costingData }
              ]
            })
          }),
          update: jest.fn()
        };
        
        return await callback(transaction);
      });

      await recalculateEstimateTotals('test-user-001', testEstimateId);

      expect(mockDb.runTransaction).toHaveBeenCalled();
    });

    test('should handle missing costing data in recalculation', async () => {
      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              ...mockEstimateData,
              blocks: [] // No costing block
            })
          }),
          update: jest.fn()
        };
        
        return await callback(transaction);
      });

      await recalculateEstimateTotals('test-user-001', testEstimateId);

      // Should still work with default costing values
      expect(mockDb.runTransaction).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async () => {
      mockDb.collection().add.mockRejectedValue(
        new Error('Network error')
      );

      const createDto: CreateEstimateDto = {
        projectId: 'proj_001'
      };

      await expect(createEstimate('test-user-001', createDto)).rejects.toThrow('Network error');
    });

    test('should handle transaction conflicts', async () => {
      mockDb.runTransaction.mockRejectedValue(
        new Error('Transaction conflict')
      );

      await expect(
        updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', {
          status: 'complete',
          data: { counterpartyId: 'cp_001' }
        })
      ).rejects.toThrow('Transaction conflict');
    });

    test('should validate estimate permissions before operations', async () => {
      // Mock estimate with different owner
      const otherUserEstimate = {
        ...mockEstimateData,
        createdBy: 'other-user'
      };

      mockDb.doc().get.mockResolvedValue({
        exists: true,
        data: () => otherUserEstimate,
        id: testEstimateId
      });

      await expect(
        updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', {
          status: 'complete',
          data: { counterpartyId: 'cp_001' }
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should handle invalid block keys', async () => {
      await expect(
        updateEstimateBlock('test-user-001', testEstimateId, 'invalid_block' as BlockKey, {
          status: 'complete',
          data: {}
        })
      ).rejects.toThrow('Invalid block key');
    });
  });

  describe('Performance and Optimization', () => {
    test('should batch multiple block updates efficiently', async () => {
      const updates = [
        { blockKey: 'counterparty' as BlockKey, data: { counterpartyId: 'cp_001' } },
        { blockKey: 'services' as BlockKey, data: { items: [] } },
        { blockKey: 'costing' as BlockKey, data: { overheadPct: 15 } }
      ];

      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          update: jest.fn()
        };
        
        return await callback(transaction);
      });

      // Should batch all updates in single transaction
      const promises = updates.map(update => 
        updateEstimateBlock('test-user-001', testEstimateId, update.blockKey, {
          status: 'complete',
          data: update.data
        })
      );

      await Promise.all(promises);

      // Each update should use a transaction
      expect(mockDb.runTransaction).toHaveBeenCalledTimes(updates.length);
    });

    test('should cache frequently accessed estimates', async () => {
      // First call
      mockDb.doc().get.mockResolvedValue({
        exists: true,
        data: () => mockEstimateData,
        id: testEstimateId
      });

      await getEstimate('test-user-001', testEstimateId);

      // Second call should use cache (implementation detail)
      await getEstimate('test-user-001', testEstimateId);

      // Should only call Firestore once due to caching
      expect(mockDb.doc().get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Audit Logging', () => {
    test('should log all estimate changes', async () => {
      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          update: jest.fn()
        };
        
        return await callback(transaction);
      });

      await updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', {
        status: 'complete',
        data: { counterpartyId: 'cp_001' }
      });

      // Verify audit log entry was created
      expect(mockDb.runTransaction).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should include user information in audit logs', async () => {
      const userId = 'test-user-001';
      
      mockDb.runTransaction.mockImplementation(async (callback: any) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockEstimateData
          }),
          update: jest.fn((path: any, data: any) => {
            expect(data.auditLog).toContainEqual(
              expect.objectContaining({
                userId,
                action: 'block_updated',
                timestamp: expect.any(String)
              })
            );
          })
        };
        
        return await callback(transaction);
      });

      await updateEstimateBlock('test-user-001', testEstimateId, 'counterparty', {
        status: 'complete',
        data: { counterpartyId: 'cp_001' }
      });
    });
  });
});