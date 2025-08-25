export interface Contractor {
  id: string;
  name: string;
  type: 'supplier' | 'customer' | 'both';
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  inn?: string;
  kpp?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    bik?: string;
    correspondentAccount?: string;
  };
  notes?: string;
  questionsForClient?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Task {
  id: string;
  task: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  contractorId?: string;
  contractorName?: string;
  questions?: string;
  whatToBuy?: string;
  createdAt?: any;
  updatedAt?: any;
}
