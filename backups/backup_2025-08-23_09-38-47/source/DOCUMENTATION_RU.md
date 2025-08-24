# Документация проекта - Система управления бизнесом

## 📁 Структура проекта

```
my-business-app/
├── src/
│   ├── api/              # API функции для работы с данными
│   │   ├── estimateApi.ts    # API для эстимейтов (смет)
│   │   ├── invoiceApi.ts     # API для счетов
│   │   ├── productApi.ts     # API для продуктов/складского учета
│   │   └── taskApi.ts        # API для задач
│   │
│   ├── auth/             # Компоненты аутентификации
│   │   ├── AuthContext.tsx   # Контекст авторизации
│   │   └── LoginPage.tsx     # Страница входа
│   │
│   ├── components/       # Переиспользуемые компоненты
│   │   ├── common/           # Общие компоненты
│   │   │   └── loadingspinner.tsx  # Индикатор загрузки
│   │   ├── estimates/        # Компоненты для эстимейтов
│   │   │   ├── EstimateTemplates.tsx        # Шаблоны эстимейтов
│   │   │   ├── EstimateVersionManager.tsx   # Менеджер версий
│   │   │   └── EstimateVersionComparison.tsx # Сравнение версий
│   │   └── layouts/          # Компоненты макетов
│   │       ├── mainLayout.tsx    # Основной макет приложения
│   │       └── privateroute.tsx  # Защищенные маршруты
│   │
│   ├── firebase/         # Конфигурация Firebase
│   │   └── firebase.ts       # Настройки подключения к Firebase
│   │
│   ├── pages/            # Страницы приложения
│   │   ├── homepage.tsx          # Главная страница
│   │   ├── invoicesPage.tsx      # Страница счетов
│   │   ├── TasksPage.tsx         # Страница задач
│   │   ├── ProductsPage.tsx      # Страница продуктов/склада
│   │   ├── ProjectsPage.tsx      # Страница проектов
│   │   ├── ProjectEstimatesPage.tsx    # Эстимейты проекта
│   │   ├── EstimateConstructorPage.tsx # Конструктор эстимейтов
│   │   └── EstimateEditorPage.tsx      # Редактор эстимейтов
│   │
│   ├── router/           # Маршрутизация
│   │   └── AppRouter.tsx     # Конфигурация маршрутов
│   │
│   ├── types/            # TypeScript типы
│   │   └── estimate.ts       # Типы для эстимейтов
│   │
│   └── App.tsx           # Главный компонент приложения
│
├── public/               # Статические файлы
└── package.json          # Зависимости проекта
```

## 🔧 Основные функции

### 1. Управление эстимейтами (сметами)

#### EstimateConstructorPage
**Расположение:** `src/pages/EstimateConstructorPage.tsx`

**Основные функции:**
- Создание и редактирование эстимейтов
- Drag-and-drop для изменения порядка элементов
- PERT оценка (по трем точкам)
- Иерархическая структура элементов
- Расчет итогов с учетом налогов и скидок

**Ключевые методы:**
```typescript
// Добавление нового элемента
const handleAddItem = (parentId?: string) => {
  // Создает новый элемент эстимейта
  // parentId - ID родительского элемента для создания иерархии
}

// Обновление элемента
const handleUpdateItem = (updatedItem: EstimateItem) => {
  // Обновляет существующий элемент
  // Пересчитывает итоги
}

// Удаление элемента
const handleDeleteItem = (itemId: string) => {
  // Удаляет элемент и все его дочерние элементы
}

// Drag and Drop
const handleDragEnd = (result: DropResult) => {
  // Обрабатывает перетаскивание элементов
  // Обновляет порядок отображения
}
```

### 2. Система шаблонов

#### EstimateTemplates
**Расположение:** `src/components/estimates/EstimateTemplates.tsx`

**Функционал:**
- Предустановленные шаблоны для разных типов проектов
- Категоризация шаблонов
- Возможность сохранения текущего эстимейта как шаблона
- Быстрое применение шаблона к новому проекту

