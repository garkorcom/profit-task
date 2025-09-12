/**
 * ============================================================================
 * HOOK - useStartability for Estimate Constructor
 * ============================================================================
 * 
 * React hook for managing startability state in the Estimate Constructor.
 * Provides real-time startability evaluation, CTA execution, and caching.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StartabilitySnapshot,
  StartabilityReason,
  StartabilityCTA,
  ItemStartability,
  UseStartabilityResult,
  UseStartabilityConfig,
  STARTABILITY_DEFAULTS,
  STARTABILITY_FEATURE_FLAG
} from '../types/startability.types';

import { 
  evaluateStartability,
  executeCTA as apiExecuteCTA,
  isStartabilityEnabled,
  trackStartabilityEvent,
  clearStartabilityCache
} from '../api/startabilityApi';

import { useAuth } from '../auth/AuthContext';
import { debounce } from 'lodash';

/**
 * Primary hook for startability functionality in Estimate Constructor
 */
export function useStartability(
  projectId: string,
  estimateId: string,
  config: UseStartabilityConfig = {}
): UseStartabilityResult {
  // Configuration with defaults
  const {
    refreshInterval = STARTABILITY_DEFAULTS.REFRESH_INTERVAL,
    includeItems = true,
    includeSuggestions = false,
    enableRealTime = true,
    cacheTTL = STARTABILITY_DEFAULTS.CACHE_TTL
  } = config;

  // Auth context
  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'anonymous';

  // State
  const [snapshot, setSnapshot] = useState<StartabilitySnapshot | null>(null);
  const [itemStartabilities, setItemStartabilities] = useState<Record<string, ItemStartability>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // Refs for cleanup and debouncing
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Check if feature is enabled
  useEffect(() => {
    const checkEnabled = async () => {
      try {
        const enabled = await isStartabilityEnabled(userId);
        setIsEnabled(enabled);
      } catch (err) {
        console.warn('Failed to check startability feature flag:', err);
        setIsEnabled(false);
      }
    };

    checkEnabled();
  }, [userId]);

  // Main refresh function
  const refresh = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!isEnabled || !projectId || !estimateId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await evaluateStartability(userId, projectId, estimateId, {
        includeItems,
        includeSuggestions,
        forceRefresh
      });

      if (!mountedRef.current) return;

      setSnapshot(response.snapshot);
      if (response.itemStartabilities) {
        setItemStartabilities(response.itemStartabilities);
      }

      // Track view event
      trackStartabilityEvent('viewed', {
        projectId,
        estimateId,
        overall: response.snapshot.overall,
        reasonCount: response.snapshot.reasons.length
      });

    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to evaluate startability';
      setError(errorMessage);
      console.error('Startability evaluation failed:', err);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId, projectId, estimateId, includeItems, includeSuggestions, isEnabled]);

  // Debounced refresh for frequent updates
  const debouncedRefresh = useCallback(
    debounce(() => refresh(false), STARTABILITY_DEFAULTS.DEBOUNCE_DELAY),
    [refresh]
  );

  // Execute CTA function
  const executeCTA = useCallback(async (
    cta: StartabilityCTA, 
    reason: StartabilityReason
  ): Promise<boolean> => {
    if (!isEnabled) return false;

    try {
      setIsLoading(true);

      // Track CTA click
      trackStartabilityEvent('cta_clicked', {
        projectId,
        estimateId,
        cta,
        reasonCode: reason.code,
        severity: reason.severity
      });

      const response = await apiExecuteCTA({
        userId,
        projectId,
        estimateId,
        reasonCode: reason.code,
        cta,
        metadata: {
          ...reason.meta
        }
      });

      if (response.success) {
        // Track successful resolution
        trackStartabilityEvent('resolved', {
          projectId,
          estimateId,
          resolvedReasons: response.resolvedReasons,
          cta
        });

        // Update snapshot if provided, otherwise refresh
        if (response.newSnapshot) {
          setSnapshot(response.newSnapshot);
        } else {
          // Optimistic update: remove resolved reasons
          setSnapshot(current => {
            if (!current) return null;
            
            const filteredReasons = current.reasons.filter(
              r => !response.resolvedReasons.includes(r.code)
            );

            const criticalCount = filteredReasons.filter(r => r.severity === 'critical').length;
            const warningCount = filteredReasons.filter(r => r.severity === 'warning').length;
            const infoCount = filteredReasons.filter(r => r.severity === 'info').length;

            const newOverall = criticalCount > 0 ? 'blocked' : 
                              warningCount > 0 ? 'attention' : 'ready';

            // Track status change
            if (current.overall === 'blocked' && newOverall === 'ready') {
              trackStartabilityEvent('blocked_to_ready', {
                projectId,
                estimateId,
                resolvedCta: cta,
                timeTakenMs: Date.now() - current.evaluatedAt.getTime()
              });
            }

            return {
              ...current,
              overall: newOverall,
              reasons: filteredReasons,
              stats: {
                ...current.stats,
                criticalCount,
                warningCount,
                infoCount
              }
            };
          });

          // Schedule a full refresh to confirm changes
          setTimeout(() => refresh(true), 1000);
        }

        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, projectId, estimateId, isEnabled, refresh]);

  // Initial load and setup auto-refresh
  useEffect(() => {
    if (!isEnabled) return;

    // Initial load
    refresh();

    // Setup auto-refresh interval
    if (enableRealTime && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        refresh(false);
      }, refreshInterval);
    }

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh, enableRealTime, refreshInterval, isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-refresh triggers (external events)
  useEffect(() => {
    const handleEstimateUpdate = () => {
      if (isEnabled) {
        // Clear cache to force fresh evaluation
        clearStartabilityCache(projectId, estimateId);
        debouncedRefresh();
      }
    };

    // Listen for estimate updates
    const events = [
      'estimate_block_updated',
      'task_assigned', 
      'task_status_changed',
      'project_status_changed',
      'estimate_status_changed'
    ];

    events.forEach(event => {
      window.addEventListener(event, handleEstimateUpdate);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleEstimateUpdate);
      });
    };
  }, [projectId, estimateId, isEnabled, debouncedRefresh]);

  return {
    snapshot,
    itemStartabilities,
    isLoading,
    error,
    refresh: () => refresh(true),
    executeCTA,
    isEnabled
  };
}

