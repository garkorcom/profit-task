# Решение проблем с кешированием в React

## Если изменения не отображаются:

### 1. Быстрое решение (в терминале):
```bash
# Остановить все процессы
pkill -f "react-scripts"

# Очистить кеш
rm -rf node_modules/.cache

# Перезапустить
npm start
```

### 2. В браузере:
1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Поставьте галочку "Disable cache"
4. Удерживая кнопку обновления, выберите "Empty Cache and Hard Reload"

### 3. Используйте инкогнито:
- Chrome: Ctrl+Shift+N (Windows) или Cmd+Shift+N (Mac)
- Всегда тестируйте в инкогнито режиме

### 4. Очистка через консоль браузера:
```javascript
// Вставьте в консоль браузера
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
localStorage.clear();
sessionStorage.clear();
location.reload(true);
```

### 5. Проверка версии:
Добавьте в начало компонента:
```javascript
console.log('Version:', Date.now());
```

Если число не меняется - кеш не очищен.

## Профилактика:

1. Всегда разрабатывайте с открытым DevTools и включенным "Disable cache"
2. Используйте разные браузеры для тестирования
3. Регулярно очищайте node_modules/.cache

## Признаки проблемы:
- ✗ Webpack компилируется, но изменений нет
- ✗ Console.log не появляются
- ✗ Старые ошибки после их исправления
- ✗ bundle.js загружается, но содержит старый код

## Команда для полной очистки:
```bash
npm run clean-start
```

Добавьте в package.json:
```json
"scripts": {
  "clean-start": "rm -rf node_modules/.cache && npm start"
}
```
