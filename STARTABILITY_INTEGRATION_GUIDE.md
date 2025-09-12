# 🚀 Startability System - Integration Guide

## 📋 Overview

This guide provides step-by-step instructions for integrating the Startability System into your existing Estimate Constructor and other project management components.

The Startability System helps users identify and resolve blocking issues that prevent project work from starting, providing actionable solutions through an intuitive UI.

---

## 🏗️ Architecture Components

### Core Files Created:
```
src/
├── types/startability.types.ts          # TypeScript definitions
├── api/startabilityApi.ts               # API layer with caching
├── hooks/useStartability.ts             # React hooks
├── utils/featureFlags.ts                # Feature flag system
├── components/startability/
│   ├── StartabilityCell.tsx             # Grid cell component
│   ├── StartabilitySidebar.tsx          # Detail sidebar
│   ├── StartabilityHeader.tsx           # Global header
│   └── actions/CTAActions.tsx           # Action dialogs
├── i18n/
│   ├── startability.en.json             # English translations
│   └── startability.ru.json             # Russian translations
└── __tests__/
    ├── api/startability.test.ts         # API tests
    └── components/startability.test.tsx # Component tests
```

---

## 🚀 Quick Start Integration

### 1. Enable Feature Flag

**Development:**
```javascript
// Browser console
localStorage.setItem('feature_estimates.startability_v1', 'true')
// OR
devFeatureFlags.enable('estimates.startability_v1')
```

**Production Environment:**
```bash
REACT_APP_FEATURE_ESTIMATES_STARTABILITY_V1=true
```

### 2. Basic Component Integration

```typescript
// Import required components
import { useStartability } from '../hooks/useStartability';
import { StartabilityHeader } from '../components/startability/StartabilityHeader';
import { StartabilitySidebar } from '../components/startability/StartabilitySidebar';

// In your component
const YourComponent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initialize startability
  const startability = useStartability(projectId, estimateId, {
    refreshInterval: 30000,
    includeItems: true,
    enableRealTime: true
  });

  return (
    <div>
      {/* Global Status Header */}
      {startability.isEnabled && (
        <StartabilityHeader
          snapshot={startability.snapshot}
          onOpenDetails={() => setSidebarOpen(true)}
          onRefresh={startability.refresh}
          onSendEstimate={() => {
            if (startability.snapshot?.overall !== 'blocked') {
              sendEstimate();
            }
          }}
        />
      )}

      {/* Your existing content */}
      
      {/* Detail Sidebar */}
      <StartabilitySidebar
        open={sidebarOpen}
        snapshot={startability.snapshot}
        onClose={() => setSidebarOpen(false)}
        onCTAExecute={startability.executeCTA}
        onRefresh={startability.refresh}
      />
    </div>
  );
};
```

---

## 🔧 Detailed Integration Examples

### Master-Detail Grid Integration

For grids with individual item startability:

```typescript
import { StartabilityCell } from '../components/startability/StartabilityCell';

// AG-Grid integration
const columnDefs = [
  // ... your existing columns
  {
    headerName: '🚦',
    field: 'startability',
    width: 100,
    cellRenderer: StartabilityCell,
    cellRendererParams: {
      onCellClick: (itemId: string) => {
        // Open detail sidebar focused on this item
        setSelectedItem(itemId);
        setSidebarOpen(true);
      }
    }
  }
];

// Row data preparation
const rowData = items.map(item => ({
  ...item,
  startability: startability.itemStartabilities[item.id] || null
}));
```

### Action Button Integration

Block critical actions when startability is blocked:

```typescript
const ActionButtons: React.FC = () => {
  const { snapshot } = useStartability(projectId, estimateId);
  const isBlocked = snapshot?.overall === 'blocked';

  return (
    <div>
      <Tooltip title={isBlocked ? 'Critical issues must be resolved first' : ''}>
        <span>
          <Button
            disabled={isBlocked}
            onClick={sendToClient}
            variant="contained"
          >
            Send to Client
          </Button>
        </span>
      </Tooltip>
      
      <Tooltip title={isBlocked ? 'Cannot convert while issues exist' : ''}>
        <span>
          <Button
            disabled={isBlocked}
            onClick={convertToContract}
            variant="contained"
            color="success"
          >
            Convert to Contract
          </Button>
        </span>
      </Tooltip>
    </div>
  );
};
```

---

## ⚙️ Advanced Configuration

### Custom Refresh Triggers

Set up automatic refresh on relevant events:

```typescript
const useStartabilityWithTriggers = (projectId: string, estimateId: string) => {
  const startability = useStartability(projectId, estimateId);

  // Refresh on estimate updates
  useEffect(() => {
    const handleEstimateUpdate = () => {
      clearStartabilityCache(projectId, estimateId);
      startability.refresh();
    };

    const events = [
      'estimate_block_updated',
      'task_assigned',
      'project_status_changed'
    ];

    events.forEach(event => {
      window.addEventListener(event, handleEstimateUpdate);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleEstimateUpdate);
      });
    };
  }, [projectId, estimateId, startability.refresh]);

  return startability;
};
```

### Custom CTA Handlers

Implement your own CTA execution logic:

```typescript
const handleCTAExecution = async (cta: StartabilityCTA, reason: StartabilityReason) => {
  switch (cta) {
    case 'ASSIGN':
      // Open your assignment modal
      setAssignmentModal({
        open: true,
        taskId: reason.meta?.taskId,
        onSuccess: () => startability.refresh()
      });
      break;
      
    case 'REQUEST_APPROVAL':
      // Navigate to approval workflow
      navigate(`/approvals/request?type=${reason.meta?.approvalType}&estimateId=${estimateId}`);
      break;
      
    default:
      // Use default handler
      return startability.executeCTA(cta, reason);
  }
};
```

