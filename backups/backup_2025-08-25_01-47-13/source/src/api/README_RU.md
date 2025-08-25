# API функции для работы с данными

## estimateApi.ts
### API для работы с эстимейтами (сметами)

#### Типы данных

```typescript
// Типы элементов в эстимейте
export type EstimateItemType = 'section' | 'work' | 'material' | 'expense';
// section - Раздел для группировки
// work - Работы/услуги
// material - Материалы
// expense - Прочие расходы

// Методология оценки
export type EstimationMethod = 'single' | 'pert' | 'parametric';
// single - Единичная оценка
// pert - Оценка по трем точкам
// parametric - Параметрическая оценка

// Статус эстимейта
export type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'archived';
// draft - Черновик
// sent - Отправлено клиенту
// approved - Утверждено
// rejected - Отклонено
// archived - В архиве
```

#### Основные функции

```typescript
/**
 * Получить эстимейты проекта в реальном времени
 * @param userId - ID пользователя
 * @param projectId - ID проекта
 * @param callback - Функция обратного вызова для обновлений
 * @returns Функция отписки от обновлений
 */
export const getProjectEstimatesStream = (
  userId: string,
  projectId: string,
  callback: (estimates: Estimate[]) => void
): (() => void) => {
  // Создаем запрос к коллекции эстимейтов
  const q = query(
    collection(db, 'users', userId, 'estimates'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );
  
  // Подписываемся на изменения
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const estimates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Estimate[];
    callback(estimates);
  });
  
  return unsubscribe;
};

/**
 * Получить один эстимейт в реальном времени
 * @param userId - ID пользователя
 * @param estimateId - ID эстимейта
 * @param callback - Функция обратного вызова для обновлений
 * @returns Функция отписки от обновлений
 */
export const getEstimateStream = (
  userId: string,
  estimateId: string,
  callback: (estimate: Estimate | null) => void
): (() => void) => {
  const docRef = doc(db, 'users', userId, 'estimates', estimateId);
  
  const unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as Estimate);
    } else {
      callback(null);
    }
  });
  
  return unsubscribe;
};

/**
 * Создать новый эстимейт
 * @param userId - ID пользователя
 * @param estimate - Данные эстимейта
 * @returns ID созданного эстимейта
 */
export const createEstimate = async (
  userId: string,
  estimate: Omit<Estimate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    // Добавляем временные метки
    const estimateData = {
      ...estimate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: '1.0',
      status: 'draft' as EstimateStatus
    };
    
    // Создаем документ в Firestore
    const docRef = await addDoc(
      collection(db, 'users', userId, 'estimates'),
      estimateData
    );
    
    return docRef.id;
  } catch (error) {
    console.error('Ошибка при создании эстимейта:', error);
    throw error;
  }
};

/**
 * Обновить существующий эстимейт
 * @param userId - ID пользователя
 * @param estimateId - ID эстимейта
 * @param updates - Обновляемые поля
 */
export const updateEstimate = async (
  userId: string,
  estimateId: string,
  updates: Partial<Estimate>
): Promise<void> => {
  try {
    const docRef = doc(db, 'users', userId, 'estimates', estimateId);
    
    // Добавляем метку времени обновления
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Ошибка при обновлении эстимейта:', error);
    throw error;
  }
};

/**
 * Рассчитать PERT оценку
 * @param optimistic - Оптимистичная оценка
 * @param mostLikely - Наиболее вероятная оценка
 * @param pessimistic - Пессимистичная оценка
 * @returns Объект с рассчитанными значениями
 */
export const calculatePert = (
  optimistic: number,
  mostLikely: number,
  pessimistic: number
): {
  estimate: number;        // Рассчитанная оценка
  standardDeviation: number; // Стандартное отклонение
  variance: number;        // Дисперсия
} => {
  // Формула PERT: (O + 4M + P) / 6
  const estimate = (optimistic + 4 * mostLikely + pessimistic) / 6;
  
  // Стандартное отклонение: (P - O) / 6
  const standardDeviation = (pessimistic - optimistic) / 6;
  
  // Дисперсия: SD^2
  const variance = Math.pow(standardDeviation, 2);
  
  return {
    estimate: Math.round(estimate * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    variance: Math.round(variance * 100) / 100
  };
};

/**
 * Рассчитать итоги по эстимейту
 * @param estimate - Эстимейт для расчета
 * @returns Итоговая сумма
 */
export const calculateEstimateTotal = (estimate: Estimate): number => {
  // Суммируем все элементы верхнего уровня
  const subtotal = estimate.items
    .filter(item => !item.parentId) // Только элементы без родителя
    .reduce((sum, item) => sum + item.total, 0);
  
  let total = subtotal;
  
  // Применяем глобальную скидку
  if (estimate.discountRate) {
    if (estimate.discountType === 'percent') {
      total = total * (1 - estimate.discountRate / 100);
    } else {
      total = total - estimate.discountRate;
    }
  }
  
  // Применяем налог
  if (estimate.taxRate) {
    total = total * (1 + estimate.taxRate / 100);
  }
  
  return Math.round(total * 100) / 100;
};

/**
 * Создать версию эстимейта
 * @param userId - ID пользователя
 * @param estimateId - ID эстимейта
 * @param version - Данные версии
 */
export const createEstimateVersion = async (
  userId: string,
  estimateId: string,
  version: EstimateVersion
): Promise<void> => {
  try {
    // Сохраняем версию в подколлекцию versions
    await addDoc(
      collection(db, 'users', userId, 'estimates', estimateId, 'versions'),
      {
        ...version,
        createdAt: serverTimestamp()
      }
    );
    
    // Обновляем счетчик версий в основном документе
    const estimateRef = doc(db, 'users', userId, 'estimates', estimateId);
    await updateDoc(estimateRef, {
      versionCount: increment(1),
      currentVersion: version.version
    });
  } catch (error) {
    console.error('Ошибка при создании версии:', error);
    throw error;
  }
};

/**
 * Создать публичную ссылку для шаринга
 * @param userId - ID пользователя
 * @param estimateId - ID эстимейта
 * @returns URL публичной ссылки
 */
export const createShareLink = async (
  userId: string,
  estimateId: string
): Promise<string> => {
  try {
    // Генерируем уникальный токен
    const shareToken = `${estimateId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Сохраняем токен в документ эстимейта
    const estimateRef = doc(db, 'users', userId, 'estimates', estimateId);
    await updateDoc(estimateRef, {
      shareToken,
      shareCreatedAt: serverTimestamp(),
      shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней
    });
    
    // Возвращаем публичную ссылку
    return `${window.location.origin}/public/estimate/${shareToken}`;
  } catch (error) {
    console.error('Ошибка при создании ссылки для шаринга:', error);
    throw error;
  }
};
```

## productApi.ts
### API для работы с продуктами и складским учетом

```typescript
/**
 * Получить список продуктов в реальном времени
 * @param userId - ID пользователя
 * @param callback - Функция обратного вызова для обновлений
 * @returns Функция отписки от обновлений
 */
