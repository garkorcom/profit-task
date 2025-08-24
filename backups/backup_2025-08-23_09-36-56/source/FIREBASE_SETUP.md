# Настройка Firebase для проекта

## Шаги для создания своего Firebase проекта:

1. **Создайте проект Firebase:**
   - Перейдите на https://console.firebase.google.com/
   - Нажмите "Create a project" или "Создать проект"
   - Введите название проекта (например, "my-business-app")
   - Следуйте инструкциям мастера создания

2. **Включите Authentication:**
   - В консоли Firebase выберите "Authentication" в левом меню
   - Нажмите "Get started"
   - Включите "Email/Password" провайдер
   - Сохраните изменения

3. **Создайте Firestore Database:**
   - В консоли Firebase выберите "Firestore Database"
   - Нажмите "Create database"
   - Выберите "Start in production mode"
   - Выберите ближайший регион
   - Нажмите "Enable"

4. **Получите конфигурацию:**
   - В настройках проекта (шестеренка вверху слева)
   - Выберите "Project settings"
   - Прокрутите вниз до "Your apps"
   - Нажмите на иконку "</>" (Web)
   - Зарегистрируйте приложение с названием
   - Скопируйте конфигурацию

5. **Обновите файл firebase.ts:**
   ```javascript
   const firebaseConfig = {
     apiKey: "ваш-api-key",
     authDomain: "ваш-проект.firebaseapp.com",
     projectId: "ваш-проект",
     storageBucket: "ваш-проект.appspot.com",
     messagingSenderId: "ваш-id",
     appId: "ваш-app-id"
   };
   ```

6. **Настройте Firestore Rules:**
   В консоли Firebase → Firestore Database → Rules, вставьте:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Правила для задач пользователей
       match /users/{userId}/tasks/{taskId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Правила для контрагентов пользователей
       match /users/{userId}/contractors/{contractorId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Правила для других коллекций пользователей
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

7. **Создайте индексы (опционально):**
   Для оптимизации запросов создайте составной индекс:
   - Collection: `users/{userId}/tasks`
   - Fields: `contractorId (Ascending)`, `createdAt (Descending)`

## Временное решение

Сейчас в проекте используется публичная тестовая конфигурация. 
**ВАЖНО:** Создайте свой проект Firebase для production использования!

## Проблемы и решения

### Ошибка "invalid-api-key"
- Убедитесь, что API key правильно скопирован
- Проверьте, что проект Firebase активен
- Убедитесь, что домен localhost добавлен в authorized domains

### Ошибка "permission-denied" 
- Проверьте Firestore Rules
- Убедитесь, что пользователь авторизован
- Проверьте структуру путей в базе данных
