# 🚀 Оптимизации для будущего

## Быстрые улучшения (30 минут каждое)

### 1. Добавить ARIA labels (Доступность)
```tsx
// Было:
<IconButton onClick={handleDelete}>

// Стало:
<IconButton 
  onClick={handleDelete}
  aria-label="Удалить задачу"
>
```
**Польза:** Доступность для слабовидящих, лучше SEO

### 2. Использовать React.memo в тяжелых местах
```tsx
// В TasksPage.tsx
const TaskCard = React.memo(({ task, onEdit, onDelete }) => {
  // компонент
}, (prev, next) => prev.task.id === next.task.id);
```
**Польза:** Ускорение на 30% при работе со списками

## Средние улучшения (1-2 часа)

### 3. Виртуализация длинных списков
```bash
npm install react-window
```
```tsx
import { FixedSizeList } from 'react-window';
// Для списков > 100 элементов
```
**Польза:** Плавная прокрутка даже при 1000+ элементах

### 4. Service Worker для offline
```js
// В public/service-worker.js
self.addEventListener('fetch', (event) => {
  // Кэширование запросов
});
```
**Польза:** Работа без интернета

## Когда это делать?

- **ARIA labels** - когда будет госконтракт или крупный клиент
- **React.memo** - когда пользователи пожалуются на тормоза
- **Виртуализация** - когда будет > 100 задач/товаров
- **Service Worker** - когда нужна работа в полях без интернета

## Метрики для контроля

Текущие показатели:
- First Load: ~2 сек
- Bundle Size: 376KB → 356KB (после lodash-es)
- Lighthouse Score: ~85/100

Целевые показатели:
- First Load: < 1.5 сек
- Bundle Size: < 300KB
- Lighthouse Score: > 90/100