export const getProductsStream = (
  userId: string,
  callback: (products: Product[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'users', userId, 'products'),
    orderBy('name', 'asc')
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    callback(products);
  });
  
  return unsubscribe;
};

/**
 * Создать новый продукт
 * @param userId - ID пользователя
 * @param product - Данные продукта
 * @returns ID созданного продукта
 */
export const createProduct = async (
  userId: string,
  product: Omit<Product, 'id'>
): Promise<string> => {
  const docRef = await addDoc(
    collection(db, 'users', userId, 'products'),
    {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  );
  return docRef.id;
};

/**
 * Обновить количество продукта на складе
 * @param userId - ID пользователя
 * @param productId - ID продукта
 * @param quantityChange - Изменение количества (+ или -)
 */
export const updateProductQuantity = async (
  userId: string,
  productId: string,
  quantityChange: number
): Promise<void> => {
  const productRef = doc(db, 'users', userId, 'products', productId);
  
  // Используем транзакцию для атомарного обновления
  await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productRef);
    
    if (!productDoc.exists()) {
      throw new Error('Продукт не найден');
    }
    
    const currentQuantity = productDoc.data().quantity || 0;
    const newQuantity = currentQuantity + quantityChange;
    
    if (newQuantity < 0) {
      throw new Error('Недостаточно товара на складе');
    }
    
    transaction.update(productRef, {
      quantity: newQuantity,
      updatedAt: serverTimestamp()
    });
    
    // Записываем движение товара
    const movementRef = doc(collection(db, 'users', userId, 'productMovements'));
    transaction.set(movementRef, {
      productId,
      productName: productDoc.data().name,
      type: quantityChange > 0 ? 'income' : 'outcome',
      quantity: Math.abs(quantityChange),
      date: serverTimestamp(),
      balance: newQuantity
    });
  });
};
```

## invoiceApi.ts
### API для работы со счетами

```typescript
/**
 * Получить список счетов
 * @param userId - ID пользователя
 * @param filters - Фильтры для выборки
 * @param callback - Функция обратного вызова
 * @returns Функция отписки
 */
