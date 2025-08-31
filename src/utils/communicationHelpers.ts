/**
 * Вспомогательные функции для блока коммуникации
 */

import { CommunicationChannel, EstimateStatus } from '../types/estimate.types';

// Шаблоны сообщений по умолчанию
export const DEFAULT_MESSAGE_TEMPLATES = [
  'Добрый день! Высылаю смету на рассмотрение. Ознакомьтесь, пожалуйста, и дайте обратную связь.',
  'Смета готова! Переходите по ссылке для просмотра и согласования.',
  'Обновил смету с учетом ваших пожеланий. Посмотрите, пожалуйста, изменения.',
  'Спасибо за подтверждение! Переходим к выполнению работ согласно смете.',
  'Напоминаю о смете, которая ожидает вашего рассмотрения.'
];

// Генерация сообщения по статусу
export const generateStatusMessage = (
  status: EstimateStatus,
  estimateNumber: string,
  clientName?: string
): string => {
  const greeting = clientName ? `Добрый день, ${clientName}!` : 'Добрый день!';
  
  const messages = {
    'sent': `${greeting} Высылаю смету ${estimateNumber} на рассмотрение. Ознакомьтесь, пожалуйста, и дайте обратную связь.`,
    'viewed': `${greeting} Вижу, что вы ознакомились со сметой ${estimateNumber}. Готов ответить на любые вопросы.`,
    'negotiation': `${greeting} Обсуждаем детали сметы ${estimateNumber}. Готов внести корректировки по вашим пожеланиям.`,
    'accepted': `${greeting} Спасибо за подтверждение сметы ${estimateNumber}! Переходим к выполнению работ.`,
    'rejected': `${greeting} Понял ваше решение по смете ${estimateNumber}. Готов подготовить новый вариант, если потребуется.`,
    'expired': `${greeting} Срок действия сметы ${estimateNumber} истек. Если проект актуален, могу подготовить обновленную версию.`
  };

  return messages[status as keyof typeof messages] || `Обновление по смете ${estimateNumber}`;
};

// Форматирование каналов связи для отображения
export const formatCommunicationChannel = (channel: CommunicationChannel): string => {
  const channels = {
    email: 'Email',
    link: 'Прямая ссылка',
    whatsapp: 'WhatsApp',
    sms: 'SMS'
  };
  return channels[channel];
};

// Генерация ссылок для разных каналов
export const generateChannelLink = (
  channel: CommunicationChannel,
  estimateUrl: string,
  message: string,
  phone?: string,
  email?: string
): string => {
  switch (channel) {
    case 'email':
      const subject = encodeURIComponent('Смета на рассмотрение');
      const body = encodeURIComponent(`${message}\n\nСсылка на смету: ${estimateUrl}`);
      return `mailto:${email || ''}?subject=${subject}&body=${body}`;
      
    case 'whatsapp':
      const whatsappMessage = encodeURIComponent(`${message}\n\n${estimateUrl}`);
      return phone 
        ? `https://wa.me/${phone.replace(/[^\d]/g, '')}?text=${whatsappMessage}`
        : `https://wa.me/?text=${whatsappMessage}`;
        
    case 'sms':
      const smsMessage = encodeURIComponent(`${message} ${estimateUrl}`);
      return phone
        ? `sms:${phone}?body=${smsMessage}`
        : `sms:?body=${smsMessage}`;
        
    case 'link':
    default:
      return estimateUrl;
  }
};

// Валидация платежной ссылки
export const validatePaymentLink = (url: string): boolean => {
  if (!url.trim()) return true; // Пустая ссылка валидна (опциональное поле)
  
  try {
    const parsedUrl = new URL(url);
    // Проверяем популярные платежные системы
    const validDomains = [
      'stripe.com',
      'paypal.com', 
      'paypal.me',
      'square.com',
      'checkout.com',
      'razorpay.com',
      'payments.yandex.ru',
      'money.yandex.ru',
      'sber.ru',
      'tinkoff.ru'
    ];
    
    return validDomains.some(domain => parsedUrl.hostname.includes(domain)) ||
           parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

// Получение рекомендаций по настройке коммуникации
export const getCommunicationRecommendations = (
  clientPortalEnabled: boolean,
  allowNegotiation: boolean,
  primaryChannel: CommunicationChannel
): string[] => {
  const recommendations: string[] = [];

  if (!clientPortalEnabled) {
    recommendations.push('💡 Включите портал клиента для удобного онлайн взаимодействия');
  }

  if (clientPortalEnabled && !allowNegotiation) {
    recommendations.push('💡 Разрешите согласование изменений для гибкого процесса обсуждения');
  }

  if (primaryChannel === 'email') {
    recommendations.push('📧 Email - надежный канал, но рассмотрите WhatsApp для быстрой связи');
  }

  if (primaryChannel === 'sms') {
    recommendations.push('📱 SMS хорош для уведомлений, но для смет лучше использовать Email или прямые ссылки');
  }

  return recommendations;
};

// Статистика использования каналов
export const getChannelUsageStats = () => {
  // В реальном приложении это будет загружаться из аналитики
  return {
    email: { usage: 65, effectiveness: 'Высокая' },
    link: { usage: 25, effectiveness: 'Средняя' },
    whatsapp: { usage: 8, effectiveness: 'Высокая' },
    sms: { usage: 2, effectiveness: 'Низкая' }
  };
};