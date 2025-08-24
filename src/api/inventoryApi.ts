import { db } from '../firebase/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  increment
} from 'firebase/firestore';

export type InventoryTransactionType = 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'reservation' | 'unreservation';

export interface Warehouse {
  id: string;
  name: string;
  address?: string;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StockLevel {
  id: string; // `${productId}_${warehouseId}`
  productId: string;
  warehouseId: string;
  quantity: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  warehouseId: string;
  type: InventoryTransactionType;
  quantity: number; // positive for receipt/adjustment+, negative for issue/adjustment-
  documentId?: string;
  documentType?: string;
  comment?: string;
  createdAt?: any;
  createdBy?: string;
}

const warehousesPath = (userId: string) => `users/${userId}/warehouses`;
const stockLevelsPath = (userId: string) => `users/${userId}/stockLevels`;
const inventoryTransactionsPath = (userId: string) => `users/${userId}/inventoryTransactions`;

export const getWarehousesStream = (userId: string, cb: (warehouses: Warehouse[]) => void) => {
  const q = query(collection(db, warehousesPath(userId)), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Warehouse[];
    cb(data);
  });
};

export const addWarehouse = async (userId: string, w: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = await addDoc(collection(db, warehousesPath(userId)), {
    ...w,
    isActive: w.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  } as any);
  return ref.id;
};

export const updateWarehouse = async (userId: string, id: string, updates: Partial<Warehouse>) => {
  await updateDoc(doc(db, warehousesPath(userId), id), {
    ...updates,
    updatedAt: serverTimestamp()
  } as any);
};

export const deleteWarehouse = async (userId: string, id: string) => {
  // Note: consider preventing deletion if there are non-zero stock levels
  await updateDoc(doc(db, warehousesPath(userId), id), { isActive: false, updatedAt: serverTimestamp() } as any);
};

const stockLevelDocId = (productId: string, warehouseId: string) => `${productId}__${warehouseId}`;

export const getStockLevelsStream = (
  userId: string,
  cb: (levels: StockLevel[]) => void,
  filter?: { productId?: string; warehouseId?: string }
) => {
  const base = collection(db, stockLevelsPath(userId));
  let qRef = query(base);
  if (filter?.productId) {
    qRef = query(base, where('productId', '==', filter.productId));
  }
  if (filter?.warehouseId) {
    qRef = query(base, where('warehouseId', '==', filter.warehouseId));
  }
  return onSnapshot(qRef, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as StockLevel[];
    cb(data);
  });
};

export const getInventoryTransactionsStream = (
  userId: string,
  cb: (tx: InventoryTransaction[]) => void,
  filter?: { productId?: string; warehouseId?: string }
) => {
  const base = collection(db, inventoryTransactionsPath(userId));
  let qRef = query(base, orderBy('createdAt', 'desc'));
  if (filter?.productId) {
    qRef = query(base, where('productId', '==', filter.productId), orderBy('createdAt', 'desc'));
  }
  if (filter?.warehouseId) {
    qRef = query(base, where('warehouseId', '==', filter.warehouseId), orderBy('createdAt', 'desc'));
  }
  return onSnapshot(qRef, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as InventoryTransaction[];
    cb(data);
  });
};

/**
 * Adjust stock level by quantityDelta at a given warehouse and product, atomically.
 * Also writes an inventory transaction and updates aggregated product.currentStock.
 */
export const adjustStockLevel = async (
  userId: string,
  productId: string,
  warehouseId: string,
  quantityDelta: number,
  options?: { type?: InventoryTransactionType; documentId?: string; documentType?: string; comment?: string }
) => {
  const levelId = stockLevelDocId(productId, warehouseId);
  const levelRef = doc(db, stockLevelsPath(userId), levelId);
  const productRef = doc(db, `users/${userId}/products/${productId}`);

  await runTransaction(db, async (tx) => {
    const levelSnap = await tx.get(levelRef);
    const now = serverTimestamp();

    if (levelSnap.exists()) {
      tx.update(levelRef, {
        quantity: increment(quantityDelta),
        updatedAt: now
      } as any);
    } else {
      tx.set(levelRef, {
        id: levelId,
        productId,
        warehouseId,
        quantity: Math.max(0, quantityDelta),
        createdAt: now,
        updatedAt: now
      } as any);
    }

    // Update aggregated product stock
    tx.update(productRef, {
      currentStock: increment(quantityDelta),
      updatedAt: now
    } as any);

    // Write transaction record
    const txRef = doc(collection(db, inventoryTransactionsPath(userId)));
    tx.set(txRef, {
      id: txRef.id,
      productId,
      warehouseId,
      type: options?.type || (quantityDelta >= 0 ? 'receipt' : 'issue'),
      quantity: quantityDelta,
      documentId: options?.documentId,
      documentType: options?.documentType,
      comment: options?.comment,
      createdAt: now
    } as any);
  });
};

export interface GoodsReceiptLine { productId: string; quantity: number; comment?: string }
export const goodsReceipt = async (
  userId: string,
  warehouseId: string,
  lines: GoodsReceiptLine[],
  documentId?: string
) => {
  for (const line of lines) {
    await adjustStockLevel(userId, line.productId, warehouseId, line.quantity, {
      type: 'receipt',
      documentId,
      documentType: 'GoodsReceipt',
      comment: line.comment
    });
  }
};

export interface WriteOffLine { productId: string; quantity: number; comment?: string }
export const writeOff = async (
  userId: string,
  warehouseId: string,
  lines: WriteOffLine[],
  documentId?: string
) => {
  for (const line of lines) {
    // Validate available stock on this warehouse
    const levelId = stockLevelDocId(line.productId, warehouseId);
    const levelSnap = await getDoc(doc(db, stockLevelsPath(userId), levelId));
    const currentQty = (levelSnap.data() as any)?.quantity || 0;
    if (currentQty < line.quantity) {
      throw new Error(`Недостаточно остатка на складе для товара ${line.productId}. Доступно: ${currentQty}`);
    }
    await adjustStockLevel(userId, line.productId, warehouseId, -Math.abs(line.quantity), {
      type: 'issue',
      documentId,
      documentType: 'WriteOff',
      comment: line.comment
    });
  }
};


