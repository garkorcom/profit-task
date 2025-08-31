import { db } from '../firebase/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { Estimate } from '../legacy/api/estimateApi';
import { writeOff, WriteOffLine } from './inventoryApi';
import { unreserveForEstimate } from './productApi';

export type ShipmentStatus = 'pending' | 'shipped' | 'completed' | 'cancelled';

export interface ShipmentLine {
  productId: string;
  productName: string;
  unit?: string;
  quantity: number; // ordered
  shippedQuantity?: number; // already shipped
}

export interface ShipmentOrder {
  id: string;
  estimateId: string;
  projectId: string;
  number?: string;
  status: ShipmentStatus;
  warehouseId: string;
  lines: ShipmentLine[];
  createdAt?: any;
  updatedAt?: any;
}

const shipmentsPath = (userId: string) => `users/${userId}/shipments`;

export const getShipmentOrdersStream = (userId: string, cb: (docs: ShipmentOrder[]) => void) => {
  const q = query(collection(db, shipmentsPath(userId)), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ShipmentOrder[];
    cb(data);
  });
};

export const createShipmentFromEstimate = async (
  userId: string,
  estimate: Estimate,
  warehouseId: string
) => {
  const lines: ShipmentLine[] = (estimate.items || [])
    .filter((i: any) => i.type === 'material' && i.productId)
    .map((i: any) => ({
      productId: i.productId!,
      productName: i.name,
      unit: i.materialUnit || i.unit,
      quantity: (i.materialQuantity || i.quantity || 0),
      shippedQuantity: 0
    }))
    .filter(l => l.quantity > 0);

  const ref = await addDoc(collection(db, shipmentsPath(userId)), {
    estimateId: estimate.id,
    projectId: estimate.projectId,
    number: `SH-${Date.now()}`,
    status: 'pending',
    warehouseId,
    lines,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  } as any);

  return ref.id;
};

export const updateShipmentStatus = async (
  userId: string,
  shipmentId: string,
  nextStatus: ShipmentStatus,
  options?: { estimateId?: string; estimateNumberOrName?: string }
) => {
  await updateDoc(doc(db, shipmentsPath(userId), shipmentId), {
    status: nextStatus,
    updatedAt: serverTimestamp()
  } as any);

  if (nextStatus === 'shipped' || nextStatus === 'completed') {
    // Load shipment snapshot via stream-less approach is omitted for brevity.
    // Expect caller to perform write-off using helper: performShipmentWriteOff
  }
};

export const performShipmentWriteOff = async (
  userId: string,
  shipment: ShipmentOrder,
  estimateId: string,
  estimateNumberOrName?: string
) => {
  // 1) Снятие резерва по смете
  for (const line of shipment.lines) {
    await unreserveForEstimate(userId, line.productId, line.quantity, estimateId, estimateNumberOrName);
  }
  // 2) Списание со склада
  const writeOffLines: WriteOffLine[] = shipment.lines.map(l => ({ productId: l.productId, quantity: l.quantity }));
  await writeOff(userId, shipment.warehouseId, writeOffLines, shipment.id);
};

export const getShipmentStream = (
  userId: string,
  shipmentId: string,
  cb: (shipment: ShipmentOrder | null) => void
) => {
  const ref = doc(db, shipmentsPath(userId), shipmentId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) { cb(null); return; }
    cb({ id: snap.id, ...(snap.data() as any) } as ShipmentOrder);
  });
};

export const shipLinesPartial = async (
  userId: string,
  shipment: ShipmentOrder,
  toShip: { productId: string; quantity: number }[],
  estimateNumberOrName?: string
) => {
  // Валидация: нельзя отгружать больше, чем осталось
  const map: Record<string, number> = {};
  toShip.forEach(i => { if (i.quantity > 0) map[i.productId] = (map[i.productId] || 0) + i.quantity; });
  const updatedLines: ShipmentLine[] = shipment.lines.map(l => ({ ...l }));

  const writeOffBatch: WriteOffLine[] = [];
  for (const line of updatedLines) {
    const req = map[line.productId] || 0;
    if (req <= 0) continue;
    const already = line.shippedQuantity || 0;
    const remain = Math.max(0, line.quantity - already);
    if (req > remain) {
      throw new Error(`Нельзя отгрузить больше остатка по позиции ${line.productName}. Осталось: ${remain}`);
    }
    const qty = Math.min(remain, req);
    if (qty <= 0) continue;
    await unreserveForEstimate(userId, line.productId, qty, shipment.estimateId, estimateNumberOrName || shipment.number);
    writeOffBatch.push({ productId: line.productId, quantity: qty });
    line.shippedQuantity = already + qty;
  }

  if (writeOffBatch.length > 0) {
    await writeOff(userId, shipment.warehouseId, writeOffBatch, shipment.id);
  }

  const allShipped = updatedLines.every(l => (l.shippedQuantity || 0) >= l.quantity);
  const nextStatus: ShipmentStatus = allShipped ? 'completed' : 'shipped';

  await updateDoc(doc(db, shipmentsPath(userId), shipment.id), {
    lines: updatedLines,
    status: nextStatus,
    updatedAt: serverTimestamp()
  } as any);

  return { nextStatus, updatedLines };
};

/**
 * Отмена отгрузки: вернуть резервы и снять статус
 */
export const cancelShipment = async (
  userId: string,
  shipment: ShipmentOrder,
  estimateNumberOrName?: string
) => {
  if (shipment.status === 'cancelled') return;
  // Вернуть резервы только по неотгруженным остаткам (если что-то уже отгружено — бизнес-правило может запретить отмену)
  const anyShipped = (shipment.lines || []).some(l => (l.shippedQuantity || 0) > 0);
  if (anyShipped) {
    throw new Error('Нельзя отменить отгрузку: есть уже отгруженные позиции. Используйте возврат/корректировку.');
  }
  for (const l of (shipment.lines || [])) {
    const qty = l.quantity; // весь объём
    await unreserveForEstimate(userId, l.productId, qty, shipment.estimateId, estimateNumberOrName || shipment.number);
  }
  await updateDoc(doc(db, shipmentsPath(userId), shipment.id), {
    status: 'cancelled',
    updatedAt: serverTimestamp()
  } as any);
};


