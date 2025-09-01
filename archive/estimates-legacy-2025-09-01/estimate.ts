export interface EstimateItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category?: string;
  parentId?: string | null;
  children?: EstimateItem[];
  optimistic?: number;
  pessimistic?: number;
  mostLikely?: number;
  pertEstimate?: number;
  standardDeviation?: number;
  type?: string;
  level?: number;
  order?: number;
}

export interface Estimate {
  id: string;
  projectId: string;
  number: string;
  name: string;
  description?: string;
  items: EstimateItem[];
  subtotal: number;
  discountRate?: number;
  taxRate?: number;
  total: number;
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const calculateEstimateTotal = (items: EstimateItem[]): number => {
  return items.reduce((sum, item) => {
    if (item.children && item.children.length > 0) {
      return sum + calculateEstimateTotal(item.children);
    }
    return sum + item.total;
  }, 0);
};
