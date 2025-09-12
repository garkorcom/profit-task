// Simple fixtures for testing - avoiding complex JSX to prevent compilation errors

import { StartabilityReport, ItemStartabilityV2 } from '../../types/startability.types';

export const mockV2StartabilityResponse: StartabilityReport = {
  projectId: 'test-project',
  isProjectStartable: false,
  itemsStartability: {
    'service-1': {
      itemId: 'service-1',
      summaryStatus: 'BLOCKED' as const,
      blockers: [{
        code: 'MISSING_ASSIGNMENT',
        severity: 'CRITICAL' as const,
        category: 'Task',
        description: 'Исполнитель не назначен',
        resolutionAction: {
          type: 'ASSIGN_USER',
          label: 'Назначить исполнителя',
          contextData: {
            targetUserId: null,
            availableUsers: []
          }
        }
      }]
    },
    'service-2': {
      itemId: 'service-2', 
      summaryStatus: 'WARNING' as const,
      blockers: [{
        code: 'BUDGET_OR_APPROVAL_REQUIRED',
        severity: 'WARNING' as const,
        category: 'Business',
        description: 'Требуется подтверждение бюджета',
        resolutionAction: {
          type: 'REQUEST_APPROVAL',
          label: 'Запросить подтверждение',
          contextData: {
            approverIds: [],
            approvalType: 'budget'
          }
        }
      }]
    },
    'service-3': {
      itemId: 'service-3',
      summaryStatus: 'READY' as const,
      blockers: []
    }
  }
};

export function createMockEstimate() {
  return { 
    id: 'test-estimate',
    name: 'Test Estimate',
    projectId: 'test-project'
  };
}

export function createMockProject() {
  return { 
    id: 'test-project',
    name: 'Test Project',
    status: 'active' as const
  };
}

export function createMockStartabilitySnapshot() {
  return { 
    projectId: 'test-project',
    overall: 'blocked' as const,
    stats: {
      startableItemCount: 1,
      criticalCount: 1, 
      warningCount: 1,
      infoCount: 0
    },
    reasons: []
  };
}

// Simple wrapper component to avoid JSX compilation issues
export const TestWrapper = ({ children }: { children: React.ReactNode }) => children;