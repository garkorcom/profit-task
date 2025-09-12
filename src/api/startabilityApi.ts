/**
 * ============================================================================
 * STARTABILITY API - Estimate Constructor Integration
 * ============================================================================
 * 
 * API layer for evaluating project/estimate startability using Cloud Functions.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 2.0.0 - Cloud Functions
 * @feature estimates.startability_v1
 */

import { 
  StartabilitySnapshot, 
  StartabilityReason, 
  StartabilityCode,
  StartabilityCTA,
  ItemStartability,
  EvaluateStartabilityRequest,
  EvaluateStartabilityResponse,
  ExecuteCTARequest,
  ExecuteCTAResponse,
  STARTABILITY_DEFAULTS
} from '../types/startability.types';

import { functions } from '../firebase/firebase';
import { httpsCallable } from 'firebase/functions';

// =====================================================
// IN-MEMORY CACHE FOR PERFORMANCE
// =====================================================

interface CacheEntry {
  snapshot: StartabilitySnapshot;
  timestamp: number;
  ttl: number;
}

const startabilityCache = new Map<string, CacheEntry>();

// =====================================================
// CACHE MANAGEMENT
// =====================================================

function getCacheKey(projectId: string, estimateId: string, userId: string): string {
  return `${projectId}:${estimateId}:${userId}`;
}

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl * 1000;
}

/**
 * Clear cache entries for a specific project/estimate
 * Clears both local and server-side cache
 */
export async function clearStartabilityCache(projectId?: string, estimateId?: string): Promise<void> {
  // Clear local cache
  if (!projectId && !estimateId) {
    startabilityCache.clear();
  } else if (projectId && estimateId) {
    const cacheKey = getCacheKey(projectId, estimateId, '');
    startabilityCache.delete(cacheKey);
  }
  
  // Clear server-side cache via Cloud Function
  try {
    const clearCacheFn = httpsCallable(functions, 'clearStartabilityCache');
    await clearCacheFn({ projectId, estimateId });
  } catch (error) {
    console.warn('Failed to clear server-side startability cache:', error);
    // Don't throw - local cache clearing still succeeded
  }
}

// =====================================================
// CORE EVALUATION FUNCTIONS
// =====================================================

/**
 * Main startability evaluation function
 * Analyzes project, tasks, and estimate data using Cloud Functions
 */
export async function evaluateStartability(
  userId: string,
  projectId: string,
  estimateId: string,
  options: {
    includeItems?: boolean;
    includeSuggestions?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<EvaluateStartabilityResponse> {
  const cacheKey = getCacheKey(projectId, estimateId, userId);
  
  // Check local cache unless force refresh
  if (!options.forceRefresh) {
    const cached = startabilityCache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return { 
        snapshot: cached.snapshot,
        itemStartabilities: options.includeItems ? {} : undefined
      };
    }
  }

  try {
    // Call Cloud Function for evaluation
    const evaluateStartabilityFn = httpsCallable(functions, 'evaluateStartability');
    
    const response = await evaluateStartabilityFn({
      projectId,
      estimateId,
      includeItems: options.includeItems || true,
      forceRefresh: options.forceRefresh || false
    });

    const { snapshot, itemStartabilities } = (response.data as any).data;
    
    // Cache the result locally for immediate subsequent calls
    startabilityCache.set(cacheKey, {
      snapshot,
      timestamp: Date.now(),
      ttl: STARTABILITY_DEFAULTS.CACHE_TTL
    });

    return {
      snapshot,
      itemStartabilities: options.includeItems ? itemStartabilities || {} : undefined
    };
    
  } catch (error) {
    console.error('Startability evaluation failed:', error);
    throw new Error(`Failed to evaluate startability: ${error}`);
  }
}

// =====================================================
// CTA EXECUTION
// =====================================================

/**
 * Execute a call-to-action to resolve a startability reason using Cloud Functions
 */
export async function executeCTA(request: ExecuteCTARequest): Promise<ExecuteCTAResponse> {
  try {
    const { userId, projectId, estimateId, reasonCode, cta, metadata } = request;
    
    // Call Cloud Function for CTA execution
    const executeCTAFn = httpsCallable(functions, 'executeCTA');
    
    const response = await executeCTAFn({
      projectId,
      estimateId,
      cta,
      reasonCode,
      metadata
    });

    const { success, result } = response.data as any;
    
    // Clear cache after successful CTA execution
    if (success && projectId && estimateId) {
      clearStartabilityCache(projectId, estimateId);
    }

    return {
      success,
      message: success ? 'CTA executed successfully' : 'CTA execution failed',
      resolvedReasons: success ? [reasonCode] : [],
      result
    };

  } catch (error) {
    console.error('CTA execution failed:', error);
    return {
      success: false,
      message: `Failed to execute CTA: ${error}`,
      resolvedReasons: []
    };
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Check if startability feature is enabled for user
 */
export function isStartabilityEnabled(userId?: string, userRole?: string): boolean {
  // Basic feature flag check - can be enhanced with user/role specific logic
  return localStorage.getItem('feature_estimates.startability_v1') === 'true' ||
         process.env.REACT_APP_FEATURE_ESTIMATES_STARTABILITY_V1 === 'true';
}

/**
 * Track startability events for analytics
 */
export function trackStartabilityEvent(
  event: 'viewed' | 'cta_clicked' | 'resolved' | 'blocked_to_ready', 
  metadata: Record<string, any>
): void {
  // TODO: Integrate with your analytics system
  console.log('Startability Event:', event, metadata);
}