/**
 * Lightweight hook for checking overall startability status only
 * Useful for header/global state without full details
 */
export function useStartabilityStatus(
  projectId: string, 
  estimateId: string
): {
  overall: 'ready' | 'blocked' | 'attention' | 'loading';
  criticalCount: number;
  warningCount: number;
  refresh: () => void;
} {
  const { snapshot, isLoading, refresh } = useStartability(projectId, estimateId, {
    includeItems: false,
    includeSuggestions: false,
    refreshInterval: 60000 // Less frequent for status-only
  });

  if (isLoading && !snapshot) {
    return {
      overall: 'loading',
      criticalCount: 0,
      warningCount: 0,
      refresh
    };
  }

  return {
    overall: snapshot?.overall || 'ready',
    criticalCount: snapshot?.stats.criticalCount || 0,
    warningCount: snapshot?.stats.warningCount || 0,
    refresh
  };
}

/**
 * Hook for individual item startability (for grid cells)
 */
export function useItemStartability(
  itemId: string,
  itemType: 'service' | 'task' | 'product' | 'estimate_task',
  projectId: string,
  estimateId: string
): ItemStartability | null {
  const { itemStartabilities } = useStartability(projectId, estimateId);
  return itemStartabilities[itemId] || null;
}

/**
 * Utility hook for triggering startability refresh from external components
 */
export function useStartabilityRefresh() {
  return useCallback((projectId: string, estimateId: string) => {
    // Clear cache to force refresh
    clearStartabilityCache(projectId, estimateId);
    
    // Dispatch custom event to trigger refresh in active hooks
    window.dispatchEvent(new CustomEvent('estimate_startability_refresh', {
      detail: { projectId, estimateId }
    }));
  }, []);
}

/**
 * Hook for startability feature flag status
 */
export function useStartabilityFeatureFlag(): boolean {
  const [isEnabled, setIsEnabled] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser?.uid) {
      setIsEnabled(isStartabilityEnabled(currentUser.uid));
    }
  }, [currentUser?.uid]);

  return isEnabled;
}