/**
 * ============================================================================
 * STARTABILITY TYPES - Estimate Constructor Integration
 * ============================================================================
 * 
 * TypeScript definitions for the startability system integration
 * with the Estimate Constructor. Provides comprehensive typing for
 * project/task/estimate startability evaluation and UI interactions.
 * 
 * @author Senior Full-Stack Engineer + UX Architect
 * @version 1.0.0
 * @feature estimates.startability_v1
 */

// =====================================================
// CORE STARTABILITY TYPES
// =====================================================

/**
 * Comprehensive startability reason codes
 * Extends the original system with estimate-specific codes
 */
export type StartabilityCode =
  // Project-level reasons
  | 'PROJECT_STATUS_NOT_STARTABLE'      // Project in final/cancelled state
  | 'PROJECT_ON_HOLD'                   // Project temporarily paused
  
  // Task-level reasons
  | 'NO_TASKS'                          // No tasks in project
  | 'ALL_TASKS_BLOCKED'                 // All tasks blocked/completed
  | 'DEPENDENCIES_NOT_MET'              // Task dependencies not resolved
  
  // Assignment/Permission reasons
  | 'MISSING_ASSIGNMENT'                // No assignee for task
  | 'MISSING_PERMISSIONS'               // Insufficient user permissions
  
  // Business/Financial reasons  
  | 'NO_ESTIMATES'                      // No estimates in project
  | 'NO_STARTABLE_ITEMS_IN_ESTIMATES'   // All estimate items blocked
  | 'BUDGET_OR_APPROVAL_REQUIRED'       // Needs client/manager approval
  | 'COMPLIANCE_HOLD'                   // Permits/COI/safety hold
  
  // Estimate-specific reasons (V2)
  | 'ESTIMATE_STATUS_BLOCKED'           // Estimate in non-startable status
  | 'MISSING_COUNTERPARTY_APPROVAL'     // Client approval pending
  | 'INCOMPLETE_ESTIMATE_BLOCKS'        // Required blocks not complete
  | 'SERVICE_ITEMS_NOT_ASSIGNED'        // Services without assignees
  | 'MATERIAL_AVAILABILITY_HOLD';       // Materials not available

/**
 * Reason categories for UI grouping and prioritization
 */
export type StartabilityCategory = 
  | 'PROJECT'      // Project-level issues
  | 'TASKS'        // Task management issues
  | 'PERMISSIONS'  // Access/assignment issues
  | 'BUSINESS'     // Financial/approval issues
  | 'ESTIMATE';    // Estimate-specific issues

/**
 * Severity levels for UI styling and prioritization
 */
export type StartabilitySeverity = 
  | 'critical'     // Blocks all work, must resolve
  | 'warning'      // Blocks some work, should resolve
  | 'info';        // Advisory, nice to resolve

/**
 * Available CTA (Call-to-Action) types for resolving reasons
 * Extended to match technical requirements ResolutionAction.type
 */
export type StartabilityCTA =
  | 'ASSIGN_USER'               // Assign task to user (matches TZ)
  | 'REQUEST_APPROVAL'          // Send approval request
  | 'VIEW_DEPENDENCY'           // Show dependency tree (singular from TZ)
  | 'VIEW_DEPENDENCIES'         // Show dependency tree (plural for backward compatibility)
  | 'UPLOAD_DOCUMENT'           // Upload required documents (from TZ)
  | 'NAVIGATE'                  // Generic navigation action (from TZ)
  | 'COMPLETE_ESTIMATE_BLOCK'   // Complete required estimate block
  | 'APPROVE_ESTIMATE'          // Mark estimate as approved
  | 'RESOLVE_MATERIALS'         // Handle material availability
  | 'CHANGE_PROJECT_STATUS'     // Update project status
  | 'ASSIGN'                    // Generic assign action (legacy)
  | 'OPEN_COMPLIANCE'           // Open compliance module
  | 'OPEN_PERMITS';             // Open permits management

// =====================================================
// TECHNICAL REQUIREMENTS - NEW INTERFACES
// =====================================================

/**
 * Master Grid Status indicators (matches TZ requirements)
 */
export type SummaryStatus = 
  | 'READY'    // ✅ - Ready to start
  | 'WARNING'  // ⚠️ - Has warnings but can start
  | 'BLOCKED'  // 🚫 - Cannot start due to critical issues
  | 'DONE';    // 🏁 - Already completed

/**
 * ResolutionAction interface (from TZ requirements)
 * Instructs frontend on how to resolve specific blockers
 */
export interface ResolutionAction {
  /** Type of UI component to render */
  type: StartabilityCTA;
  
  /** Text for button/link */
  label: string;
  
  /** API endpoint for executing the action */
  apiEndpoint?: string;
  
  /** Additional context data (e.g., task IDs, URLs) */
  contextData?: Record<string, any>;
}

/**
 * BlockerReason interface (from TZ requirements)
 * Individual blocking reason with resolution instructions
 */
export interface BlockerReason {
  /** Reason code for identification */
  code: string;
  
  /** Category for UI grouping */
  category: 'Project' | 'Task' | 'Permissions' | 'Business';
  
