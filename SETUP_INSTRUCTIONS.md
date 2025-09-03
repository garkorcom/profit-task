# 🚀 My Business App - Инструкции по установке и запуску

## 📋 Требования системы

### Базовые требования
- **Node.js** 18+ 
- **npm** 8+ или **yarn**
- **Git** для клонирования репозитория

### Для полного функционала (E2E тесты)
- **Java** 11+ (для Firebase Emulators)
- **Firebase CLI** (установится автоматически)

## 🛠️ Установка Java на macOS

### Вариант 1: Через веб-браузер (рекомендуется)
1. Перейдите на https://www.java.com/download/
2. Скачайте и установите Java Runtime Environment
3. Следуйте инструкциям установщика

### Вариант 2: Через Homebrew (если установлен)
```bash
# Сначала установите Homebrew (если нет)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Затем установите Java
brew install java

# Добавьте в PATH (если требуется)
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Вариант 3: Oracle JDK
1. Перейдите на https://www.oracle.com/java/technologies/downloads/
2. Скачайте JDK для macOS (ARM64 для M1/M2/M3 Mac)
3. Установите через .dmg файл

### Проверка установки
```bash
java -version
# Должно показать версию Java 11+
```

## 🚀 Быстрый старт

### 1. Клонирование и установка зависимостей
```bash
# Клонируйте репозиторий
git clone <repository-url>
cd my-business-app

# Установите зависимости
npm install
```

### 2. Настройка Firebase (для production)
```bash
# Создайте файл .env.local со своими Firebase настройками:
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 3. Запуск приложения
```bash
# Запуск в режиме разработки
npm start

# Приложение будет доступно на http://localhost:3000
```

## 🧪 Тестирование

### Unit тесты
```bash
# Запуск всех unit тестов
npm test

# Запуск конкретного теста
npm test -- --testPathPattern=timeValidation.test.ts

# Запуск с покрытием кода
npm test -- --coverage --watchAll=false
```

### E2E тесты (требует Java)
```bash
# 1. Запустите Firebase эмуляторы в отдельном терминале
npm run emulators

# 2. В другом терминале запустите E2E тесты
npm run test:e2e

# Или запустите тесты в watch режиме
npm run test:e2e:watch
```

### Доступные эмуляторы
После запуска `npm run emulators`:
- **Firestore**: http://localhost:8080
- **Authentication**: http://localhost:9099
- **Cloud Functions**: http://localhost:5001
- **Firebase UI**: http://localhost:4000 (управление эмуляторами)

## 🏗️ Сборка для продакшена

```bash
# Создание production сборки
npm run build

# Сборка будет в папке build/
```

## 📊 Архитектура проекта

```
my-business-app/
├── public/                 # Статические файлы
├── src/
│   ├── api/               # Firebase API слой
│   ├── auth/              # Аутентификация и авторизация
│   ├── components/        # React компоненты
│   ├── contexts/          # React контексты
│   ├── hooks/             # Кастомные хуки
│   ├── pages/             # Страницы приложения
│   ├── router/            # Настройка роутинга
│   ├── tests/             # Тестовые файлы
│   ├── types/             # TypeScript типы
│   └── utils/             # Утилиты и хелперы
├── functions/             # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts       # Основные функции (COGS расчет)
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules        # Правила безопасности Firestore
├── firestore.indexes.json # Индексы базы данных
└── firebase.json          # Конфигурация Firebase
```

## 🔧 Конфигурация разработки

### VS Code настройки
Рекомендуемые расширения:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Firebase
- Prettier - Code formatter
- ESLint

### Настройки TypeScript
```json
// tsconfig.json уже настроен для:
{
  "strict": true,
  "noImplicitAny": true,
  "skipLibCheck": true,
  "esModuleInterop": true
}
```

## 📱 Возможности приложения

### 🏢 Основные модули
- **Управление проектами** - полный жизненный цикл проектов
- **Трекинг времени** - учет рабочего времени с валидацией
- **ERP модуль** - автоматический расчет COGS
- **Система смет** - создание и управление сметами
- **Склад и продукты** - управление запасами
- **Контрагенты** - база клиентов и поставщиков

### 💰 ERP и финансы
- **Include_Mode логика** (NONE/COGS/OH)
- **Автоматический COGS расчет** через Cloud Functions
- **Историчность ставок** с CostSnapshot
- **Защищенные финансовые операции**
- **Отчеты по себестоимости**

### 🔐 Безопасность
- **Firebase Authentication** с ролевой системой
- **Security Rules** для защиты данных
- **Аудит логи** всех операций
- **Шифрование** чувствительной информации

## 🐛 Решение проблем

### Проблема: "Java not found" при запуске эмуляторов
**Решение:**
1. Установите Java (см. инструкции выше)
2. Перезапустите терминал
3. Проверьте: `java -version`

### Проблема: "Permission denied" при установке через npm
**Решение:**
```bash
# Используйте yarn вместо npm
yarn install
yarn start

# Или исправьте права npm
sudo chown -R $(whoami) ~/.npm
```

### Проблема: Firebase эмуляторы не запускаются
**Решение:**
1. Убедитесь, что порты свободны:
   ```bash
   lsof -i :8080 -i :9099 -i :5001
   ```
2. Убейте процессы при необходимости:
   ```bash
   kill -9 $(lsof -ti:8080,9099,5001)
   ```

### Проблема: TypeScript ошибки
**Решение:**
```bash
# Очистите кеш TypeScript
rm -rf node_modules/.cache
npm install

# Перезапустите TypeScript сервер в VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## 📞 Поддержка

### Документация
- **PROJECT_OVERVIEW.md** - полная техническая документация
- **README_E2E_TESTS.md** - инструкции по E2E тестированию
- **Страница "О проекте"** - http://localhost:3000/about

### Полезные команды
```bash
# Полная очистка и переустановка
rm -rf node_modules package-lock.json
npm install

# Проверка зависимостей
npm audit
npm audit fix

# Обновление зависимостей
npm outdated
npm update
```

---

## ✅ Checklist готовности к работе

- [ ] Node.js 18+ установлен (`node --version`)
- [ ] Java установлена (`java -version`) - для E2E тестов
- [ ] Зависимости установлены (`npm install`)
- [ ] Приложение запускается (`npm start`)
- [ ] Unit тесты проходят (`npm test`)
- [ ] Эмуляторы работают (`npm run emulators`) - опционально
- [ ] E2E тесты проходят (`npm run test:e2e`) - опционально

**🎉 После выполнения всех пунктов система готова к разработке и тестированию!**