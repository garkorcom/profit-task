import { collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export type NotificationChannel = 'email' | 'telegram' | 'whatsapp' | 'system';
export type NotificationType = 'task' | 'document' | 'reminder' | 'system';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationAttachment {
  type: 'document' | 'image' | 'file';
  name: string;
  url: string;
  size?: number;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'command';
  action: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationMetadata {
  taskId?: string;
  taskName?: string;
  projectId?: string;
  projectName?: string;
  deadline?: string;
  priority?: string;
  documentId?: string;
  documentType?: 'estimate' | 'invoice' | 'contract';
  documentNumber?: string;
  actions?: NotificationAction[];
  trackingId?: string;
  templateId?: string;
}

export interface Notification {
  id?: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientType: 'employee' | 'contractor' | 'contact';
  recipientName?: string;
  recipientContact?: string;
  subject?: string;
  message: string;
  attachments?: NotificationAttachment[];
  metadata?: NotificationMetadata;
  status: NotificationStatus;
  sentAt?: any;
  deliveredAt?: any;
  readAt?: any;
  error?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DocumentSendLog {
  id?: string;
  documentId: string;
  documentType: 'estimate' | 'invoice' | 'contract';
  documentNumber?: string;
  recipientId: string;
  recipientName: string;
  recipientContact: string;
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'failed';
  message?: string;
  error?: string;
  sentBy: string;
  sentByName: string;
  sentAt?: any;
  deliveredAt?: any;
}

export interface MessengerIntegration {
  id?: string;
  channel: 'telegram' | 'whatsapp';
  isActive: boolean;
  telegramBotToken?: string;
  telegramBotUsername?: string;
  telegramWebhookUrl?: string;
  whatsappApiUrl?: string;
  whatsappApiKey?: string;
  whatsappPhoneId?: string;
  whatsappBusinessId?: string;
  defaultTemplates?: Record<NotificationType, string>;
  rateLimits?: { perMinute?: number; perHour?: number; perDay?: number };
  createdAt?: any;
  updatedAt?: any;
}

export const sendNotification = async (
  ownerUid: string,
  notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const notificationsRef = collection(db, 'users', ownerUid, 'notifications');
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getNotificationsStream = (
  ownerUid: string,
  filters: { recipientId?: string; type?: NotificationType; channel?: NotificationChannel; status?: NotificationStatus },
  callback: (notifications: Notification[]) => void
) => {
  let q = query(collection(db, 'users', ownerUid, 'notifications'), orderBy('createdAt', 'desc'));
  if (filters.recipientId) q = query(q, where('recipientId', '==', filters.recipientId));
  if (filters.type) q = query(q, where('type', '==', filters.type));
  if (filters.channel) q = query(q, where('channel', '==', filters.channel));
  if (filters.status) q = query(q, where('status', '==', filters.status));
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
    callback(list);
  });
};

export const updateNotificationStatus = async (
  ownerUid: string,
  notificationId: string,
  status: NotificationStatus,
  error?: string
) => {
  const ref = doc(db, 'users', ownerUid, 'notifications', notificationId);
  const updates: any = { status, updatedAt: serverTimestamp() };
  if (status === 'sent') updates.sentAt = serverTimestamp();
  if (status === 'delivered') updates.deliveredAt = serverTimestamp();
  if (status === 'read') updates.readAt = serverTimestamp();
  if (status === 'failed' && error) updates.error = error;
  await updateDoc(ref, updates);
};

export const logDocumentSend = async (
  ownerUid: string,
  log: Omit<DocumentSendLog, 'id' | 'sentAt'>
): Promise<string> => {
  const ref = await addDoc(collection(db, 'users', ownerUid, 'documentSendLogs'), { ...log, sentAt: serverTimestamp() });
  return ref.id;
};

export const getDocumentSendLogs = async (ownerUid: string, documentId: string): Promise<DocumentSendLog[]> => {
  const q = query(
    collection(db, 'users', ownerUid, 'documentSendLogs'),
    where('documentId', '==', documentId),
    orderBy('sentAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentSendLog));
};

export const getNotificationTemplates = async (
  ownerUid: string,
  type?: NotificationType,
  channel?: NotificationChannel
) => {
  let q = query(collection(db, 'users', ownerUid, 'notificationTemplates'), where('isActive', '==', true));
  if (type) q = query(q, where('type', '==', type));
  if (channel) q = query(q, where('channel', '==', channel));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const saveMessengerIntegration = async (
  ownerUid: string,
  integration: Omit<MessengerIntegration, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const ref = doc(db, 'users', ownerUid, 'messengerIntegrations', integration.channel);
  await updateDoc(ref, { ...integration, updatedAt: serverTimestamp() } as any);
};

export const getMessengerIntegration = async (
  ownerUid: string,
  channel: 'telegram' | 'whatsapp'
): Promise<MessengerIntegration | null> => {
  const ref = doc(db, 'users', ownerUid, 'messengerIntegrations', channel);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as MessengerIntegration;
};

export const formatMessage = (template: string, variables: Record<string, any>): string => {
  let message = template;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    message = message.replace(regex, variables[key] ?? '');
  });
  return message;
};

export const createTelegramActions = (taskId: string, status: string): NotificationAction[] => {
  const actions: NotificationAction[] = [];
  if (status === 'assigned' || status === 'pending') {
    actions.push({ id: 'accept', label: '✅ Принять в работу', type: 'button', action: `task_accept_${taskId}`, style: 'primary' });
  }
  if (status === 'in_progress') {
    actions.push({ id: 'start_timer', label: '▶️ Начать выполнение', type: 'button', action: `task_start_${taskId}`, style: 'primary' });
    actions.push({ id: 'complete', label: '✔️ Завершить', type: 'button', action: `task_complete_${taskId}`, style: 'secondary' });
  }
  actions.push({ id: 'comment', label: '💬 Комментарий', type: 'button', action: `task_comment_${taskId}`, style: 'secondary' });
  actions.push({ id: 'photo', label: '📷 Добавить фото', type: 'button', action: `task_photo_${taskId}`, style: 'secondary' });
  return actions;
};


