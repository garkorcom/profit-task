# 🧪 Test Documentation / Документация тестов

## 📁 Структура тестов / Test Structure

```
src/__tests__/
├── unit/           # Модульные тесты / Unit tests
├── integration/    # Интеграционные тесты / Integration tests
├── e2e/           # End-to-end тесты / E2E tests
├── api/           # API тесты / API tests
├── components/    # Компоненты тесты / Component tests
├── utils/         # Утилиты тесты / Utility tests
└── hooks/         # Хуки тесты / Hook tests
```

## 🎯 Категории тестов / Test Categories

### 🔧 Unit Tests (unit/)
**Назначение:** Тестирование изолированных функций и модулей
**Содержит:**
- `estimate.calculations.test.ts` - Тесты расчетов смет
- `camera.test.tsx` - Тесты камеры и медиа
- `geolocation.test.tsx` - Тесты геолокации
- `responsive.test.tsx` - Тесты адаптивности

**Запуск:** `npm test -- --testPathPattern="unit/"`

### 🔗 Integration Tests (integration/)
**Назначение:** Тестирование взаимодействия между компонентами
**Содержит:**
- `integration.test.tsx` - Основные интеграционные тесты
- `estimate.integration.test.ts` - Интеграция системы смет

**Запуск:** `npm test -- --testPathPattern="integration/"`

### 🌐 E2E Tests (e2e/)
**Назначение:** Полные сценарии пользователя
**Содержит:**
- `estimate-constructor.spec.ts` - Полный цикл работы со сметами

**Запуск:** `npm run test:e2e`

### 📡 API Tests (api/)
**Назначение:** Тестирование API слоя и взаимодействия с Firebase
**Содержит:**
- `timeEntryUnified.test.ts` - Тесты единого API учета времени
- `multitasking-enhanced.test.ts` - Тесты расширенной мультизадачности

**Запуск:** `npm test -- --testPathPattern="api/"`

### 🧩 Component Tests (components/)
**Назначение:** Тестирование React компонентов
**Содержит:**
- `timeComponents.test.tsx` - Компоненты учета времени

**Запуск:** `npm test -- --testPathPattern="components/"`

### 🛠️ Utility Tests (utils/)
**Назначение:** Тестирование вспомогательных функций
**Содержит:**
- `timeValidation.test.ts` - Валидация временных данных
- `startability.test.ts` - Система проверки стартуемости проектов

**Запуск:** `npm test -- --testPathPattern="utils/"`

### ⚡ Hook Tests (hooks/)
**Назначение:** Тестирование React хуков
**Содержит:**
- `useSmartSuggestions.test.ts` - Хук умных предложений

**Запуск:** `npm test -- --testPathPattern="hooks/"`

## 📋 Команды тестирования / Test Commands

```bash
# Все тесты
npm test

# Только unit тесты
npm test -- --testPathPattern="unit/"

# Только интеграционные тесты
npm test -- --testPathPattern="integration/"

# Только API тесты
npm test -- --testPathPattern="api/"

# Только компоненты
npm test -- --testPathPattern="components/"

# Тесты без watch режима
npm test -- --watchAll=false

# Покрытие кода
npm test -- --coverage

# Конкретный тест
npm test -- --testNamePattern="should calculate"
```

## 🔧 Настройка тестовой среды / Test Environment Setup

### Моки / Mocks
Основные моки находятся в:
- `setupTests.ts` - Глобальные моки
- `__mocks__/` - Моки модулей

### Провайдеры / Providers
Для компонентных тестов используется TestWrapper с:
- ThemeProvider (Material-UI)
- BrowserRouter (React Router)
- CommandPaletteProvider
- TimeTrackingProvider

### Firebase Testing
- Используется Firebase emulator для интеграционных тестов
- Моки Firebase SDK для unit тестов

## 📊 Метрики тестов / Test Metrics

**Цели покрытия:**
- Unit tests: 90%+
- Integration tests: 70%+
- E2E tests: Основные пользовательские сценарии

**Текущий статус:**
- ✅ API тесты: исправлены основные проблемы
- ✅ Component тесты: добавлены провайдеры
- ✅ Unit тесты: исправлены расчетные ассерции
- 🔄 Integration тесты: требуют доработки моков

## 🚨 Troubleshooting / Решение проблем

### Частые проблемы:

1. **Jest ES modules error**
   ```bash
   # Добавлено в package.json:
   "transformIgnorePatterns": ["node_modules/(?!@fullcalendar|@mui)"]
   ```

2. **Context Provider missing**
   ```tsx
   // Используйте TestWrapper для компонентных тестов
   render(<TestWrapper><YourComponent /></TestWrapper>)
   ```

3. **Firebase mocking issues**
   ```typescript
   // Используйте простые моки вместо jest.fn() в jest.mock()
   jest.mock('../firebase/firebase', () => ({ /* simple objects */ }))
   ```

4. **Timeout issues**
   ```bash
   # Увеличьте timeout для медленных тестов
   npm test -- --testTimeout=10000
   ```

## 📚 Лучшие практики / Best Practices

### ✅ Do:
- Используйте описательные имена тестов
- Тестируйте поведение, а не реализацию
- Мокайте внешние зависимости
- Используйте arrange-act-assert паттерн
- Добавляйте комментарии для сложных тестов

### ❌ Don't:
- Не тестируйте приватные методы напрямую
- Не создавайте зависимости между тестами
- Не используйте реальные API в unit тестах
- Не игнорируйте асинхронность

## 🔄 CI/CD Integration

Тесты запускаются автоматически при:
- Push в main branch
- Pull Request
- Release создании

**Pipeline статусы:**
- ✅ Unit tests должны проходить 100%
- ✅ Integration tests должны проходить 90%+
- ✅ E2E tests должны покрывать критические пути

---

*Последнее обновление: январь 2025*