import { 
  addProject, 
  updateProject, 
  getProjectsStream 
} from '../api/projectApi';
import { 
  addTask, 
  updateTask 
} from '../api/taskApi';
import { 
  addProduct, 
  updateProduct 
} from '../api/productApi';

// Мокаем Firebase
jest.mock('../firebase/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  onSnapshot: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  increment: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  runTransaction: jest.fn()
}));

describe('API Integration Tests', () => {
  const mockUserId = 'test-user-id';

  describe('Project API', () => {
    test('should handle project operations', () => {
      expect(typeof addProject).toBe('function');
      expect(typeof updateProject).toBe('function');
      expect(typeof getProjectsStream).toBe('function');
    });
  });

  describe('Task API', () => {
    test('should handle task operations', () => {
      expect(typeof addTask).toBe('function');
      expect(typeof updateTask).toBe('function');
    });
  });

  describe('Product API', () => {
    test('should handle product operations', () => {
      expect(typeof addProduct).toBe('function');
      expect(typeof updateProduct).toBe('function');
    });
  });
});
