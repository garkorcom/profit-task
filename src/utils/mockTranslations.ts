// Temporary mock translation function for development
// Supports both t(key) and t(key, params) signatures used in components
export const t = (key?: string, paramsOrFallback?: any): string => {
  // Handle cases where key might be undefined or the function is called without args
  if (!key || typeof key !== 'string') return '';
  
  // Mock translations mapping
  const translations: Record<string, string> = {
    'startability.entity': 'Сущность',
    'startability.assign.select_assignee': 'Выберите исполнителя',
    'startability.assign.notes': 'Заметки',
    'startability.assign.notes_placeholder': 'Добавьте комментарий...',
    'startability.assign.will_assign_to': 'Будет назначен на {{name}}',
    'startability.assign.assign_button': 'Назначить',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'startability.approval.type': 'Тип подтверждения',
    'startability.approval.client': 'Клиент',
    'startability.approval.manager': 'Менеджер',
    'startability.approval.budget': 'Бюджет',
    'startability.approval.priority': 'Приоритет',
    'startability.approval.normal': 'Обычный',
    'startability.approval.urgent': 'Срочный',
    'startability.approval.message': 'Сообщение',
    'startability.approval.message_placeholder': 'Опишите запрос...',
    'startability.approval.preview': 'Предварительный просмотр',
    'startability.approval.send_request': 'Отправить запрос',
    'startability.cell.loading': 'Загрузка...',
    'startability.status.ready': 'Готов',
    'startability.status.blocked': 'Заблокирован',
    'startability.status.attention': 'Внимание',
    'startability.cell.details_title': 'Детали стартуемости',
    'startability.cell.no_issues': 'Нет проблем',
    'startability.cell.view_details': 'Подробнее',
    'startability.categories.task': 'Задача',
    'startability.categories.business': 'Бизнес',
    'startability.categories.permissions': 'Права доступа',
    'startability.header.evaluating': 'Анализируем...',
    'startability.overall.ready': 'Готов к работе',
    'startability.overall.blocked': 'Заблокирован',
    'startability.overall.attention': 'Требует внимания',
    'startability.severity.critical': 'критических',
    'startability.severity.warning': 'предупреждений',
    'startability.severity.info': 'информационных',
    'startability.header.view_details': 'Подробности',
    'startability.header.refresh': 'Обновить',
    'startability.header.details': 'Детали',
    'startability.header.send_estimate': 'Отправить смету',
    'startability.header.convert_contract': 'Преобразовать в договор',
    'startability.header.blocked_send_tooltip': 'Нельзя отправить пока есть критические проблемы',
    'startability.header.blocked_convert_tooltip': 'Нельзя преобразовать пока есть критические проблемы',
    'startability.header.critical_alert_title': 'Критические проблемы',
    'startability.header.critical_alert_description': 'Найдено {{count}} критических проблем',
    'startability.header.warning_alert_description': 'Найдено {{count}} предупреждений',
    'startability.header.ready_description': 'Готово к работе ({{count}} элементов)',
    'startability.header.quick_overview': 'Быстрый обзор',
    'startability.header.more_issues': 'Еще {{count}} проблем...',
    'startability.header.no_issues': 'Нет проблем',
    'startability.header.view_all_details': 'Показать все детали',
    
    // Sidebar translations
    'startability.sidebar.loading': 'Загрузка...',
    'startability.sidebar.title': 'Анализ стартуемости',
    'startability.sidebar.subtitle': 'Проект {{projectId}}',
    'startability.sidebar.refresh': 'Обновить анализ',
    'startability.tabs.issues': 'Проблемы',
    'startability.tabs.actions': 'Действия',
    'startability.overview.startable_items': '{{startable}} из {{total}} готовы',
    'startability.actions.start_work': 'Начать работу',
    'startability.no_issues.title': 'Все готово к работе!',
    'startability.no_issues.description': 'Проблем не найдено',
    'startability.actions.no_actions_needed': 'Действия не требуются',
    'startability.actions.priority_actions': 'Приоритетные действия',
    
    // CTA translations
    'startability.cta.assign_user': 'Назначить пользователя',
    'startability.cta.request_approval': 'Запросить одобрение',
    'startability.cta.view_dependency': 'Посмотреть зависимость',
    'startability.cta.view_dependencies': 'Посмотреть зависимости',
    'startability.cta.upload_document': 'Загрузить документ',
    'startability.cta.navigate': 'Перейти',
    'startability.cta.complete_estimate_block': 'Завершить блок сметы',
    'startability.cta.approve_estimate': 'Одобрить смету',
    'startability.cta.resolve_materials': 'Решить вопрос материалов',
    'startability.cta.change_project_status': 'Изменить статус проекта',
    'startability.cta.assign': 'Назначить',
    'startability.cta.open_compliance': 'Открыть соответствие',
    'startability.cta.open_permits': 'Открыть разрешения',
    'startability.cta.assign_user_title': 'Назначить исполнителя',
    'startability.cta.request_approval_title': 'Запросить подтверждение',
    'startability.cta.view_dependencies_title': 'Просмотр зависимостей',
    'startability.cta.compliance_title': 'Соответствие требованиям',
    
    // Dependencies translations
    'startability.dependencies.blocking_tasks': 'Блокирующие задачи',
    'startability.dependencies.view': 'Просмотр',
    'startability.dependencies.mark_complete': 'Отметить выполненным',
    'startability.dependencies.status.pending': 'ожидает',
    'startability.dependencies.status.in_progress': 'в работе',
    'startability.dependencies.status.completed': 'выполнено',
    
    // Compliance translations
    'startability.compliance.description': 'Требуется соблюдение нормативных требований перед началом работ',
    'startability.compliance.permits': 'Разрешения на работы',
    'startability.compliance.insurance': 'Страхование ответственности',
    'startability.compliance.safety': 'Требования безопасности',
    'startability.compliance.open_module': 'Открыть модуль',
    'startability.compliance.mark_resolved': 'Отметить выполненным',
  };

  // Simple parameter substitution
  let result = translations[key] || key;
  
  // Handle both parameter object and fallback string patterns
  if (paramsOrFallback) {
    if (typeof paramsOrFallback === 'object') {
      // It's a parameters object - do template substitution
      Object.entries(paramsOrFallback).forEach(([paramKey, value]) => {
        result = result.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(value));
      });
    } else if (typeof paramsOrFallback === 'string' && !translations[key]) {
      // It's a fallback string and we don't have a translation
      result = paramsOrFallback;
    }
  }

  return result;
};