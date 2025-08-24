# Компоненты для работы с эстимейтами

## EstimateTemplates.tsx
### Компонент для работы с шаблонами эстимейтов

**Основные функции:**
```typescript
// Состояния компонента
const [selectedCategory, setSelectedCategory] = useState<string>('all'); // Выбранная категория
const [searchTerm, setSearchTerm] = useState(''); // Поисковый запрос
const [saveAsTemplate, setSaveAsTemplate] = useState(false); // Флаг сохранения как шаблон
const [newTemplateName, setNewTemplateName] = useState(''); // Имя нового шаблона
const [newTemplateDescription, setNewTemplateDescription] = useState(''); // Описание нового шаблона
const [newTemplateCategory, setNewTemplateCategory] = useState(''); // Категория нового шаблона

// Предустановленные шаблоны
const templates: EstimateTemplate[] = [
  {
    id: 'web-app-basic',
    name: 'Базовое веб-приложение',
    description: 'Шаблон для простого веб-приложения с авторизацией и базовым функционалом',
    category: 'Веб-разработка',
    items: [...] // Элементы шаблона
  },
  // ... другие шаблоны
];

// Фильтрация шаблонов по категории и поисковому запросу
const filteredTemplates = templates.filter(template => {
  const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
  const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        template.description.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesCategory && matchesSearch;
});

// Обработка выбора шаблона
const handleSelectTemplate = (template: EstimateTemplate) => {
  onSelectTemplate(template);
  onClose();
};

// Обработка сохранения текущего эстимейта как шаблона
const handleSaveAsTemplate = () => {
  if (currentEstimate && newTemplateName && newTemplateDescription && newTemplateCategory) {
    const newTemplate: EstimateTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory,
      items: currentEstimate.items,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0
    };
    
    templates.push(newTemplate); // В реальном приложении сохранить в БД
    setSaveAsTemplate(false);
    // Очистка полей формы
    setNewTemplateName('');
    setNewTemplateDescription('');
    setNewTemplateCategory('');
  }
};
```

## EstimateVersionManager.tsx
### Компонент для управления версиями эстимейтов

**Основные функции:**
```typescript
// Состояния компонента
const [activeTab, setActiveTab] = useState(0); // Активная вкладка (Timeline/Список/История)
const [compareMode, setCompareMode] = useState(false); // Режим сравнения
const [selectedVersions, setSelectedVersions] = useState<string[]>([]); // Выбранные версии для сравнения
const [createVersionDialog, setCreateVersionDialog] = useState(false); // Диалог создания версии
const [versionNotes, setVersionNotes] = useState(''); // Примечания к версии

// Получение иконки статуса версии
const getStatusIcon = (status: EstimateVersion['status']) => {
  switch (status) {
    case 'draft': return <DraftIcon />; // Черновик
    case 'sent': return <SentIcon />; // Отправлено
    case 'approved': return <ApprovedIcon />; // Утверждено
    case 'rejected': return <CancelIcon />; // Отклонено
    default: return <InfoIcon />;
  }
};

// Расчет изменений между версиями
const calculateChanges = (current: EstimateVersion, previous?: EstimateVersion) => {
  if (!previous) {
    return {
      added: current.items.length, // Количество добавленных элементов
      modified: 0, // Количество измененных элементов
      removed: 0, // Количество удаленных элементов
      totalChange: current.total // Изменение общей суммы
    };
  }

  // Сравнение элементов
  const currentIds = new Set(current.items.map(item => item.id));
  const previousIds = new Set(previous.items.map(item => item.id));
  
  const added = current.items.filter(item => !previousIds.has(item.id)).length;
  const removed = previous.items.filter(item => !currentIds.has(item.id)).length;
  
  // Подсчет измененных элементов
  let modified = 0;
  current.items.forEach(currentItem => {
    const previousItem = previous.items.find(item => item.id === currentItem.id);
    if (previousItem && currentItem.total !== previousItem.total) {
      modified++;
    }
  });
  
  return {
    added,
    modified,
    removed,
    totalChange: current.total - previous.total
  };
};

// Обработка выбора версий для сравнения
const handleVersionSelect = (versionId: string) => {
  if (selectedVersions.includes(versionId)) {
    setSelectedVersions(selectedVersions.filter(id => id !== versionId));
  } else if (selectedVersions.length < 2) {
    setSelectedVersions([...selectedVersions, versionId]);
  }
};

// Создание новой версии
const handleCreateVersion = () => {
  if (versionNotes) {
    onCreateVersion(versionNotes);
    setCreateVersionDialog(false);
    setVersionNotes('');
  }
};
```

## EstimateVersionComparison.tsx
### Компонент для детального сравнения двух версий

