# Firestore Индексы для Системы Постановки Задач

## Обзор

Для корректной работы системы постановки задач сотрудникам необходимо создать составные индексы в Firestore. Эти индексы обеспечивают быстрые запросы с множественными условиями и сортировкой.

## Обязательные Индексы

### 1. Коллекция: `assignmentTasks`

#### Индекс 1: Задачи по исполнителю с сортировкой
```
Коллекция: assignmentTasks
Поля:
  - assignedTo (Ascending)
  - updatedAt (Descending)
  - __name__ (Ascending)
```

#### Индекс 2: Задачи по исполнителю и статусу
```
Коллекция: assignmentTasks
Поля:
  - assignedTo (Ascending)
  - status (Ascending)
  - createdAt (Descending)
  - __name__ (Ascending)
```

#### Индекс 3: Задачи по исполнителю и приоритету
```
Коллекция: assignmentTasks
Поля:
  - assignedTo (Ascending)
  - priority (Ascending)
  - dueDate (Ascending)
  - __name__ (Ascending)
```

#### Индекс 4: Задачи по проекту
```
Коллекция: assignmentTasks
Поля:
  - projectId (Ascending)
  - status (Ascending)
  - createdAt (Descending)
  - __name__ (Ascending)
```

#### Индекс 5: Задачи по назначившему
```
Коллекция: assignmentTasks
Поля:
  - assignedBy (Ascending)
  - status (Ascending)
  - createdAt (Descending)
  - __name__ (Ascending)
```

#### Индекс 6: Поиск просроченных задач
```
Коллекция: assignmentTasks
Поля:
  - assignedTo (Ascending)
  - dueDate (Ascending)
  - status (Ascending)
  - __name__ (Ascending)
```

#### Индекс 7: Задачи с непрочитанными сообщениями
```
Коллекция: assignmentTasks
Поля:
  - assignedTo (Ascending)
  - unreadCount (Descending)
  - lastCommentAt (Descending)
  - __name__ (Ascending)
```

### 2. Подколлекция: `assignmentTasks/{taskId}/comments`

#### Индекс 8: Комментарии по задаче с сортировкой
```
Коллекция: assignmentTasks/{taskId}/comments
Поля:
  - taskId (Ascending)
  - timestamp (Ascending)
  - __name__ (Ascending)
```

#### Индекс 9: Непрочитанные комментарии
```
Коллекция: assignmentTasks/{taskId}/comments
Поля:
  - taskId (Ascending)
  - read (Ascending)
  - timestamp (Descending)
  - __name__ (Ascending)
```

## Как создать индексы

### Вариант 1: Автоматическое создание через использование
1. Запустите приложение
2. Выполните запросы, которые требуют индексы
3. Firebase Console покажет ошибки с ссылками на создание индексов
4. Переходите по ссылкам и создавайте индексы

### Вариант 2: Через Firebase Console
1. Откройте [Firebase Console](https://console.firebase.google.com/)
2. Выберите ваш проект
3. Перейдите в Firestore Database → Indexes
4. Нажмите "Create Index"
5. Введите данные каждого индекса

### Вариант 3: Через Firebase CLI
Создайте файл `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "assignedTo", "order": "ASCENDING"},
        {"fieldPath": "updatedAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks", 
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "assignedTo", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "assignedTo", "order": "ASCENDING"},
        {"fieldPath": "priority", "order": "ASCENDING"},
        {"fieldPath": "dueDate", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "projectId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}, 
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "assignedBy", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "assignedTo", "order": "ASCENDING"},
        {"fieldPath": "dueDate", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "assignmentTasks",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "assignedTo", "order": "ASCENDING"},
        {"fieldPath": "unreadCount", "order": "DESCENDING"},
        {"fieldPath": "lastCommentAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {"fieldPath": "taskId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "comments", 
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {"fieldPath": "taskId", "order": "ASCENDING"},
        {"fieldPath": "read", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "DESCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
```

Затем выполните:
```bash
firebase deploy --only firestore:indexes
```

## Проверка индексов

После создания индексов проверьте их работу:

1. **Статус индексов**: В Firebase Console → Firestore → Indexes
2. **Производительность запросов**: Используйте Firebase Performance Monitoring
3. **Тестирование**: Выполните типичные запросы в приложении

## Мониторинг и оптимизация

### Рекомендации по мониторингу:
- Следите за временем выполнения запросов
- Проверяйте использование индексов в Firebase Console
- Анализируйте паттерны запросов пользователей

### Оптимизация:
- Добавляйте новые индексы при появлении медленных запросов
- Удаляйте неиспользуемые индексы для экономии ресурсов
- Рассмотрите денормализацию данных для часто используемых запросов

## Примеры запросов, требующих индексы

### 1. Мои активные задачи
```typescript
query(
  collection(db, 'assignmentTasks'),
  where('assignedTo', '==', userId),
  where('status', 'in', ['assigned', 'acknowledged', 'in_progress']),
  orderBy('updatedAt', 'desc')
)
```

### 2. Задачи по проекту
```typescript
query(
  collection(db, 'assignmentTasks'),
  where('projectId', '==', projectId),
  orderBy('createdAt', 'desc')
)
```

### 3. Просроченные задачи
```typescript
query(
  collection(db, 'assignmentTasks'),
  where('assignedTo', '==', userId),
  where('dueDate', '<', new Date()),
  where('status', 'not-in', ['completed', 'approved'])
)
```

## Troubleshooting

### Частые проблемы:

1. **Ошибка "index not found"**
   - Создайте недостающий индекс по ссылке из ошибки
   - Подождите 2-5 минут для активации индекса

2. **Медленные запросы**
   - Проверьте правильность индексов
   - Оптимизируйте логику запросов
   - Рассмотрите пагинацию для больших результатов

3. **Превышение лимитов**
   - Firebase имеет лимиты на количество составных индексов
   - Оптимизируйте количество индексов
   - Используйте одиночные поля где возможно

## Заключение

Правильно настроенные индексы критически важны для производительности системы постановки задач. Регулярно мониторьте и оптимизируйте индексы в соответствии с паттернами использования приложения.