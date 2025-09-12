/**
 * ============================================================================
 * FEATURE FLAGS SYSTEM
 * ============================================================================
 * 
 * Centralized feature flag management system for controlling feature rollouts,
 * A/B testing, and gradual deployments.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { STARTABILITY_FEATURE_FLAG } from '../types/startability.types';

// =====================================================
// FEATURE FLAG TYPES
// =====================================================

export type FeatureFlagKey = 
  | typeof STARTABILITY_FEATURE_FLAG
  | 'estimates.enhanced_calculator_v2'
  | 'projects.kanban_view'
  | 'time_tracking.advanced_reporting'
  | 'ui.dark_mode'
  | 'notifications.real_time'
  | 'export.pdf_generation_v3';

export interface FeatureFlagConfig {
  /** Feature flag key */
  key: FeatureFlagKey;
  
  /** Human-readable name */
  name: string;
  
  /** Feature description */
  description: string;
  
  /** Default enabled state */
  defaultEnabled: boolean;
  
  /** Environment restrictions */
  environments?: ('development' | 'staging' | 'production')[];
  
  /** User role restrictions */
  roles?: string[];
  
  /** User ID allowlist/blocklist */
  userIds?: {
    allow?: string[];
    block?: string[];
  };
  
  /** Percentage rollout (0-100) */
  rolloutPercentage?: number;
  
  /** Expiration date (auto-disable) */
  expiresAt?: Date;
  
  /** Dependencies on other features */
  dependencies?: FeatureFlagKey[];
}

// =====================================================
// FEATURE FLAG REGISTRY
// =====================================================

const FEATURE_FLAG_REGISTRY: Record<FeatureFlagKey, FeatureFlagConfig> = {
  // Startability System
  [STARTABILITY_FEATURE_FLAG]: {
    key: STARTABILITY_FEATURE_FLAG,
    name: 'Estimate Startability System',
    description: 'Advanced startability analysis and CTA system for estimates',
    defaultEnabled: false,
    environments: ['development', 'staging'],
    rolloutPercentage: 50,
    dependencies: [],
  },
  
  // Enhanced Calculator
  'estimates.enhanced_calculator_v2': {
    key: 'estimates.enhanced_calculator_v2',
    name: 'Enhanced Estimate Calculator V2',
    description: 'New calculation engine with improved performance',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
  },
  
  // Kanban View
  'projects.kanban_view': {
    key: 'projects.kanban_view',
    name: 'Project Kanban View',
    description: 'Kanban board view for project management',
    defaultEnabled: false,
    environments: ['development'],
    roles: ['admin', 'project_manager'],
  },
  
  // Advanced Time Tracking
  'time_tracking.advanced_reporting': {
    key: 'time_tracking.advanced_reporting',
    name: 'Advanced Time Tracking Reports',
    description: 'Enhanced reporting and analytics for time tracking',
    defaultEnabled: false,
    rolloutPercentage: 25,
  },
  
  // Dark Mode
  'ui.dark_mode': {
    key: 'ui.dark_mode',
    name: 'Dark Mode UI',
    description: 'Dark theme support for the application',
    defaultEnabled: true,
    environments: ['development', 'staging', 'production'],
  },
  
  // Real-time Notifications
  'notifications.real_time': {
    key: 'notifications.real_time',
    name: 'Real-time Notifications',
    description: 'WebSocket-based real-time notifications',
    defaultEnabled: false,
    environments: ['development', 'staging'],
  },
  
  // PDF Generation V3
  'export.pdf_generation_v3': {
    key: 'export.pdf_generation_v3',
    name: 'PDF Generation V3',
    description: 'New PDF generation engine with better templates',
    defaultEnabled: false,
    rolloutPercentage: 10,
    expiresAt: new Date('2025-06-01'),
  },
};

// =====================================================
// FEATURE FLAG SERVICE
// =====================================================