export const getInvoicesStream = (
  userId: string,
  filters: {
    status?: InvoiceStatus;
    clientId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
  callback: (invoices: Invoice[]) => void
): (() => void) => {
  let q = query(collection(db, 'users', userId, 'invoices'));
  
  // Применяем фильтры
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.clientId) {
    q = query(q, where('clientId', '==', filters.clientId));
  }
  if (filters.dateFrom) {
    q = query(q, where('date', '>=', filters.dateFrom));
  }
  if (filters.dateTo) {
    q = query(q, where('date', '<=', filters.dateTo));
  }
  
  q = query(q, orderBy('date', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Invoice[];
    callback(invoices);
  });
  
  return unsubscribe;
};

/**
 * Создать счет из эстимейта
 * @param userId - ID пользователя
 * @param estimateId - ID эстимейта
 * @returns ID созданного счета
 */
export const createInvoiceFromEstimate = async (
  userId: string,
  estimateId: string
): Promise<string> => {
  // Получаем данные эстимейта
  const estimateDoc = await getDoc(
    doc(db, 'users', userId, 'estimates', estimateId)
  );
  
  if (!estimateDoc.exists()) {
    throw new Error('Эстимейт не найден');
  }
  
  const estimate = estimateDoc.data() as Estimate;
  
  // Создаем счет на основе эстимейта
  const invoice: Omit<Invoice, 'id'> = {
    number: generateInvoiceNumber(), // Генерируем номер счета
    date: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    clientId: estimate.contractorId,
    clientName: estimate.contractorName,
    projectId: estimate.projectId,
    projectName: estimate.projectName,
    estimateId: estimateId,
    items: estimate.items.map(item => ({
      description: item.name,
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      amount: item.total
    })),
    subtotal: estimate.subtotal,
    tax: estimate.taxRate,
    taxAmount: estimate.taxAmount,
    discount: estimate.discountRate,
    discountAmount: estimate.discountAmount,
    total: estimate.total,
    status: 'draft',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  
  const docRef = await addDoc(
    collection(db, 'users', userId, 'invoices'),
    invoice
  );
  
  // Обновляем статус эстимейта
  await updateDoc(
    doc(db, 'users', userId, 'estimates', estimateId),
    {
      invoiceId: docRef.id,
      invoiceCreatedAt: serverTimestamp()
    }
  );
  
  return docRef.id;
};
```

## taskApi.ts
### API для работы с задачами

```typescript
/**
 * Получить задачи пользователя
 * @param userId - ID пользователя
 * @param filters - Фильтры задач
 * @param callback - Функция обратного вызова
 * @returns Функция отписки
 */
export const getTasksStream = (
  userId: string,
  filters: {
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    projectId?: string;
  },
  callback: (tasks: Task[]) => void
): (() => void) => {
  let q = query(collection(db, 'users', userId, 'tasks'));
  
  // Применяем фильтры
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.priority) {
    q = query(q, where('priority', '==', filters.priority));
  }
  if (filters.assignee) {
    q = query(q, where('assignee', '==', filters.assignee));
  }
  if (filters.projectId) {
    q = query(q, where('projectId', '==', filters.projectId));
  }
  
  q = query(q, orderBy('priority', 'desc'), orderBy('dueDate', 'asc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[];
    callback(tasks);
  });
  
  return unsubscribe;
};

/**
 * Обновить статус задачи
 * @param userId - ID пользователя
 * @param taskId - ID задачи
 * @param newStatus - Новый статус
 */
export const updateTaskStatus = async (
  userId: string,
  taskId: string,
  newStatus: TaskStatus
): Promise<void> => {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  
  const updates: any = {
    status: newStatus,
    updatedAt: serverTimestamp()
  };
  
  // Добавляем дополнительные поля в зависимости от статуса
  if (newStatus === 'completed') {
    updates.completedAt = serverTimestamp();
  } else if (newStatus === 'in_progress') {
    updates.startedAt = serverTimestamp();
  }
  
  await updateDoc(taskRef, updates);
};
```