**Доступные шаблоны:**
- Базовое веб-приложение
- Мобильное приложение
- E-commerce платформа

### 3. Версионирование

#### EstimateVersionManager
**Расположение:** `src/components/estimates/EstimateVersionManager.tsx`

**Возможности:**
- Создание новых версий эстимейта
- Timeline view - визуальная временная шкала версий
- Сравнение версий между собой
- Восстановление предыдущих версий
- Отслеживание изменений между версиями

#### EstimateVersionComparison
**Расположение:** `src/components/estimates/EstimateVersionComparison.tsx`

**Функции сравнения:**
- Визуальное сравнение двух версий бок о бок
- Подсветка добавленных элементов (зеленый)
- Подсветка удаленных элементов (красный)
- Подсветка измененных элементов (желтый)
- Статистика изменений

### 4. PERT методология

**Формула расчета:** `(Оптимистичная + 4 × Наиболее вероятная + Пессимистичная) / 6`

**Поля для PERT оценки:**
- `optimistic` - Оптимистичная оценка (лучший случай)
- `mostLikely` - Наиболее вероятная оценка
- `pessimistic` - Пессимистичная оценка (худший случай)
- `calculated` - Рассчитанное значение по формуле

### 5. Типы элементов эстимейта

```typescript
type EstimateItemType = 'section' | 'work' | 'material' | 'expense';
```

- **section** - Раздел для группировки элементов
- **work** - Работы/услуги
- **material** - Материалы
- **expense** - Прочие расходы

## 🔐 Аутентификация

### AuthContext
**Расположение:** `src/auth/AuthContext.tsx`

Контекст предоставляет:
- `currentUser` - Текущий авторизованный пользователь
- `login(email, password)` - Функция входа
- `signup(email, password)` - Функция регистрации
- `logout()` - Функция выхода
- `loading` - Состояние загрузки

## 📊 API функции

### estimateApi.ts

```typescript
// Получение эстимейтов проекта
getProjectEstimates(userId: string, projectId: string)

// Создание нового эстимейта
createEstimate(userId: string, estimate: Estimate)

// Обновление эстимейта
updateEstimate(userId: string, estimateId: string, updates: Partial<Estimate>)

// Удаление эстимейта
deleteEstimate(userId: string, estimateId: string)

// Расчет PERT
calculatePert(optimistic: number, mostLikely: number, pessimistic: number)

// Создание версии
createEstimateVersion(userId: string, estimateId: string, version: EstimateVersion)

// Создание публичной ссылки
createShareLink(userId: string, estimateId: string)
```

## 🚀 Развертывание

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start

# Сборка для продакшена
npm run build
```

### Деплой на Firebase
```bash
# Сборка проекта
npm run build

# Деплой на Firebase Hosting
npx firebase deploy --only hosting
```

## 🎨 UI компоненты

Проект использует Material-UI (MUI) v7 для интерфейса:
- Grid система для адаптивной верстки
- Card компоненты для группировки контента
- Dialog для модальных окон
- Timeline из @mui/lab для визуализации версий
- Drag and drop через react-beautiful-dnd

## 📝 Состояние и управление данными

- **Firebase Firestore** - основная база данных
- **React Context** - для глобального состояния авторизации
- **Local State** - для состояния компонентов
- **Real-time updates** - подписки на изменения через onSnapshot

## 🔄 Workflow эстимейта

1. **Создание** → Выбор шаблона или создание с нуля
2. **Редактирование** → Добавление элементов, настройка иерархии
3. **PERT оценка** → Ввод трех точек для точной оценки
4. **Версионирование** → Сохранение версий для отслеживания изменений
5. **Шаринг** → Создание публичной ссылки для клиента
6. **Утверждение** → Изменение статуса на approved/rejected

## 🛠 Технологический стек

- **React** 18.x - UI фреймворк
- **TypeScript** - Типизация
- **Firebase** - Backend (Auth, Firestore, Hosting)
- **Material-UI** v7 - UI компоненты
- **React Router** v6 - Маршрутизация
- **React Beautiful DnD** - Drag and drop
