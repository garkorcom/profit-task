# E2E тесты для Include_Mode логики

## Обзор

Этот набор E2E тестов проверяет критически важную логику Include_Mode в ERP модуле, которая определяет как записи времени влияют на финансовые расчеты COGS (Cost of Goods Sold).

## Include_Mode варианты

- **NONE**: Время логируется, но не создает COGS записи (неоплачиваемые задачи)
- **COGS**: Создает запись прямых трудозатрат без накладных расходов
- **OH (Overhead)**: Создает запись полных затрат с применением burden factor

## Структура тестов

```
src/tests/e2e/
├── includeMode.test.ts     # Основные E2E тесты
├── setup.ts                # Настройка окружения
└── env.setup.js            # Переменные окружения
```

## Тестируемые сценарии

### 1. NONE режим
- ✅ TimeEntry создается и утверждается
- ✅ COGS запись НЕ создается
- ✅ CostSnapshot создается для аудита
- ✅ Cloud Function корректно обрабатывает статус

### 2. COGS режим  
- ✅ TimeEntry создает COGS с типом `direct_labor`
- ✅ Стоимость рассчитывается без burden factor
- ✅ CostSnapshot сохраняет историческую ставку
- ✅ Связи между объектами корректны

### 3. OH режим
- ✅ TimeEntry создает COGS с типом `burdened_labor`
- ✅ Применяется burden factor и множители переработки
- ✅ Расчеты учитывают сложную логику оплаты
- ✅ Итоговая сумма включает все надбавки

### 4. Смена режима
- ✅ При смене Include_Mode пересчитываются COGS
- ✅ Старые записи корректно удаляются/обновляются
- ✅ Историчность данных сохраняется

### 5. Отчетность
- ✅ Группировка по Include_Mode в отчетах
- ✅ Фильтрация записей по типу включения
- ✅ Корректные итоговые суммы

## Настройка окружения

### Требования
- Firebase CLI установлен глобально
- Java 11+ для Firebase Emulators
- Node.js 18+

### Запуск эмуляторов
```bash
# Запуск всех эмуляторов
npm run emulators

# Эмуляторы будут доступны на:
# - Auth: http://localhost:9099
# - Firestore: http://localhost:8080  
# - Functions: http://localhost:5001
# - UI: http://localhost:4000
```

### Запуск тестов
```bash
# Одноразовый запуск E2E тестов
npm run test:e2e

# Запуск в watch режиме
npm run test:e2e:watch

# Запуск с подробным выводом
npm run test:e2e -- --verbose

# Запуск конкретного теста
npm run test:e2e -- --testNamePattern="NONE mode"
```

## Важные особенности

### Firebase Emulator Suite
- Тесты используют локальные эмуляторы, не затрагивая продакшн
- Данные автоматически очищаются между тестами
- Cloud Functions выполняются в эмуляторе

### Таймауты
- E2E тесты имеют увеличенный таймаут (30 секунд)
- Cloud Functions требуют времени на обработку (2-3 секунды)
- Используйте `testHelpers.waitForCloudFunction()` для ожидания

### Отладка
```bash
# Включение подробного логирования
DEBUG_E2E_TESTS=true npm run test:e2e

# Просмотр состояния эмуляторов
# Откройте http://localhost:4000 во время тестов
```

## Архитектура тестов

### Вспомогательные функции
```typescript
// Создание тестовых данных
const timeEntry = testHelpers.createTestTimeEntry({
  taskId: 'custom-task',
  hours: 8,
  includeMode: 'COGS'
});

// Ожидание Cloud Function
await testHelpers.waitForCloudFunction(3000);

// Проверка существования документа
const exists = await testHelpers.documentExists('users/123/cogsRecords/456');
```

### Интеграция с React Testing Library
- Рендеринг компонентов с контекстами
- Симуляция пользовательских действий
- Проверка UI обновлений после Firebase операций

## Покрытие кода

E2E тесты покрывают следующие модули:
- `src/utils/timeValidation.ts` - валидация времени
- `src/components/time/**` - компоненты работы с временем  
- `src/components/estimates/**` - компоненты смет
- `src/contexts/**` - контексты приложения

## Производительность

- Время выполнения полного набора: ~2-3 минуты
- Параллельное выполнение тестов отключено (Firebase Emulator ограничения)
- Каждый тест изолирован и независим

## Troubleshooting

### Эмуляторы не запускаются
```bash
# Проверить занятые порты
lsof -i :8080 -i :9099 -i :5001

# Убить процессы на портах
kill -9 $(lsof -ti:8080,9099,5001)

# Очистить кеш Firebase
firebase emulators:exec --only firestore --project demo-test "echo 'clear'"
```

### Тесты падают с таймаутом
- Увеличить таймаут в `jest.e2e.config.js`
- Проверить, что эмуляторы запущены
- Добавить дополнительные `await` для Firebase операций

### Cloud Functions не выполняются
- Убедиться, что Functions эмулятор запущен на порту 5001
- Проверить логи в Firebase UI (http://localhost:4000)
- Убедиться, что функции деплоятся в эмулятор

## Расширение тестов

### Добавление новых сценариев
1. Создать тестовые данные в `setup.ts`
2. Написать тест в `includeMode.test.ts`
3. Добавить проверки для новой логики
4. Обновить документацию

### Интеграция с CI/CD
```yaml
# GitHub Actions пример
- name: Start Firebase Emulators
  run: npm run emulators &
  
- name: Wait for emulators
  run: sleep 10

- name: Run E2E tests
  run: npm run test:e2e

- name: Stop emulators  
  run: kill $!
```

---

**⚠️ Критически важно**: E2E тесты проверяют финансовую логику. Любые изменения в тестах должны быть тщательно проверены и одобрены командой разработки.