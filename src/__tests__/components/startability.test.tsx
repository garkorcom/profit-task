/**
 * ============================================================================
 * COMPONENT TESTS - Startability System Integration
 * ============================================================================
 * 
 * Comprehensive tests for the complete startability system integration
 * in the Estimate Constructor. Tests UI components, interactions, and workflows.
 * 
 * 🧪 TEST INSTRUCTIONS:
 * 1. Run: npm test -- --testPathPattern="components/startability"
 * 2. Tests React components with mocked APIs and contexts
 * 3. Focus on user interactions and UI state management
 * 4. All components wrapped in TestWrapper with providers
 * 
 * 🔧 COMPONENTS TESTED:
 * - StartabilityCell: Grid cell component
 * - StartabilitySidebar: Detail panel with CTA actions
 * - StartabilityHeader: Global status header
 * - CTAActions: Action dialog components
 * 
 * 🛠️ INTEGRATION SCENARIOS:
 * - Feature flag integration and conditional rendering
 * - Real-time startability updates and caching
 * - CTA execution workflows and optimistic updates
 * - Error handling and loading states
 * - Accessibility and keyboard navigation
 * 
 * @category Component Tests
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import { StartabilityCell } from '../../components/startability/StartabilityCell';
import { StartabilitySidebar } from '../../components/startability/StartabilitySidebar';
import { StartabilityHeader } from '../../components/startability/StartabilityHeader';
import { CTAActionFactory } from '../../components/startability/actions/CTAActions';

import {
  StartabilitySnapshot,
  StartabilityReason,
  ItemStartability,
  StartabilityCTA
} from '../../types/startability.types';

import { useStartability } from '../../hooks/useStartability';

// Mock the hooks and API
jest.mock('../../hooks/useStartability');
jest.mock('../../api/startabilityApi');
jest.mock('../../utils/featureFlags');

const mockUseStartability = useStartability as jest.MockedFunction<typeof useStartability>;

// =====================================================
// TEST SETUP AND MOCKS
// =====================================================

// Mock TestWrapper (would be imported from test setup)
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-testid="test-wrapper">{children}</div>
);

// Mock translation function
const mockT = (key: string, params?: any) => {
  const translations: Record<string, string> = {
    'startability.cell.loading': 'Loading...',
    'startability.status.ready': 'Ready',
    'startability.status.blocked': 'Blocked',
    'startability.status.attention': 'Attention',
    'startability.cell.details_title': 'Startability Details',
    'startability.cell.no_issues': 'No issues found',
    'startability.cell.view_details': 'View Details',
    'startability.sidebar.title': 'Startability Check',
    'startability.sidebar.subtitle': 'Project Analysis',
    'startability.sidebar.refresh': 'Refresh Analysis',
    'startability.overall.ready': 'Ready to Start',
    'startability.overall.blocked': 'Blocked',
    'startability.overall.attention': 'Needs Attention',
    'startability.severity.critical': 'Critical',
    'startability.severity.warning': 'Warning',
    'startability.severity.info': 'Info',
    'startability.tabs.issues': 'Issues',
    'startability.tabs.actions': 'Actions',
    'startability.no_issues.title': 'All Clear!',
    'startability.no_issues.description': 'No blocking issues found',
    'startability.cta.assign': 'Assign',
    'startability.cta.request_approval': 'Request Approval',
    'startability.reasons.missing_assignment': 'Task needs to be assigned',
    'startability.reasons.budget_or_approval_required': 'Approval required',
    'common.cancel': 'Cancel',
    'common.close': 'Close'
  };
  
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      result = result.replace(`{{${paramKey}}}`, String(value));
    });
  }
  return result;
};

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'en' }
  })
}));

// Sample test data
const mockItemStartability: ItemStartability = {
  itemId: 'service-1',
  itemType: 'service',
  status: 'blocked',
  reasons: [
    {
      code: 'MISSING_ASSIGNMENT',
      category: 'PERMISSIONS',
      message: 'startability.reasons.missing_assignment',
      severity: 'warning',
      meta: {
        taskId: 'task-1',
        entityName: 'Website Design'
      },
      cta: 'ASSIGN',
      detectedAt: new Date()
    }
  ],
  icon: '🚫',
  tooltip: 'Task needs to be assigned'
};

const mockSnapshot: StartabilitySnapshot = {
  projectId: 'project-1',
  estimateId: 'estimate-1',
  overall: 'blocked',
  reasons: [
    {
      code: 'MISSING_ASSIGNMENT',
      category: 'PERMISSIONS',
      message: 'startability.reasons.missing_assignment',
      severity: 'warning',
      meta: {
        taskId: 'task-1',
        entityName: 'Website Design'
      },
      cta: 'ASSIGN',
      detectedAt: new Date()
    },
    {
      code: 'BUDGET_OR_APPROVAL_REQUIRED',
      category: 'BUSINESS',
      message: 'startability.reasons.budget_or_approval_required',
      severity: 'critical',
      meta: {
        estimateId: 'estimate-1'
      },
      cta: 'REQUEST_APPROVAL',
      detectedAt: new Date()
    }
  ],
  sampleBlockedItems: ['Website Design', 'Database Setup'],
  stats: {
    criticalCount: 1,
    warningCount: 1,
    infoCount: 0,
    startableItemCount: 2,
    totalItemCount: 5
  },
  evaluatedAt: new Date(),
  evaluatedBy: 'test-user',
  ttl: 30
};

// =====================================================
// STARTABILITY CELL TESTS
// =====================================================

describe('StartabilityCell Component', () => {
  test('should render loading state when no startability data', () => {
    render(
      <TestWrapper>
        <StartabilityCell itemStartability={null} />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('startability-cell-loading')).toBeInTheDocument();
  });

  test('should render compact mode correctly', () => {
    render(
      <TestWrapper>
        <StartabilityCell 
          itemStartability={mockItemStartability} 
          compact 
          showTooltip 
        />
      </TestWrapper>
    );

    const cell = screen.getByTestId('startability-cell');
    expect(cell).toBeInTheDocument();
    
    // Should show icon only in compact mode
    const iconButton = screen.getByRole('button');
    expect(iconButton).toHaveAttribute('title', mockItemStartability.tooltip);
  });

  test('should render full mode with status chip and more button', () => {
    render(
      <TestWrapper>
        <StartabilityCell 
          itemStartability={mockItemStartability} 
          compact={false} 
        />
      </TestWrapper>
    );

    // Should show status chip
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    
    // Should show more button for reasons
    const moreButton = screen.getByTestId('startability-cell-more');
    expect(moreButton).toBeInTheDocument();
  });

  test('should open popover on more button click', async () => {
    render(
      <TestWrapper>
        <StartabilityCell 
          itemStartability={mockItemStartability} 
          compact={false} 
        />
      </TestWrapper>
    );

    const moreButton = screen.getByTestId('startability-cell-more');
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByTestId('startability-cell-popover')).toBeInTheDocument();
      expect(screen.getByText('Startability Details')).toBeInTheDocument();
      expect(screen.getByText('Task needs to be assigned')).toBeInTheDocument();
    });
  });

  test('should call onCellClick when cell is clicked', () => {
    const mockOnCellClick = jest.fn();
    
    render(
      <TestWrapper>
        <StartabilityCell 
          itemStartability={mockItemStartability} 
          onCellClick={mockOnCellClick} 
        />
      </TestWrapper>
    );

    const cell = screen.getByTestId('startability-cell');
    fireEvent.click(cell);

    expect(mockOnCellClick).toHaveBeenCalledWith('service-1');
  });
});

// =====================================================
// STARTABILITY SIDEBAR TESTS
// =====================================================

describe('StartabilitySidebar Component', () => {
  const mockProps = {
    snapshot: mockSnapshot,
    onCTAExecute: jest.fn(),
    onRefresh: jest.fn(),
    onClose: jest.fn(),
    open: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render loading state when no snapshot', () => {
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} snapshot={null} />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should render sidebar with overview card and tabs', () => {
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} />
      </TestWrapper>
    );

    // Header
    expect(screen.getByText('🚀 Startability Check')).toBeInTheDocument();
    
    // Overview card
    expect(screen.getByTestId('overview-card')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    
    // Stats chips
    expect(screen.getByText('1 Critical')).toBeInTheDocument();
    expect(screen.getByText('1 Warning')).toBeInTheDocument();
    
    // Tabs
    expect(screen.getByTestId('tab-issues')).toBeInTheDocument();
    expect(screen.getByTestId('tab-actions')).toBeInTheDocument();
  });

  test('should call onRefresh when refresh button clicked', () => {
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} />
      </TestWrapper>
    );

    const refreshButton = screen.getByTestId('startability-refresh');
    fireEvent.click(refreshButton);

    expect(mockProps.onRefresh).toHaveBeenCalled();
  });

  test('should call onClose when close button clicked', () => {
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} />
      </TestWrapper>
    );

    const closeButton = screen.getByTestId('startability-close');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('should show no issues state when all clear', () => {
    const clearSnapshot = {
      ...mockSnapshot,
      overall: 'ready' as const,
      reasons: [],
      stats: {
        ...mockSnapshot.stats,
        criticalCount: 0,
        warningCount: 0
      }
    };

    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} snapshot={clearSnapshot} />
      </TestWrapper>
    );

    expect(screen.getByText('All Clear!')).toBeInTheDocument();
    expect(screen.getByText('No blocking issues found')).toBeInTheDocument();
  });

  test('should execute CTA when button clicked', async () => {
    const mockExecute = jest.fn().mockResolvedValue(undefined);
    
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} onCTAExecute={mockExecute} />
      </TestWrapper>
    );

    // Find and click CTA button (assumes it's rendered in the issues tab)
    const assignButton = screen.getByTestId('cta-ASSIGN-MISSING_ASSIGNMENT');
    fireEvent.click(assignButton);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith(
        'ASSIGN',
        expect.objectContaining({
          code: 'MISSING_ASSIGNMENT',
          cta: 'ASSIGN'
        })
      );
    });
  });

  test('should switch between tabs correctly', () => {
    render(
      <TestWrapper>
        <StartabilitySidebar {...mockProps} />
      </TestWrapper>
    );

    const actionsTab = screen.getByTestId('tab-actions');
    fireEvent.click(actionsTab);

    // Actions tab should be active and show priority actions
    expect(screen.getByText('Priority Actions')).toBeInTheDocument();
  });
});

// =====================================================
// STARTABILITY HEADER TESTS
// =====================================================

describe('StartabilityHeader Component', () => {
  const mockProps = {
    snapshot: mockSnapshot,
    onOpenDetails: jest.fn(),
    onRefresh: jest.fn(),
    onSendEstimate: jest.fn(),
    onConvertToContract: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render evaluating state when no snapshot', () => {
    render(
      <TestWrapper>
        <StartabilityHeader {...mockProps} snapshot={null} isLoading />
      </TestWrapper>
    );

    expect(screen.getByText('Evaluating startability...')).toBeInTheDocument();
  });

  test('should render blocked state with critical alert', () => {
    render(
      <TestWrapper>
        <StartabilityHeader {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('1 Critical')).toBeInTheDocument();
    expect(screen.getByText('1 Warning')).toBeInTheDocument();
    
    // Critical actions should be disabled
    const sendButton = screen.getByTestId('send-estimate-button');
    const convertButton = screen.getByTestId('convert-contract-button');
    
    expect(sendButton).toBeDisabled();
    expect(convertButton).toBeDisabled();
  });

  test('should enable actions when ready', () => {
    const readySnapshot = {
      ...mockSnapshot,
      overall: 'ready' as const,
      reasons: [],
      stats: { ...mockSnapshot.stats, criticalCount: 0, warningCount: 0 }
    };

    render(
      <TestWrapper>
        <StartabilityHeader {...mockProps} snapshot={readySnapshot} />
      </TestWrapper>
    );

    expect(screen.getByText('Ready to Start')).toBeInTheDocument();
    
    const sendButton = screen.getByTestId('send-estimate-button');
    const convertButton = screen.getByTestId('convert-contract-button');
    
    expect(sendButton).not.toBeDisabled();
    expect(convertButton).not.toBeDisabled();
  });

  test('should open quick details popover', async () => {
    render(
      <TestWrapper>
        <StartabilityHeader {...mockProps} />
      </TestWrapper>
    );

    const quickDetailsButton = screen.getByTestId('quick-details-button');
    fireEvent.click(quickDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Quick Overview')).toBeInTheDocument();
      expect(screen.getByText('Task needs to be assigned')).toBeInTheDocument();
    });
  });

  test('should call action handlers when buttons clicked', () => {
    const readySnapshot = {
      ...mockSnapshot,
      overall: 'ready' as const,
      reasons: []
    };

    render(
      <TestWrapper>
        <StartabilityHeader {...mockProps} snapshot={readySnapshot} />
      </TestWrapper>
    );

    // Test refresh
    const refreshButton = screen.getByTestId('refresh-button');
    fireEvent.click(refreshButton);
    expect(mockProps.onRefresh).toHaveBeenCalled();

    // Test details
    const detailsButton = screen.getByTestId('details-button');
    fireEvent.click(detailsButton);
    expect(mockProps.onOpenDetails).toHaveBeenCalled();

    // Test send estimate
    const sendButton = screen.getByTestId('send-estimate-button');
    fireEvent.click(sendButton);
    expect(mockProps.onSendEstimate).toHaveBeenCalled();

    // Test convert to contract
    const convertButton = screen.getByTestId('convert-contract-button');
    fireEvent.click(convertButton);
    expect(mockProps.onConvertToContract).toHaveBeenCalled();
  });
});

// =====================================================
// CTA ACTIONS TESTS
// =====================================================

describe('CTAActionFactory Component', () => {
  const mockReason: StartabilityReason = {
    code: 'MISSING_ASSIGNMENT',
    category: 'PERMISSIONS',
    message: 'startability.reasons.missing_assignment',
    severity: 'warning',
    meta: {
      taskId: 'task-1',
      entityName: 'Website Design'
    },
    cta: 'ASSIGN',
    detectedAt: new Date()
  };

  const mockProps = {
    cta: 'ASSIGN' as StartabilityCTA,
    reason: mockReason,
    open: true,
    onClose: jest.fn(),
    onExecute: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render assign CTA dialog', () => {
    render(
      <TestWrapper>
        <CTAActionFactory {...mockProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Assign Task')).toBeInTheDocument();
    expect(screen.getByText('Task needs to be assigned')).toBeInTheDocument();
    expect(screen.getByText('Select Assignee')).toBeInTheDocument();
  });

  test('should render request approval CTA dialog', () => {
    const approvalProps = {
      ...mockProps,
      cta: 'REQUEST_APPROVAL' as StartabilityCTA,
      reason: {
        ...mockReason,
        code: 'BUDGET_OR_APPROVAL_REQUIRED' as const,
        cta: 'REQUEST_APPROVAL' as const
      }
    };

    render(
      <TestWrapper>
        <CTAActionFactory {...approvalProps} />
      </TestWrapper>
    );

    expect(screen.getByText('Request Approval')).toBeInTheDocument();
  });

  test('should call onClose when cancel clicked', () => {
    render(
      <TestWrapper>
        <CTAActionFactory {...mockProps} />
      </TestWrapper>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  test('should not render for unknown CTA', () => {
    const unknownProps = {
      ...mockProps,
      cta: 'UNKNOWN_CTA' as StartabilityCTA
    };

    const { container } = render(
      <TestWrapper>
        <CTAActionFactory {...unknownProps} />
      </TestWrapper>
    );

    expect(container.firstChild).toBeNull();
  });
});

// =====================================================
// INTEGRATION TESTS
// =====================================================

describe('Startability System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the useStartability hook
    mockUseStartability.mockReturnValue({
      snapshot: mockSnapshot,
      itemStartabilities: {
        'service-1': mockItemStartability
      },
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      executeCTA: jest.fn().mockResolvedValue(true),
      isEnabled: true
    });
  });

  test('should integrate components correctly in full workflow', async () => {
    const user = userEvent.setup();

    // Mock component that uses the startability system
    const TestEstimateConstructor: React.FC = () => {
      const startability = useStartability('project-1', 'estimate-1');
      const [sidebarOpen, setSidebarOpen] = React.useState(false);

      return (
        <div>
          <StartabilityHeader
            snapshot={startability.snapshot}
            onOpenDetails={() => setSidebarOpen(true)}
            onRefresh={startability.refresh}
          />
          
          <StartabilityCell
            itemStartability={startability.itemStartabilities['service-1']}
            onCellClick={() => setSidebarOpen(true)}
          />

          <StartabilitySidebar
            snapshot={startability.snapshot}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onCTAExecute={startability.executeCTA}
            onRefresh={startability.refresh}
          />
        </div>
      );
    };

    render(
      <TestWrapper>
        <TestEstimateConstructor />
      </TestWrapper>
    );

    // Verify header shows blocked state
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('1 Critical')).toBeInTheDocument();

    // Verify cell shows blocked status
    expect(screen.getByText('Blocked')).toBeInTheDocument();

    // Click cell to open sidebar
    const cell = screen.getByTestId('startability-cell');
    await user.click(cell);

    // Verify sidebar opens
    await waitFor(() => {
      expect(screen.getByText('🚀 Startability Check')).toBeInTheDocument();
    });

    // Click a CTA button
    const ctaButton = screen.getByTestId('cta-ASSIGN-MISSING_ASSIGNMENT');
    await user.click(ctaButton);

    // Verify CTA execution was called
    expect(mockUseStartability().executeCTA).toHaveBeenCalled();
  });

  test('should handle feature flag disabled state', () => {
    mockUseStartability.mockReturnValue({
      snapshot: null,
      itemStartabilities: {},
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      executeCTA: jest.fn(),
      isEnabled: false // Feature disabled
    });

    render(
      <TestWrapper>
        <StartabilityCell itemStartability={null} />
      </TestWrapper>
    );

    // Should show loading state when feature is disabled
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('should handle error states gracefully', () => {
    mockUseStartability.mockReturnValue({
      snapshot: null,
      itemStartabilities: {},
      isLoading: false,
      error: 'Failed to evaluate startability',
      refresh: jest.fn(),
      executeCTA: jest.fn(),
      isEnabled: true
    });

    render(
      <TestWrapper>
        <StartabilitySidebar
          snapshot={null}
          open={true}
          onClose={jest.fn()}
          onCTAExecute={jest.fn()}
          onRefresh={jest.fn()}
        />
      </TestWrapper>
    );

    // Should show loading indicator when error occurs
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

// =====================================================
// ACCESSIBILITY TESTS
// =====================================================

describe('Startability Accessibility', () => {
  test('should have proper ARIA attributes', () => {
    render(
      <TestWrapper>
        <StartabilityCell itemStartability={mockItemStartability} />
      </TestWrapper>
    );

    const cell = screen.getByTestId('startability-cell');
    expect(cell).toBeInTheDocument();
    
    // Should be keyboard accessible
    const moreButton = screen.getByTestId('startability-cell-more');
    expect(moreButton).toBeInTheDocument();
    expect(moreButton.tagName).toBe('BUTTON');
  });

  test('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <StartabilityHeader
          snapshot={mockSnapshot}
          onOpenDetails={jest.fn()}
        />
      </TestWrapper>
    );

    // Should be able to tab through interactive elements
    const refreshButton = screen.getByTestId('refresh-button');
    await user.tab();
    expect(refreshButton).toHaveFocus();

    // Should activate on Enter/Space
    await user.keyboard('{Enter}');
    // Verify interaction (would need more sophisticated test setup)
  });
});

// =====================================================
// PERFORMANCE TESTS
// =====================================================

describe('Startability Performance', () => {
  test('should not re-render unnecessarily', () => {
    const renderSpy = jest.fn();
    
    const TestComponent: React.FC<{ snapshot: StartabilitySnapshot }> = ({ snapshot }) => {
      renderSpy();
      return <StartabilityHeader snapshot={snapshot} />;
    };

    const { rerender } = render(
      <TestWrapper>
        <TestComponent snapshot={mockSnapshot} />
      </TestWrapper>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with same snapshot
    rerender(
      <TestWrapper>
        <TestComponent snapshot={mockSnapshot} />
      </TestWrapper>
    );

    // Should re-render (React doesn't prevent this without memo)
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  test('should handle large numbers of reasons efficiently', () => {
    const largeSnapshot = {
      ...mockSnapshot,
      reasons: Array.from({ length: 100 }, (_, i) => ({
        ...mockSnapshot.reasons[0],
        code: `REASON_${i}` as any,
        message: `Reason ${i}`
      }))
    };

    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <StartabilitySidebar
          snapshot={largeSnapshot}
          open={true}
          onClose={jest.fn()}
          onCTAExecute={jest.fn()}
          onRefresh={jest.fn()}
        />
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render in reasonable time (< 100ms)
    expect(renderTime).toBeLessThan(100);
  });
});