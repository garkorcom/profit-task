# Настройка CORS для Firebase Storage

## Проблема
При локальной разработке (localhost:3000) возникает ошибка CORS при загрузке фото в Firebase Storage.

## Временное решение (уже реализовано)
В коде добавлена обработка ошибок CORS:
1. При ошибке загрузки на localhost фото не блокирует начало работы
2. Обязательность фото временно отключена для localhost
3. Возвращается placeholder URL при ошибке

## Постоянное решение
Для настройки CORS в Firebase Storage:

### Вариант 1: Через Google Cloud Console
1. Откройте https://console.cloud.google.com
2. Выберите проект profit-task
3. Перейдите в Cloud Storage → Buckets
4. Найдите bucket profit-task.firebasestorage.app
5. Нажмите на три точки → Edit bucket permissions
6. Добавьте CORS конфигурацию из файла cors.json

### Вариант 2: Через gcloud CLI
```bash
# Установите Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Авторизуйтесь
gcloud auth login

# Установите проект
gcloud config set project profit-task

# Примените CORS конфигурацию
gsutil cors set cors.json gs://profit-task.firebasestorage.app
```

### Вариант 3: Через Firebase Console (временно)
В Firebase Console → Storage → Rules добавьте временные правила для тестирования:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Проверка
После настройки CORS проверьте загрузку фото:
1. Откройте http://localhost:3000
2. Начните учет времени с фото
3. Проверьте консоль браузера на отсутствие CORS ошибок
