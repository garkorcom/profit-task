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

/**
 * Интерфейс товара/материала
 */
export interface Product {
  id: string;
  name: string;                    // Название товара
  sku?: string;                    // Артикул
  unit: string;                    // Единица измерения (шт, кг, м, л)
  category?: string;               // Категория товара
  minStock?: number;               // Минимальный остаток для уведомлений
  currentStock: number;            // Текущий остаток
  reservedStock?: number;          // Зарезервировано под задачи
  availableStock?: number;         // Доступно (currentStock - reservedStock)
  costPrice?: number;              // Себестоимость
  salePrice?: number;              // Цена продажи
  supplier?: string;               // Поставщик по умолчанию
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
  taskId?: string;                 // Связь с задачей
  taskName?: string;               // Название задачи
  contractorId?: string;           // Связь с контрагентом
  contractorName?: string;         // Имя контрагента
  document?: string;               // Документ-основание
  comment?: string;                // Комментарий к операции
  createdAt?: any;
  createdBy?: string;              // Кто выполнил операцию
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
 * Обновить товар
 */
export const updateProduct = async (userId: string, productId: string, updates: Partial<Product>) => {
  const productPath = `users/${userId}/products/${productId}`;
  
  await updateDoc(doc(db, productPath), {
    ...updates,
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
  comment?: string
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
  comment?: string
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
export const getCriticalStockProducts = (userId: string, callback: (products: Product[]) => void) => {
  const productsPath = `users/${userId}/products`;
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
        };
      })
      .filter(product => {
        const minStock = product.minStock || 0;
        const availableStock = product.availableStock || 0;
        return minStock > 0 && availableStock <= minStock;
      }) as Product[];
    
    callback(products);
  });
};