**Основные функции:**
```typescript
// Сравнение элементов двух версий
const compareItems = () => {
  if (!version1 || !version2) return [];
  
  const comparison: ItemComparison[] = [];
  const version1Map = new Map(version1.items.map(item => [item.id, item]));
  const version2Map = new Map(version2.items.map(item => [item.id, item]));
  
  // Проверка удаленных и измененных элементов
  version1.items.forEach(item => {
    const newItem = version2Map.get(item.id);
    if (!newItem) {
      // Элемент удален во второй версии
      comparison.push({
        id: item.id,
        name: item.name,
        status: 'removed',
        oldValue: item,
        newValue: undefined
      });
    } else if (JSON.stringify(item) !== JSON.stringify(newItem)) {
      // Элемент изменен
      comparison.push({
        id: item.id,
        name: item.name,
        status: 'modified',
        oldValue: item,
        newValue: newItem
      });
    } else {
      // Элемент не изменен
      comparison.push({
        id: item.id,
        name: item.name,
        status: 'unchanged',
        oldValue: item,
        newValue: newItem
      });
    }
  });
  
  // Проверка добавленных элементов
  version2.items.forEach(item => {
    if (!version1Map.has(item.id)) {
      comparison.push({
        id: item.id,
        name: item.name,
        status: 'added',
        oldValue: undefined,
        newValue: item
      });
    }
  });
  
  return comparison;
};

// Фильтрация элементов по статусу
const itemComparisons = compareItems();
const added = itemComparisons.filter(item => item.status === 'added');
const modified = itemComparisons.filter(item => item.status === 'modified');
const removed = itemComparisons.filter(item => item.status === 'removed');
const unchanged = itemComparisons.filter(item => item.status === 'unchanged');

// Расчет статистики изменений
const stats = {
  addedCount: added.length,
  modifiedCount: modified.length,
  removedCount: removed.length,
  unchangedCount: unchanged.length,
  totalDifference: (version2?.total || 0) - (version1?.total || 0),
  percentageChange: version1?.total 
    ? (((version2?.total || 0) - version1.total) / version1.total * 100).toFixed(2)
    : 0
};
```

## Структура данных

### EstimateItem (Элемент эстимейта)
```typescript
interface EstimateItem {
  id: string;                    // Уникальный идентификатор
  type: EstimateItemType;        // Тип элемента (section/work/material/expense)
  parentId?: string;             // ID родительского элемента (для иерархии)
  level: number;                 // Уровень вложенности (0 = корень)
  order: number;                 // Порядок отображения
  
  // Общие поля
  name: string;                  // Название элемента
  description?: string;          // Описание
  
  // Для работ (work)
  quantity?: number;             // Количество
  unit?: string;                 // Единица измерения
  rate?: number;                 // Ставка за единицу
  hours?: number;                // Часы (для единичной оценки)
  pertEstimate?: PertEstimate;   // PERT оценка
  
  // Расчетные поля
  total: number;                 // Итоговая сумма
}
```

### PertEstimate (PERT оценка)
```typescript
interface PertEstimate {
  optimistic: number;      // Оптимистичная оценка (лучший случай)
  mostLikely: number;      // Наиболее вероятная оценка
  pessimistic: number;     // Пессимистичная оценка (худший случай)
  calculated?: number;     // Рассчитанная оценка: (O + 4M + P) / 6
}
```

### EstimateVersion (Версия эстимейта)
```typescript
interface EstimateVersion {
  id: string;                    // ID версии
  version: string;               // Номер версии (например, "1.0", "1.1")
  status: 'draft' | 'sent' | 'approved' | 'rejected'; // Статус версии
  createdAt: Date;               // Дата создания
  createdBy: string;             // Кто создал версию
  notes: string;                 // Примечания к версии
  items: EstimateItem[];         // Элементы эстимейта
  subtotal: number;              // Подитог
  total: number;                 // Итого
  taxRate?: number;              // Налоговая ставка
  discountRate?: number;         // Скидка
}
```

## Использование компонентов

### EstimateTemplates
```tsx
<EstimateTemplates
  open={templatesOpen}
  onClose={() => setTemplatesOpen(false)}
  onSelectTemplate={(template) => {
    // Применяем выбранный шаблон к эстимейту
    setEstimate({
      ...estimate,
      items: template.items
    });
  }}
  currentEstimate={estimate}
/>
```

### EstimateVersionManager
```tsx
<EstimateVersionManager
  open={versionManagerOpen}
  onClose={() => setVersionManagerOpen(false)}
  currentVersion={currentVersion}
  versions={versions}
  onCreateVersion={(notes) => {
    // Создаем новую версию с примечаниями
    const newVersion = {
      ...currentEstimate,
      notes,
      version: incrementVersion(currentVersion)
    };
    saveVersion(newVersion);
  }}
  onRestoreVersion={(version) => {
    // Восстанавливаем выбранную версию
    setEstimate(version);
  }}
  onCompareVersions={(v1, v2) => {
    // Открываем диалог сравнения версий
    setComparisonVersions([v1, v2]);
    setComparisonOpen(true);
  }}
/>
```

### EstimateVersionComparison
```tsx
<EstimateVersionComparison
  open={comparisonOpen}
  onClose={() => setComparisonOpen(false)}
  version1={comparisonVersions[0]}
  version2={comparisonVersions[1]}
  onSelectVersion={(version) => {
    // Применяем выбранную версию
    setEstimate(version);
    setComparisonOpen(false);
  }}
/>
```
