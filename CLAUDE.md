# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Start development server
- `npm run build` - Build for production  
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)

## Architecture Overview

This is a React TypeScript business management application built with Create React App and Firebase. The app provides project management, time tracking, estimates, counterparty management, and inventory features.

### Core Tech Stack
- **Frontend**: React 19 + TypeScript + Material-UI v7
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Routing**: React Router v7
- **State Management**: Context API (AuthContext, TimeTrackingContext)
- **UI Framework**: Material-UI with custom green theme

### Project Structure
```
src/
├── api/           # Firebase API layer (separate files per domain)
├── auth/          # Authentication components and context
├── components/    # Reusable UI components
├── contexts/      # React contexts for global state
├── firebase/      # Firebase configuration
├── hooks/         # Custom React hooks
├── pages/         # Page components (main views)
├── router/        # App routing configuration
├── types/         # TypeScript type definitions
└── utils/         # Utility functions and helpers
```

### Key Architecture Patterns

**API Layer**: Each domain has its own API file (e.g., `projectApi.ts`, `counterpartyApi.ts`) containing CRUD operations for Firebase collections.

**Routing**: Centralized in `AppRouter.tsx` with private routes protected by `PrivateRoute` component. All authenticated routes wrapped in `MainLayout`.

**Authentication**: Firebase Auth with `AuthContext` providing user state and permissions system in `auth/permissions.ts`.

**Theme**: Custom Material-UI theme with green primary color (`#2e7d32`) defined in `App.tsx`.

**State Management**: Context-based for authentication and time tracking. Most other state is component-local or prop-drilled.

### Domain Models

The app manages several core entities:
- **Projects**: Business projects with estimates, tasks, and counterparties
- **Counterparties**: Clients and contractors (evolved from "contractors")  
- **Estimates**: Project cost estimates with versioning and templates
- **Tasks**: Work items with time tracking and status management
- **Time Entries**: Work session tracking with geolocation
- **Products/Inventory**: Stock management and warehouse operations

### Firebase Configuration

Requires `.env.local` file with Firebase config variables:
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
REACT_APP_FIREBASE_STORAGE_BUCKET=...
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### Important Notes

- The app uses Firebase hosting with automatic deployment via `firebase.json`
- Legacy "contractors" system has been migrated to "counterparties" 
- Time tracking includes geolocation and photo capture features
- Estimates system supports versioning, templates, and public sharing
- Multiple test pages exist in `/src/tests/` for development debugging
- Dev tools accessible at `/dev-tools` route for data operations

## Project Startability System

### Overview
Система стартуемости проектов определяет, можно ли начать работу над проектом/задачей, и предоставляет детальные причины блокировки.

### Core Components
- `utils/startability.ts` - Основная логика анализа стартуемости
- `components/startability/StartabilityIndicator.tsx` - UI компоненты для отображения
- `pages/StartWorkPage.tsx` - Интеграция с режимом "Все проекты"

### Startability Semantics

#### Project Status Classification
**Стартуемые статусы**: `idea`, `planning`, `active`, `on_hold`
**Заблокированные статусы**: `completed`, `cancelled`, `archived`

#### Task Status Classification  
**Заблокированные статусы задач**: `blocked`, `done`, `cancelled`, `archived`

#### Reason Codes
```typescript
export type StartabilityReasonCode =
  | 'PROJECT_STATUS_NOT_STARTABLE'      // Статус проекта не допускает старт
  | 'PROJECT_ON_HOLD'                   // Проект на удержании
  | 'NO_TASKS'                          // Нет задач в проекте
  | 'ALL_TASKS_BLOCKED'                 // Все задачи недоступны
  | 'NO_ESTIMATES'                      // Нет смет
  | 'MISSING_ASSIGNMENT'                // Нет назначенного исполнителя
  | 'MISSING_PERMISSIONS'               // Недостаточно прав
  | 'DEPENDENCIES_NOT_MET'              // Не выполнены зависимости
  | 'BUDGET_OR_APPROVAL_REQUIRED'       // Требуется бюджет/подтверждение
  | 'COMPLIANCE_HOLD'                   // Стоп по соответствию
```

### Key Functions
- `evaluateProjectStartability()` - Анализ стартуемости проекта
- `canStartWorkDetailed()` - Детальный анализ задачи
- `isProjectStatusStartable()` - Проверка статуса проекта
- `getReasonText()` / `getReasonIcon()` - Утилиты для UI

### UI Features
- **Режим просмотра**: "Все проекты" / "Только доступные"
- **Фильтрация**: по статусу, тексту поиска
- **Сортировка**: стартуемые сначала, потом по дате
- **Детали**: развернутые причины блокировки
- **Примеры**: заблокированные задачи (до 3 штук)

### Testing
Comprehensive test suite в `utils/__tests__/startability.test.ts` покрывает:
- Утилитные функции
- Детальный анализ задач  
- Оценку стартуемости проектов
- Интеграционные сценарии

### Usage Example
```typescript
import { evaluateProjectStartability } from '../utils/startability';

const startability = evaluateProjectStartability(project, tasks, estimates);
if (startability.startable) {
  // Можно начинать работу
} else {
  // Показать причины: startability.reasons
}
```