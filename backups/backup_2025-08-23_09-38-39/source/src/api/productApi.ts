/**
 * API для управления товарами и складскими остатками
 * Обеспечивает CRUD операции для товаров и учёт движений
 */

import { db } from '../firebase/firebase';
import { 
  collection, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy,
  where,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';

// ============= ТИПЫ ДАННЫХ =============

export interface ProductComponent {
  productId: string; // ID компонента (товара или услуги)
  name: string;      // Название для быстрого отображения
  quantity: number;
  unit: string;
}

export interface Product {
  id: string;
  type: 'product' | 'service';       // Тип: Товар или Услуга
  name: string;                    // Название
  sku?: string;                    // Артикул
  unit: string;                    // Единица измерения
  category?: string;               // Категория
  
  // Поля для услуг
  components?: ProductComponent[]; // Состав услуги

  // Поля для товаров
  minStock?: number;               // Минимальный остаток
  currentStock: number;            // Текущий остаток
  reservedStock?: number;          // В резерве
  availableStock?: number;         // Доступно

  // Финансовые поля
  costPrice?: number;              // Себестоимость (для товаров - вводится, для услуг - рассчитывается)
  salePrice?: number;              // Цена продажи
  
  supplier?: string;               // Поставщик
  description?: string;            // Описание
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Типы движений товара
 */
export type MovementType = 'income' | 'expense' | 'reserve' | 'unreserve' | 'transfer';

/**
 * Интерфейс движения товара
 */
export interface StockMovement {
  id: string;
  productId: string;               // ID товара
  productName: string;             // Название товара (для быстрого отображения)
  type: MovementType;              // Тип движения
  quantity: number;                // Количество (положительное для прихода, отрицательное для расхода)
  previousStock: number;           // Остаток до операции
  newStock: number;                // Остаток после операции
  warehouseId?: string;            // Склад (необязательно, пока учет суммарный)
  warehouseName?: string;
  taskId?: string;                 // Связь с задачей
  taskName?: string;               // Название задачи
  contractorId?: string;           // Связь с контрагентом
  contractorName?: string;         // Имя контрагента
  document?: string;               // Документ-основание
  comment?: string;                // Комментарий к операции
  createdAt?: any;
  createdBy?: string;              // Кто выполнил операцию
}

// ============= ДОКУМЕНТЫ СКЛАДА =============

export type StockDocumentStatus = 'draft' | 'posted';
export type StockDocumentType = 'income' | 'expense';

export interface StockDocumentLine {
  productId: string;
  productName: string;
  quantity: number; // >0, знак определяется типом документа
  unit?: string;
  price?: number;
  amount?: number; // quantity * price
  note?: string;
}

export interface StockDocument {
  id: string;
  number?: string;
  date?: string;
  type: StockDocumentType;    // приход или расход
  status: StockDocumentStatus; // черновик или проведён
  warehouseId?: string;
  warehouseName?: string;
  responsibleId?: string;
  responsibleName?: string;
  reasonId?: string;
  reasonName?: string;
  requiresJustification?: boolean;
  justification?: string; // обоснование
  lines: StockDocumentLine[];
  comment?: string;
  createdAt?: any;
  createdBy?: string;
  postedAt?: any;
  postedBy?: string;
}

// ============= CRUD ОПЕРАЦИИ ДЛЯ ТОВАРОВ =============

/**
 * Получить поток товаров в реальном времени
 */
export const getProductsStream = (userId: string, callback: (products: Product[]) => void) => {
  const productsPath = `users/${userId}/products`;
  const q = query(collection(db, productsPath), orderBy('name'));
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      // Вычисляем доступный остаток
      const availableStock = data.currentStock - (data.reservedStock || 0);
      return { 
        id: doc.id, 
        ...data,
        availableStock 
      };
    }) as Product[];
    callback(products);
  });
};

/**
 * Добавить новый товар
 */
