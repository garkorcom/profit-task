import { db } from '../firebase/firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { Estimate, EstimateItem } from './estimateApi';
import { writeOff, WriteOffLine } from './inventoryApi';
import { unreserveForEstimate } from './productApi';

export type ShipmentStatus = 'pending' | 'shipped' | 'completed' | 'cancelled';

export interface ShipmentLine {
  productId: string;
  productName: string;
  unit?: string;
  quantity: number;
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
    .filter((i: EstimateItem) => i.type === 'material' && i.productId)
    .map((i: EstimateItem) => ({
      productId: i.productId!,
      productName: i.name,
      unit: i.materialUnit || i.unit,
      quantity: (i.materialQuantity || i.quantity || 0)
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