  /** Human-readable description */
  description: string;
  
  /** Severity level */
  severity: 'CRITICAL' | 'WARNING';
  
  /** Instructions for resolution (key field) */
  resolutionAction: ResolutionAction | null;
}

/**
 * ItemStartabilityV2 interface (from TZ requirements)
 * Startability status for individual estimate items in V2 system
 */
export interface ItemStartabilityV2 {
  /** Unique item identifier */
  itemId: string;
  
  /** Aggregated status for Master Grid (🚦) */
  summaryStatus: SummaryStatus;
  
  /** Detailed list of blockers for Detail Sidebar */
  blockers: BlockerReason[];
}

/**
 * StartabilityReport interface (from TZ requirements)
 * Main API response structure for startability analysis
 */
export interface StartabilityReport {
  /** Project identifier */
  projectId: string;
  
  /** Global project startability status */
  isProjectStartable: boolean;
  
  /** Detailed startability by estimate items */
  itemsStartability: Record<string, ItemStartabilityV2>; // Key = itemId/taskId
}

// =====================================================
// CORE INTERFACES (EXISTING)
// =====================================================

/**
 * Individual startability reason with actionable metadata
 */
export interface StartabilityReason {
  /** Unique reason code */
  code: StartabilityCode;
  
  /** UI grouping category */
  category: StartabilityCategory;
  
  /** Localization key for reason message */
  message: string;
  
  /** Severity level for UI styling */
  severity: StartabilitySeverity;
  
  /** Additional metadata for actions */
  meta?: {
    /** Related entity IDs */
    projectId?: string;
    estimateId?: string;
    taskId?: string;
    serviceId?: string;
    blockKey?: string;
    
    /** UI display data */
    entityName?: string;
    assigneeName?: string;
    dependencyNames?: string[];
    
    /** Action parameters */
    suggestedAssignees?: Array<{
      id: string;
      name: string;
      role: string;
    }>;
    
    /** Navigation targets */
    navigationUrl?: string;
    
    /** Additional context */
    [key: string]: any;
  };
  
  /** Available call-to-action for this reason */
  cta?: StartabilityCTA;
  
  /** Whether this reason can be auto-resolved */
  autoResolvable?: boolean;
  
  /** Timestamp when reason was detected */
  detectedAt: Date;
}

/**
 * Complete startability evaluation snapshot
 */
export interface StartabilitySnapshot {
  /** Project identifier */
  projectId: string;
  
  /** Estimate identifier */
  estimateId: string;
  
  /** Overall startability status */
  overall: 'ready' | 'blocked' | 'attention';
  
  /** All detected reasons (deduplicated) */
  reasons: StartabilityReason[];
  
  /** Sample of blocked task/service names for UI */
  sampleBlockedItems?: string[];
  
  /** Quick stats for header display */
  stats: {
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    startableItemCount: number;
    totalItemCount: number;
  };
  
  /** Cache metadata */
  evaluatedAt: Date;
  evaluatedBy: string;
  ttl: number; // seconds
}

/**
 * Item-level startability for grid rows
 */
export interface ItemStartability {
  /** Item identifier (task/service/product) */
  itemId: string;
  
  /** Item type for proper handling */
  itemType: 'service' | 'task' | 'product' | 'estimate_task';
  
  /** Item startability status */
  status: 'ready' | 'blocked' | 'attention';
  
  /** Reasons specific to this item */
  reasons: StartabilityReason[];
  
  /** Quick icon for grid cell */
  icon: '✅' | '⚠️' | '🚫' | '🏁';
  
  /** Tooltip text for grid cell */
  tooltip: string;
}

// =====================================================
// API INTERFACES
// =====================================================

/**
 * Request parameters for startability evaluation
 */
export interface EvaluateStartabilityRequest {
  userId: string;
  projectId: string;
  estimateId: string;
  
  /** Optional filters */
  includeItems?: boolean;
  includeSuggestions?: boolean;
  forceRefresh?: boolean;
}

/**
 * Response from startability evaluation
 */
export interface EvaluateStartabilityResponse {
  snapshot: StartabilitySnapshot;
  itemStartabilities?: Record<string, ItemStartability>;
  suggestions?: StartabilitySuggestion[];
}

/**
 * Suggestion for resolving startability issues
 */
export interface StartabilitySuggestion {
  id: string;
  title: string;
  description: string;
  cta: StartabilityCTA;
  priority: number;
  estimatedTimeToResolve: string;
  metadata: Record<string, any>;
}

/**
 * CTA execution request
 */
export interface ExecuteCTARequest {
  userId: string;
  projectId: string;
  estimateId: string;
  reasonCode: StartabilityCode;
  cta: StartabilityCTA;
  metadata: Record<string, any>;
}

/**
 * CTA execution response
 */
export interface ExecuteCTAResponse {
  success: boolean;
  message: string;
  resolvedReasons: StartabilityCode[];
  newSnapshot?: StartabilitySnapshot;
  result?: any;
}

// =====================================================
// UI COMPONENT PROPS
// =====================================================

/**
 * Props for StartabilityCell component
 */