class FeatureFlagService {
  private cache = new Map<string, { value: boolean; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a feature flag is enabled for a user
   */
  async isEnabled(
    flagKey: FeatureFlagKey,
    context: {
      userId?: string;
      userRole?: string;
      environment?: string;
    } = {}
  ): Promise<boolean> {
    const cacheKey = `${flagKey}:${context.userId || 'anonymous'}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached value if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.value;
    }

    try {
      const enabled = await this.evaluateFlag(flagKey, context);
      
      // Cache the result
      this.cache.set(cacheKey, {
        value: enabled,
        timestamp: Date.now()
      });
      
      return enabled;
    } catch (error) {
      console.error(`Feature flag evaluation failed for ${flagKey}:`, error);
      
      // Fallback to default
      const config = FEATURE_FLAG_REGISTRY[flagKey];
      return config?.defaultEnabled || false;
    }
  }

  /**
   * Evaluate a single feature flag
   */
  private async evaluateFlag(
    flagKey: FeatureFlagKey,
    context: {
      userId?: string;
      userRole?: string;
      environment?: string;
    }
  ): Promise<boolean> {
    const config = FEATURE_FLAG_REGISTRY[flagKey];
    if (!config) {
      console.warn(`Unknown feature flag: ${flagKey}`);
      return false;
    }

    // Check if expired
    if (config.expiresAt && new Date() > config.expiresAt) {
      return false;
    }

    // Check environment restrictions
    const currentEnv = context.environment || process.env.NODE_ENV || 'development';
    if (config.environments && !config.environments.includes(currentEnv as any)) {
      return false;
    }

    // Check role restrictions
    if (config.roles && context.userRole && !config.roles.includes(context.userRole)) {
      return false;
    }

    // Check user ID blocklist
    if (config.userIds?.block?.includes(context.userId || '')) {
      return false;
    }

    // Check user ID allowlist
    if (config.userIds?.allow && !config.userIds.allow.includes(context.userId || '')) {
      return false;
    }

    // Check dependencies
    if (config.dependencies) {
      for (const depKey of config.dependencies) {
        const depEnabled = await this.isEnabled(depKey, context);
        if (!depEnabled) {
          return false;
        }
      }
    }

    // Check rollout percentage
    if (config.rolloutPercentage !== undefined) {
      const userHash = this.hashUserId(context.userId || 'anonymous', flagKey);
      const userPercentile = userHash % 100;
      if (userPercentile >= config.rolloutPercentage) {
        return false;
      }
    }

    // Environment variable override
    const envVarKey = `REACT_APP_FEATURE_${flagKey.toUpperCase().replace(/\./g, '_')}`;
    const envOverride = process.env[envVarKey];
    if (envOverride !== undefined) {
      return envOverride === 'true';
    }

    // Return default value
    return config.defaultEnabled;
  }

  /**
   * Get feature flag configuration
   */
  getConfig(flagKey: FeatureFlagKey): FeatureFlagConfig | null {
    return FEATURE_FLAG_REGISTRY[flagKey] || null;
  }

  /**
   * Get all available feature flags
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Object.values(FEATURE_FLAG_REGISTRY);
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private hashUserId(userId: string, salt: string): number {
    let hash = 0;
    const input = `${userId}:${salt}`;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash);
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const featureFlagService = new FeatureFlagService();

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

/**
 * Check if a feature flag is enabled (convenience function)
 */
export async function isFeatureEnabled(
  flagKey: FeatureFlagKey,
  context?: {
    userId?: string;
    userRole?: string;
    environment?: string;
  }
): Promise<boolean> {
  return featureFlagService.isEnabled(flagKey, context);
}

/**
 * Check if startability feature is enabled
 */
export async function isStartabilityEnabled(
  userId?: string,
  userRole?: string
): Promise<boolean> {
  return isFeatureEnabled(STARTABILITY_FEATURE_FLAG, { userId, userRole });
}

/**
 * Bulk check multiple feature flags
 */
export async function checkFeatureFlags(
  flags: FeatureFlagKey[],
  context?: {
    userId?: string;
    userRole?: string;
    environment?: string;
  }
): Promise<Record<FeatureFlagKey, boolean>> {
  const results = await Promise.all(
    flags.map(flag => featureFlagService.isEnabled(flag, context))
  );
  
  return flags.reduce((acc, flag, index) => {
    acc[flag] = results[index];
    return acc;
  }, {} as Record<FeatureFlagKey, boolean>);
}

// =====================================================
// DEVELOPMENT UTILITIES
// =====================================================

/**
 * Development helper to enable/disable flags in localStorage
 */
export const devFeatureFlags = {
  /**
   * Enable a feature flag for current session
   */
  enable(flagKey: FeatureFlagKey): void {
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem(`feature_${flagKey}`, 'true');
      featureFlagService.clearCache();
      console.log(`✅ Enabled feature flag: ${flagKey}`);
    }
  },

  /**
   * Disable a feature flag for current session
   */
  disable(flagKey: FeatureFlagKey): void {
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem(`feature_${flagKey}`, 'false');
      featureFlagService.clearCache();
      console.log(`❌ Disabled feature flag: ${flagKey}`);
    }
  },

  /**
   * Reset a feature flag to default
   */
  reset(flagKey: FeatureFlagKey): void {
    if (process.env.NODE_ENV === 'development') {
      localStorage.removeItem(`feature_${flagKey}`);
      featureFlagService.clearCache();
      console.log(`🔄 Reset feature flag: ${flagKey}`);
    }
  },

  /**
   * List all feature flags and their current state
   */
  async list(userId?: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      const flags = featureFlagService.getAllFlags();
      const results = await checkFeatureFlags(
        flags.map(f => f.key),
        { userId }
      );

      console.group('🚩 Feature Flags Status');
      flags.forEach(flag => {
        const enabled = results[flag.key];
        console.log(
          `${enabled ? '✅' : '❌'} ${flag.name} (${flag.key})`,
          flag.description
        );
      });
      console.groupEnd();
    }
  }
};

// Expose dev utilities globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).devFeatureFlags = devFeatureFlags;
}

// =====================================================
// REACT INTEGRATION
// =====================================================

/**
 * React hook for feature flags
 */
export function useFeatureFlag(
  flagKey: FeatureFlagKey,
  context?: {
    userId?: string;
    userRole?: string;
    environment?: string;
  }
): { enabled: boolean; loading: boolean } {
  const [state, setState] = useState({
    enabled: false,
    loading: true
  });

  useEffect(() => {
    let mounted = true;

    featureFlagService.isEnabled(flagKey, context).then(enabled => {
      if (mounted) {
        setState({ enabled, loading: false });
      }
    });

    return () => {
      mounted = false;
    };
  }, [flagKey, context?.userId, context?.userRole, context?.environment]);

  return state;
}

// React hooks imported as React.useState and React.useEffect

export default featureFlagService;