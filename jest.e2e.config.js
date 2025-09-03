/**
 * Jest конфигурация для E2E тестов Include_Mode логики
 * Настройки для работы с Firebase Emulator Suite
 */

module.exports = {
  displayName: 'E2E Tests',
  testMatch: ['<rootDir>/src/tests/e2e/**/*.test.ts'],
  testEnvironment: 'jsdom',
  
  // Увеличенные таймауты для E2E тестов
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/src/tests/e2e/setup.ts'],
  
  // Модули для работы с Firebase
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Трансформация TypeScript файлов
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Настройки покрытия кода
  collectCoverageFrom: [
    'src/utils/timeValidation.ts',
    'src/components/time/**/*.{ts,tsx}',
    'src/components/estimates/**/*.{ts,tsx}',
    'src/contexts/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**/*'
  ],
  
  // Игнорируем node_modules кроме Firebase SDK
  transformIgnorePatterns: [
    'node_modules/(?!(firebase|@firebase)/)'
  ],
  
  // Переменные окружения для тестов
  setupFiles: ['<rootDir>/src/tests/e2e/env.setup.js'],
  
  // Настройки для работы с DOM
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Очистка моков между тестами
  clearMocks: true,
  restoreMocks: true,
  
  // Глобальные переменные для Firebase Emulator
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    },
    FIREBASE_EMULATOR: true,
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099'
  }
};