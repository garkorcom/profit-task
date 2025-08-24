# 📱 Инструкция по подключению интеграции с мессенджерами

## Содержание

1. Telegram Bot — настройка
2. WhatsApp Business API — настройка
3. Firebase — коллекции и правила
4. Настройка приложения
5. Тестирование
6. Troubleshooting

---

## 🤖 Telegram Bot

1) Создание бота в @BotFather и получение токена
2) Переменные в .env.local:
```
REACT_APP_TELEGRAM_BOT_TOKEN=YOUR_TOKEN
REACT_APP_TELEGRAM_BOT_USERNAME=your_bot_username
REACT_APP_TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
```
3) Инициализация:
```
import { initTelegramService } from './services/telegramService';
// вызовите initTelegramService(token, ownerUid) после логина
```
4) Webhook (prod) или ngrok (dev)

## 💬 WhatsApp Business API

- Провайдер: Twilio/MessageBird/360dialog
- Шаблоны сообщений (approved)
- Webhook для входящих

## 🔥 Firebase

Коллекции у пользователя: `notifications`, `notificationTemplates`, `messengerIntegrations`, `documentSendLogs`.

## ⚙️ Настройка в приложении

- Сохранение настроек интеграций в Firestore
- Использование `notificationApi` для отправки/логирования

## 🧪 Тестирование

- Telegram: /start, /auth, отправка фото → сохраняется в Storage
- WhatsApp: отправка шаблонного сообщения с документом через провайдера

## 🔧 Troubleshooting

- Telegram: проверьте getMe, getWebhookInfo
- WhatsApp: статус шаблонов, 24-часовое окно, баланс
- Firebase: правила и аутентификация

## 🔐 Безопасность

- Не коммитьте токены
- Ограничьте доступ правилами Firestore/Storage
