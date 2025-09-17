/**
 * Stream API для работы с V2 сметами - совместимость с EstimatesHub
 */

import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  QueryConstraint,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Estimate, EstimateFilters } from '../types/estimate.types';

/**
 * Подписка на список всех смет пользователя (совместимо с EstimatesHub)
 */
export const getEstimatesStream = (
  userId: string,
  projectId: string = '', // Для совместимости с старым API - игнорируем
  callback: (estimates: Estimate[]) => void,
  filters?: EstimateFilters
): (() => void) => {
  const constraints: QueryConstraint[] = [];
  
  // Apply filters if provided
  if (filters?.status && filters.status.length > 0) {
    constraints.push(where('status', 'in', filters.status));
  }
  
  if (filters?.projectId) {
    constraints.push(where('projectId', '==', filters.projectId));
  }
  
  if (filters?.counterpartyId) {
    constraints.push(where('counterpartyId', '==', filters.counterpartyId));
  }
  
  // Убираем сортировку для ускорения загрузки
  // Сортировку делаем на клиенте
  // constraints.push(orderBy('createdAt', 'desc'));
  
  // Create query
  const estimatesQuery = query(
    collection(db, `users/${userId}/estimates`),
    ...constraints
  );
  
  // Subscribe to changes
  const unsubscribe = onSnapshot(estimatesQuery, (snapshot) => {
    const estimates = snapshot.docs.map(doc => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        ...data,
      } as Estimate;
    });
    
    // Сортируем на клиенте для избежания индекса
    estimates.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // desc
    });
    
    // Apply client-side search filter if provided
    let filteredEstimates = estimates;
    if (filters?.searchQuery) {
      const search = filters.searchQuery.toLowerCase();
      filteredEstimates = estimates.filter(e => 
        e.number.toLowerCase().includes(search) ||
        (e.terms && e.terms.toLowerCase().includes(search))
      );
    }
    
    callback(filteredEstimates);
  }, (error) => {
    console.error('Error in estimates stream:', error);
    callback([]);
  });
  
  return unsubscribe;
};

/**
 * Совместимость с функциями из старого estimateApi
 */
export const generateEstimatePDF = async (userId: string, estimateId: string): Promise<string> => {
  // TODO: Implement PDF generation
  console.log('PDF generation for estimate:', estimateId);
  alert('Генерация PDF - функция в разработке');
  return 'placeholder-pdf-url';
};

export { deleteEstimate } from './estimateV2Api';