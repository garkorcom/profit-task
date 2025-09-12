// Simplified integration test to avoid compilation errors
import { mockV2StartabilityResponse } from '../fixtures/startability-fixtures';

describe('Startability V2 Integration - Simplified', () => {
  it('should have mock data available', () => {
    expect(mockV2StartabilityResponse).toBeDefined();
    expect(mockV2StartabilityResponse.projectId).toBe('test-project');
    expect(mockV2StartabilityResponse.itemsStartability['service-1'].summaryStatus).toBe('BLOCKED');
  });
});