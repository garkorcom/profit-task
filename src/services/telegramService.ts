import { NotificationAction } from '../api/notificationApi';
import { storage } from '../firebase/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: { id: number; type: string };
  date: number;
  text?: string;
  photo?: Array<{ file_id: string; file_unique_id: string; file_size: number; width: number; height: number }>;
  document?: { file_id: string; file_unique_id: string; file_name?: string; mime_type?: string; file_size?: number };
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export class TelegramService {
  private botToken: string;
  private apiUrl: string;
  private ownerUid: string;
  private activeCommands: Map<number, string> = new Map();

  constructor(botToken: string, ownerUid: string) {
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
    this.ownerUid = ownerUid;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options?: { parse_mode?: 'HTML' | 'Markdown'; reply_markup?: any; disable_notification?: boolean }
  ) {
    const response = await fetch(`${this.apiUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...options }),
    });
    return response.json();
  }

  async sendDocument(chatId: number | string, documentUrl: string, caption?: string, filename?: string) {
    const formData = new FormData();
    formData.append('chat_id', String(chatId));
    const response = await fetch(documentUrl);
    const blob = await response.blob();
    formData.append('document', blob, filename || 'document.pdf');
    if (caption) formData.append('caption', caption);
    const result = await fetch(`${this.apiUrl}/sendDocument`, { method: 'POST', body: formData });
    return result.json();
  }

  async sendPhoto(chatId: number | string, photoUrl: string, caption?: string) {
    const response = await fetch(`${this.apiUrl}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
    });
    return response.json();
  }

  createInlineKeyboard(actions: NotificationAction[]) {
    const keyboard = actions.map((action) => [{ text: action.label, callback_data: action.action }]);
    return { inline_keyboard: keyboard };
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert?: boolean) {
    const response = await fetch(`${this.apiUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: showAlert }),
    });
    return response.json();
  }

  async handleUpdate(update: TelegramUpdate) {
    if (update.message) await this.handleMessage(update.message);
    if (update.callback_query) await this.handleCallbackQuery(update.callback_query);
  }

  private async handleMessage(message: TelegramMessage) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    const activeCommand = this.activeCommands.get(userId);
    if (activeCommand) {
      await this.handleCommandResponse(message, activeCommand);
      return;
    }

    if (text.startsWith('/')) {
      await this.handleCommand(message);
      return;
    }

    if (message.photo && message.photo.length > 0) {
      await this.handlePhoto(message);
      return;
    }

    if (message.document) {
      await this.handleDocument(message);
      return;
    }

    await this.sendMessage(
      chatId,
      '❓ Используйте команды:\n/start - Начать\n/auth - Авторизация\n/tasks - Мои задачи\n/help - Помощь',
      { parse_mode: 'HTML' }
    );
  }

  private async handleCommand(message: TelegramMessage) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const command = message.text?.split(' ')[0] || '';

    switch (command) {
      case '/start':
        await this.sendMessage(
          chatId,
          `👋 Привет, ${message.from.first_name}!\nЯ бот системы управления проектами. Используйте /auth, чтобы авторизоваться.`,
          { parse_mode: 'HTML' }
        );
        break;
      case '/auth':
        this.activeCommands.set(userId, 'auth');
        await this.sendMessage(chatId, '🔐 Отправьте ваш email, зарегистрированный в системе:', { parse_mode: 'HTML' });
        break;
      case '/tasks':
        await this.sendMessage(chatId, '📋 Ваши задачи (заглушка).', { parse_mode: 'HTML' });
        break;
      case '/help':
        await this.sendMessage(
          chatId,
          '📖 /start, /auth, /tasks, /help — команды бота',
          { parse_mode: 'HTML' }
        );
        break;
      default:
        await this.sendMessage(chatId, '❌ Неизвестная команда. /help', { parse_mode: 'HTML' });
    }
  }

  private async handleCommandResponse(message: TelegramMessage, command: string) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text || '';

    switch (command) {
      case 'auth':
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
          this.activeCommands.delete(userId);
          await this.sendMessage(chatId, '✅ Авторизация успешна (заглушка).', { parse_mode: 'HTML' });
        } else {
          await this.sendMessage(chatId, '❌ Неверный email. Попробуйте снова:', { parse_mode: 'HTML' });
        }
        break;
      default:
        this.activeCommands.delete(userId);
    }
  }

  private async handleCallbackQuery(query: TelegramCallbackQuery) {
    await this.answerCallbackQuery(query.id, '✅ Получено');
  }

  private async handlePhoto(message: TelegramMessage) {
    const chatId = message.chat.id;
    const userId = message.from.id;
    const last = message.photo![message.photo!.length - 1];
    const fileResponse = await fetch(`${this.apiUrl}/getFile?file_id=${last.file_id}`);
    const fileData = await fileResponse.json();
    if (!fileData.ok || !fileData.result) {
      await this.sendMessage(chatId, '❌ Ошибка загрузки фото');
      return;
    }
    const fileUrl = `https://api.telegram.org/file/bot${this.botToken}/${fileData.result.file_path}`;
    const blob = await (await fetch(fileUrl)).blob();
    const path = `tasks/_misc/photo_${userId}_${Date.now()}.jpg`;
    const sref = ref(storage, path);
    await uploadBytes(sref, blob);
    const downloadUrl = await getDownloadURL(sref);
    await this.sendMessage(chatId, `✅ Фото сохранено. URL: ${downloadUrl}`);
  }

  private async handleDocument(message: TelegramMessage) {
    const chatId = message.chat.id;
    await this.sendMessage(chatId, '📄 Документ получен (заглушка).');
  }

  async setWebhook(url: string) {
    const response = await fetch(`${this.apiUrl}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, allowed_updates: ['message', 'callback_query'] }),
    });
    return response.json();
  }

  async deleteWebhook() {
    const response = await fetch(`${this.apiUrl}/deleteWebhook`, { method: 'POST' });
    return response.json();
  }

  async getMe() {
    const response = await fetch(`${this.apiUrl}/getMe`);
    return response.json();
  }
}

let telegramServiceInstance: TelegramService | null = null;
export const initTelegramService = (botToken: string, ownerUid: string) => {
  telegramServiceInstance = new TelegramService(botToken, ownerUid);
  return telegramServiceInstance;
};
export const getTelegramService = () => telegramServiceInstance;


