/**
 * Legacy estimate types for backward compatibility
 */

export interface Estimate {
  id: string;
  number?: string;
  name?: string;
  status: string;
  projectId?: string;
  counterpartyId?: string;
  currency: string;
  items?: EstimateItem[];
  subtotal?: number;
  total?: number;
  discountRate?: number;
  taxRate?: number;
  totals?: {
    subtotal: number;
    tax: number;
    total: number;
  };
  customFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateItem {
  id: string;
  name: string;
  description?: string;
  type: 'service' | 'material' | 'equipment';
  level?: number;
  order?: number;
  qty: number;
  quantity?: number; // legacy alias
  rate?: number;
  unitPrice?: number;
  unitCost?: number;
  lineTotal: number;
  total?: number; // legacy alias
  materialQuantity?: number;
  productId?: string;
  parentId?: string;
  children?: EstimateItem[];
}