export const addProduct = async (userId: string, product: Omit<Product, 'id'>) => {
  const productsPath = `users/${userId}/products`;
  
  const newProduct = {
    ...product,
    currentStock: product.currentStock || 0,
    reservedStock: 0,
    availableStock: product.currentStock || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, productsPath), newProduct);
  
  // Создаём запись о начальном остатке, если он есть
  if (product.currentStock && product.currentStock > 0) {
    await addStockMovement(userId, {
      productId: docRef.id,
      productName: product.name,
      type: 'income',
      quantity: product.currentStock,
      previousStock: 0,
      newStock: product.currentStock,
      document: 'Начальный остаток',
      comment: 'Создание товара с начальным остатком'
    });
  }
  
  return docRef.id;
};

/**
 * Рассчитать себестоимость услуги на основе её компонентов
 * @param service - Объект услуги (обязательно с полем `components`)
 * @param allProducts - Массив всех товаров и услуг для поиска цен компонентов
 * @returns - Рассчитанная себестоимость
 */
export const calculateServiceCostPrice = (service: Product, allProducts: Product[]): number => {
  if (service.type !== 'service' || !service.components) {
    return service.costPrice || 0;
  }

  const productMap = new Map(allProducts.map(p => [p.id, p]));
  let totalCost = 0;

  for (const component of service.components) {
    const componentProduct = productMap.get(component.productId);
    if (componentProduct) {
      // Если компонент - тоже услуга, его себестоимость должна быть уже рассчитана или равна 0
      const componentCost = componentProduct.costPrice || 0;
      totalCost += componentCost * component.quantity;
    }
  }
  return totalCost;
};


/**
 * Обновить товар. Если это услуга, можно пересчитать её себестоимость.
 */
export const updateProduct = async (userId: string, productId: string, updates: Partial<Product>, recalculateCostPrice?: boolean, allProducts?: Product[]) => {
  const productPath = `users/${userId}/products/${productId}`;
  
  let finalUpdates = { ...updates };

  if (recalculateCostPrice && updates.type === 'service' && allProducts) {
    const serviceWithNewComponents = { ...updates } as Product;
    finalUpdates.costPrice = calculateServiceCostPrice(serviceWithNewComponents, allProducts);
  }

  await updateDoc(doc(db, productPath), {
    ...finalUpdates,
    updatedAt: serverTimestamp()
  });
};

/**
 * Удалить товар
 */
export const deleteProduct = async (userId: string, productId: string) => {
  const productPath = `users/${userId}/products/${productId}`;
  await deleteDoc(doc(db, productPath));
};

// ============= ОПЕРАЦИИ С ОСТАТКАМИ =============

/**
 * Добавить запись о движении товара
 */
export const addStockMovement = async (
  userId: string, 
  movement: Omit<StockMovement, 'id' | 'createdAt'>
) => {
  const movementsPath = `users/${userId}/stockMovements`;
  
  await addDoc(collection(db, movementsPath), {
    ...movement,
    createdAt: serverTimestamp()
  });
};

/**
 * Приход товара
 */
export const addStock = async (
  userId: string,
  productId: string,
  quantity: number,
  document?: string,
  comment?: string,
  warehouseId?: string,
  warehouseName?: string
) => {
  return runTransaction(db, async (transaction) => {
    const productRef = doc(db, `users/${userId}/products/${productId}`);
    const productSnap = await transaction.get(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Товар не найден');
    }
    
    const productData = productSnap.data() as Product;
    const previousStock = productData.currentStock || 0;
    const newStock = previousStock + quantity;
    
    // Обновляем остаток товара
    transaction.update(productRef, {
      currentStock: increment(quantity),
      updatedAt: serverTimestamp()
    });
    
    // Создаём запись о движении
    const movementsPath = `users/${userId}/stockMovements`;
    const movementRef = doc(collection(db, movementsPath));
    
    transaction.set(movementRef, {
      productId,
      productName: productData.name,
      type: 'income',
      quantity,
      previousStock,
      newStock,
      warehouseId,
      warehouseName,
      document,
      comment,
      createdAt: serverTimestamp()
    });
  });
};