export interface StartabilityCellProps {
  itemStartability: ItemStartability;
  onCellClick?: (itemId: string) => void;
  showTooltip?: boolean;
  compact?: boolean;
}

/**
 * Props for StartabilitySidebar component
 */
export interface StartabilitySidebarProps {
  snapshot: StartabilitySnapshot | null;
  selectedItemId?: string;
  onCTAExecute: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<void>;
  onRefresh: () => void;
  isLoading?: boolean;
}

/**
 * Props for StartabilityHeader component
 */
export interface StartabilityHeaderProps {
  snapshot: StartabilitySnapshot | null;
  onHeaderClick?: () => void;
  showDetailsButton?: boolean;
  criticalActionsDisabled?: boolean;
}

// =====================================================
// HOOK INTERFACES
// =====================================================

/**
 * Return type for useStartability hook
 */
export interface UseStartabilityResult {
  /** Current startability snapshot */
  snapshot: StartabilitySnapshot | null;
  
  /** Item-level startabilities */
  itemStartabilities: Record<string, ItemStartability>;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  /** Refresh function */
  refresh: () => Promise<void>;
  
  /** Execute CTA function */
  executeCTA: (cta: StartabilityCTA, reason: StartabilityReason) => Promise<boolean>;
  
  /** Check if feature is enabled */
  isEnabled: boolean;
}

/**
 * Configuration for useStartability hook
 */
export interface UseStartabilityConfig {
  /** Auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number;
  
  /** Whether to include item-level analysis */
  includeItems?: boolean;
  
  /** Whether to include suggestions */
  includeSuggestions?: boolean;
  
  /** Whether to enable real-time updates */
  enableRealTime?: boolean;
  
  /** Cache TTL in seconds (default: 30) */
  cacheTTL?: number;
}

// =====================================================
// CONSTANTS AND ENUMS
// =====================================================

/**
 * Mapping of reason codes to their display properties
 */
export const STARTABILITY_REASON_CONFIG: Record<StartabilityCode, {
  category: StartabilityCategory;
  severity: StartabilitySeverity;
  icon: string;
  defaultCTA?: StartabilityCTA;
}> = {
  // Project-level
  PROJECT_STATUS_NOT_STARTABLE: { category: 'PROJECT', severity: 'critical', icon: '🚫', defaultCTA: 'CHANGE_PROJECT_STATUS' },
  PROJECT_ON_HOLD: { category: 'PROJECT', severity: 'warning', icon: '⏸️' },
  
  // Task-level
  NO_TASKS: { category: 'TASKS', severity: 'critical', icon: '📝' },
  ALL_TASKS_BLOCKED: { category: 'TASKS', severity: 'critical', icon: '🔒' },
  DEPENDENCIES_NOT_MET: { category: 'TASKS', severity: 'warning', icon: '🔗', defaultCTA: 'VIEW_DEPENDENCY' },
  
  // Assignment/Permissions
  MISSING_ASSIGNMENT: { category: 'PERMISSIONS', severity: 'warning', icon: '👤', defaultCTA: 'ASSIGN_USER' },
  MISSING_PERMISSIONS: { category: 'PERMISSIONS', severity: 'critical', icon: '🔐' },
  
  // Business/Financial
  NO_ESTIMATES: { category: 'BUSINESS', severity: 'info', icon: '💰' },
  NO_STARTABLE_ITEMS_IN_ESTIMATES: { category: 'BUSINESS', severity: 'warning', icon: '📊' },
  BUDGET_OR_APPROVAL_REQUIRED: { category: 'BUSINESS', severity: 'warning', icon: '✅', defaultCTA: 'REQUEST_APPROVAL' },
  COMPLIANCE_HOLD: { category: 'BUSINESS', severity: 'critical', icon: '📋', defaultCTA: 'OPEN_COMPLIANCE' },
  
  // Estimate-specific
  ESTIMATE_STATUS_BLOCKED: { category: 'ESTIMATE', severity: 'critical', icon: '📄' },
  MISSING_COUNTERPARTY_APPROVAL: { category: 'ESTIMATE', severity: 'warning', icon: '👥', defaultCTA: 'REQUEST_APPROVAL' },
  INCOMPLETE_ESTIMATE_BLOCKS: { category: 'ESTIMATE', severity: 'warning', icon: '📝', defaultCTA: 'COMPLETE_ESTIMATE_BLOCK' },
  SERVICE_ITEMS_NOT_ASSIGNED: { category: 'ESTIMATE', severity: 'warning', icon: '🔧', defaultCTA: 'ASSIGN_USER' },
  MATERIAL_AVAILABILITY_HOLD: { category: 'ESTIMATE', severity: 'warning', icon: '📦', defaultCTA: 'RESOLVE_MATERIALS' },
};

/**
 * Feature flag key for startability system
 */
export const STARTABILITY_FEATURE_FLAG = 'estimates.startability_v1' as const;

/**
 * Default configuration values
 */
export const STARTABILITY_DEFAULTS = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  CACHE_TTL: 30, // 30 seconds
  MAX_BLOCKED_SAMPLES: 3,
  DEBOUNCE_DELAY: 800, // ms
} as const;