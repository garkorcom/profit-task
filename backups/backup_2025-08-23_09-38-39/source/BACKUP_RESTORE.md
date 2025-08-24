# Инструкция: как развернуть проект из бэкапа

Ниже — быстрые шаги, чтобы поднять проект локально и (при необходимости) задеплоить на Firebase Hosting.

## 1) Где лежит бэкап

Пример свежего бэкапа (путь у вас может отличаться по дате/времени):

```
/Users/denysharbuzov/Projects/my-business-app-backups/my-business-app-YYYYMMDD-HHMMSS
```

## 2) Вариант A: Запуск прямо из папки бэкапа

1. Откройте терминал и перейдите в папку бэкапа:
   ```bash
   cd /Users/denysharbuzov/Projects/my-business-app-backups/my-business-app-YYYYMMDD-HHMMSS
   ```
2. Установите зависимости (чистая установка):
   ```bash
   npm ci
   ```
3. Запустите локально (dev-сервер):
   ```bash
   npm start
   ```
4. Откройте в браузере `http://localhost:3000`.

## 3) Вариант B: Восстановление в новую рабочую папку

1. Скопируйте содержимое бэкапа в новую директорию проекта:
   ```bash
   mkdir -p ~/Projects/my-business-app-restored
   rsync -a --exclude 'node_modules' --exclude 'build' \
     \
     /Users/denysharbuzov/Projects/my-business-app-backups/my-business-app-YYYYMMDD-HHMMSS/ \
     ~/Projects/my-business-app-restored/
   ```
2. Перейдите в папку проекта и установите зависимости:
   ```bash
   cd ~/Projects/my-business-app-restored
   npm ci
   ```
3. Запустите локально:
   ```bash
   npm start
   ```

## 4) Настройка Firebase (при необходимости)

Если планируете деплой:

1. Авторизуйтесь в Firebase CLI (однократно):
   ```bash
   npx firebase login
   ```
2. Выберите проект (или укажите явно при деплое):
   ```bash
   npx firebase projects:list | cat
   npx firebase use <YOUR_PROJECT_ID>
   ```
3. Соберите production-бандл:
   ```bash
   npm run build
   ```
4. Задеплойте на Hosting:
   ```bash
   npx firebase deploy --only hosting | cat
   ```

Поддерживается также явное указание проекта без `firebase use`:
```bash
npx firebase deploy --only hosting --project <YOUR_PROJECT_ID> | cat
```

## 5) Важные примечания

- Конфигурация Firebase находится в `src/firebase/firebase.ts`. Убедитесь, что параметры соответствуют вашему проекту Firebase (если используете другой проект).
- Папки `node_modules`, `build`, `.git` не копируются в бэкап — они пересоздаются локально при установке/сборке.
- Требуемые версии инструментов:
  - Node.js 18+ (рекомендуется LTS)
  - npm 8+
  - Firebase CLI (через `npx firebase ...` — установка не обязательна)

## 6) Быстрое восстановление одной командой (пример)

Если нужно просто поднять бэкап как есть:
```bash
cd /Users/denysharbuzov/Projects/my-business-app-backups/my-business-app-YYYYMMDD-HHMMSS && npm ci && npm start
```

## 7) Типовые проблемы

- Порт 3000 занят: завершите процесс, использующий порт, либо запустите `PORT=3001 npm start`.
- Ошибка Firebase auth/deploy: проверьте, что вошли в CLI (см. шаг 4.1) и используете корректный Project ID.
- Ошибки типов/зависимостей: выполните `npm ci` (не `npm install`) для чистой установки.