---

## 🌐 Localization Setup

Add translations to your i18n configuration:

```typescript
// i18n/index.ts
import startabilityEn from './startability.en.json';
import startabilityRu from './startability.ru.json';

const resources = {
  en: {
    translation: { ...existingEn },
    startability: startabilityEn.startability
  },
  ru: {
    translation: { ...existingRu },
    startability: startabilityRu.startability
  }
};
```

---

## 🧪 Testing Integration

### Unit Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { useStartability } from '../hooks/useStartability';
import YourComponent from './YourComponent';

// Mock the hook
jest.mock('../hooks/useStartability');
const mockUseStartability = useStartability as jest.MockedFunction<typeof useStartability>;

test('should disable send button when blocked', () => {
  mockUseStartability.mockReturnValue({
    snapshot: { overall: 'blocked', reasons: [...] },
    isEnabled: true,
    // ... other props
  });

  render(<YourComponent />);
  
  const sendButton = screen.getByRole('button', { name: /send/i });
  expect(sendButton).toBeDisabled();
});
```

### E2E Test Example

```typescript
// Using Playwright
test('startability workflow', async ({ page }) => {
  await page.goto('/estimates/123');
  
  // Should show blocked status
  await expect(page.locator('[data-testid="startability-header"]')).toContainText('Blocked');
  
  // Should disable send button
  const sendButton = page.locator('[data-testid="send-estimate-button"]');
  await expect(sendButton).toBeDisabled();
  
  // Open sidebar
  await page.click('[data-testid="details-button"]');
  await expect(page.locator('[data-testid="startability-sidebar"]')).toBeVisible();
  
  // Execute CTA
  await page.click('[data-testid="cta-ASSIGN-MISSING_ASSIGNMENT"]');
  // ... complete assignment flow
  
  // Should now be ready
  await expect(page.locator('[data-testid="startability-header"]')).toContainText('Ready');
  await expect(sendButton).not.toBeDisabled();
});
```

---

## 🔍 Troubleshooting

### Common Issues

**1. Feature not showing up**
- Check feature flag is enabled
- Verify user has required permissions
- Check console for JavaScript errors

**2. Performance issues**
- Increase cache TTL if evaluations are slow
- Reduce refresh interval for less critical projects
- Use `includeItems: false` if item-level analysis not needed

**3. Stale data**
- Call `clearStartabilityCache()` after major updates
- Use `forceRefresh: true` option
- Check real-time event listeners are set up

**4. Missing translations**
- Verify i18n configuration includes startability resources
- Check translation keys match the JSON structure
- Use fallback text for missing translations

### Debug Tools

**Development Console:**
```javascript
// List all feature flags
devFeatureFlags.list('user123');

// Clear startability cache
clearStartabilityCache('project-1', 'estimate-1');

// Manual evaluation
evaluateStartability('user123', 'project-1', 'estimate-1', { forceRefresh: true });
```

---

## 📊 Performance Considerations

### Optimization Tips

1. **Caching Strategy**
   - Default 30s TTL is good for most use cases
   - Increase to 60s+ for stable projects
   - Use shorter TTL (10-15s) during active editing

2. **Bundle Size**
   - Components are lazy-loadable
   - Feature flag prevents loading when disabled
   - i18n resources are split by language

3. **API Calls**
   - Evaluation combines multiple API calls efficiently
   - Results are cached and shared between components
   - Real-time updates use debouncing

4. **Memory Usage**
   - Cache automatically expires old entries
   - Event listeners are properly cleaned up
   - Components use React.memo where appropriate

---

## 🚢 Production Deployment

### Rollout Strategy

**Phase 1: Internal Testing (0-10%)**
```bash
REACT_APP_FEATURE_ESTIMATES_STARTABILITY_V1=true  # For specific users
```

**Phase 2: Beta Users (10-25%)**
```typescript
// In feature flag config
rolloutPercentage: 25,
userIds: { allow: ['beta-user-1', 'beta-user-2'] }
```

**Phase 3: Gradual Rollout (25-100%)**
```typescript
rolloutPercentage: 50,  // Then 75, then 100
```

### Monitoring

Track key metrics:
- `startability.viewed` - Feature usage
- `startability.cta_clicked` - Action engagement  
- `startability.resolved` - Issue resolution rate
- `startability.blocked_to_ready_ms` - Time to resolution

---

## 📞 Support

### Getting Help

1. **Documentation**: Check this guide and inline code comments
2. **Tests**: Review test files for usage examples  
3. **Console**: Use development debug tools
4. **Logs**: Check browser console for errors

### Common Questions

**Q: Can I customize the reason codes?**
A: Yes, extend `StartabilityCode` type and add entries to `STARTABILITY_REASON_CONFIG`

**Q: How do I add new CTA types?**
A: Add to `StartabilityCTA` type and implement in `CTAActionFactory`

**Q: Can I disable specific reasons?**
A: Yes, filter them in the evaluation logic or hide in UI

**Q: Is real-time sync required?**
A: No, set `enableRealTime: false` to disable WebSocket updates

---

## ✅ Integration Checklist

- [ ] Feature flag enabled for test users
- [ ] Components imported and integrated  
- [ ] Translations added to i18n
- [ ] Critical actions properly blocked
- [ ] Event listeners set up for auto-refresh
- [ ] Tests written for integration points
- [ ] Performance monitoring configured
- [ ] Error handling implemented
- [ ] Documentation updated

---

*Integration complete! The Startability System is now ready for production use.* 🎉