/**
 * Расход товара
 */
export const removeStock = async (
  userId: string,
  productId: string,
  quantity: number,
  taskId?: string,
  taskName?: string,
  contractorId?: string,
  contractorName?: string,
  comment?: string,
  warehouseId?: string,
  warehouseName?: string,
  document?: string
) => {
  return runTransaction(db, async (transaction) => {
    const productRef = doc(db, `users/${userId}/products/${productId}`);
    const productSnap = await transaction.get(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Товар не найден');
    }
    
    const productData = productSnap.data() as Product;
    const previousStock = productData.currentStock || 0;
    const availableStock = previousStock - (productData.reservedStock || 0);
    
    if (availableStock < quantity) {
      throw new Error(`Недостаточно товара. Доступно: ${availableStock}`);
    }
    
    const newStock = previousStock - quantity;
    
    // Обновляем остаток товара
    transaction.update(productRef, {
      currentStock: increment(-quantity),
      updatedAt: serverTimestamp()
    });
    
    // Создаём запись о движении
    const movementsPath = `users/${userId}/stockMovements`;
    const movementRef = doc(collection(db, movementsPath));
    
    transaction.set(movementRef, {
      productId,
      productName: productData.name,
      type: 'expense',
      quantity: -quantity,
      previousStock,
      newStock,
      taskId,
      taskName,
      contractorId,
      contractorName,
      warehouseId,
      warehouseName,
      document,
      comment,
      createdAt: serverTimestamp()
    });
  });
};

/**
 * Резервировать товар под задачу
 */
export const reserveStock = async (
  userId: string,
  productId: string,
  quantity: number,
  taskId: string,
  taskName: string
) => {
  return runTransaction(db, async (transaction) => {
    const productRef = doc(db, `users/${userId}/products/${productId}`);
    const productSnap = await transaction.get(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Товар не найден');
    }
    
    const productData = productSnap.data() as Product;
    const currentStock = productData.currentStock || 0;
    const reservedStock = productData.reservedStock || 0;
    const availableStock = currentStock - reservedStock;
    
    if (availableStock < quantity) {
      throw new Error(`Недостаточно товара для резервирования. Доступно: ${availableStock}`);
    }
    
    // Обновляем резерв товара
    transaction.update(productRef, {
      reservedStock: increment(quantity),
      updatedAt: serverTimestamp()
    });
    
    // Создаём запись о резервировании
    const movementsPath = `users/${userId}/stockMovements`;
    const movementRef = doc(collection(db, movementsPath));
    
    transaction.set(movementRef, {
      productId,
      productName: productData.name,
      type: 'reserve',
      quantity,
      previousStock: currentStock,
      newStock: currentStock, // Остаток не меняется, только резерв
      taskId,
      taskName,
      comment: `Резервирование под задачу: ${taskName}`,
      createdAt: serverTimestamp()
    });
  });
};

/**
 * Снять резерв с товара
 */
export const unreserveStock = async (
  userId: string,
  productId: string,
  quantity: number,
  taskId: string,
  taskName: string
) => {
  return runTransaction(db, async (transaction) => {
    const productRef = doc(db, `users/${userId}/products/${productId}`);
    const productSnap = await transaction.get(productRef);
    
    if (!productSnap.exists()) {
      throw new Error('Товар не найден');
    }
    
    const productData = productSnap.data() as Product;
    
    // Обновляем резерв товара
    transaction.update(productRef, {
      reservedStock: increment(-quantity),
      updatedAt: serverTimestamp()
    });
    
    // Создаём запись о снятии резерва
    const movementsPath = `users/${userId}/stockMovements`;
    const movementRef = doc(collection(db, movementsPath));
    
    transaction.set(movementRef, {
      productId,
      productName: productData.name,
      type: 'unreserve',
      quantity: -quantity,
      previousStock: productData.currentStock,
      newStock: productData.currentStock,
      taskId,
      taskName,
      comment: `Снятие резерва с задачи: ${taskName}`,
      createdAt: serverTimestamp()
    });
  });
};

/**
 * Получить историю движений товара
 */
export const getStockMovementsStream = (
  userId: string,
  productId?: string,
  callback?: (movements: StockMovement[]) => void
) => {
  const movementsPath = `users/${userId}/stockMovements`;
  
  let q;
  if (productId) {
    q = query(
      collection(db, movementsPath),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );
  } else {
    q = query(collection(db, movementsPath), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (snapshot) => {
    const movements = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })) as StockMovement[];
    
    if (callback) {
      callback(movements);
    }
  });
};

/**
 * Получить товары с критическими остатками
 */
export const getCriticalStockProducts = (userId: string, callback: (products: Product[]) => void, limitCount: number = 10) => {
  const productsPath = `users/${userId}/products`;
  // Читаем быстро: по имени или категории не сортируем; можно добавить orderBy('name') при наличии индекса
  const q = query(collection(db, productsPath));
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const availableStock = data.currentStock - (data.reservedStock || 0);
        return { 
          id: doc.id, 
          ...data,
          availableStock 
        } as Product;
      })
      .filter(product => {
        const minStock = product.minStock || 0;
        const availableStock = product.availableStock || 0;
        return minStock > 0 && availableStock <= minStock;
      })
      .slice(0, Math.max(1, limitCount));
    
    callback(products);
  });
};

/**
 * Поток документов склада
 */
export const getStockDocumentsStream = (userId: string, callback: (docs: StockDocument[]) => void) => {
  const path = `users/${userId}/stockDocuments`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as StockDocument[];
    callback(docs);
  });
};

/**
 * Создать документ склада (черновик)
 */
export const addStockDocument = async (userId: string, docData: Omit<StockDocument, 'id' | 'status' | 'createdAt' | 'postedAt'>) => {
  const path = `users/${userId}/stockDocuments`;
  const payload = {
    ...docData,
    status: 'draft' as StockDocumentStatus,
    createdAt: serverTimestamp()
  };
  const ref = await addDoc(collection(db, path), payload);
  return ref.id;
};

/**
 * Обновить документ (только в статусе draft)
 */
export const updateStockDocument = async (userId: string, docId: string, updates: Partial<StockDocument>) => {
  const path = `users/${userId}/stockDocuments/${docId}`;
  await updateDoc(doc(db, path), updates as any);
};

/**
 * Провести документ: применить движения по всем строкам и установить статус posted
 */
export const postStockDocument = async (
  userId: string,
  docId: string,
  currentUserName?: string
) => {
  // Читаем документ
  const docRef = doc(db, `users/${userId}/stockDocuments/${docId}`);
  const snap = await (await import('firebase/firestore')).getDoc(docRef);
  if (!snap.exists()) throw new Error('Документ не найден');
  const data = snap.data() as StockDocument;
  if (data.status === 'posted') return; // уже проведён

  // Применяем строки по одной
  for (const line of data.lines || []) {
    if (!line.productId || !line.quantity || line.quantity <= 0) continue;
    if (data.type === 'income') {
      await addStock(userId, line.productId, line.quantity, `Документ ${docId}`, data.comment);
    } else if (data.type === 'expense') {
      await removeStock(userId, line.productId, line.quantity, undefined, undefined, undefined, undefined, `Документ ${docId}`);
    }
  }

  // Обновляем статус документа
  await updateDoc(docRef, {
    status: 'posted',
    postedAt: serverTimestamp(),
    postedBy: currentUserName || userId
  } as any);
};

/**
 * Удалить документ (только черновик)
 */
export const deleteStockDocument = async (userId: string, docId: string) => {
  const ref = doc(db, `users/${userId}/stockDocuments/${docId}`);
  await deleteDoc(ref);
};