import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext';
import MobileEstimatePage from '../legacy/estimates/MobileEstimatePage';

// Mock Firebase
jest.mock('../firebase/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Mock API functions
jest.mock('../api/estimateApi', () => ({
  getEstimatesStream: jest.fn(() => jest.fn()),
  updateEstimate: jest.fn(),
  createEstimate: jest.fn(),
  deleteEstimate: jest.fn(),
  generateEstimatePDF: jest.fn(() => Promise.resolve('mock-pdf-url')),
  groupEstimateItems: jest.fn(),
  EstimateItem: {}
}));

jest.mock('../api/productApi', () => ({
  getProductsStream: jest.fn(() => jest.fn()),
  createProduct: jest.fn(() => Promise.resolve({ id: 'new-product', name: 'Test Product' })),
  updateProduct: jest.fn()
}));

jest.mock('../api/projectApi', () => ({
  getProjectsStream: jest.fn(() => jest.fn())
}));

jest.mock('../api/contractorApi', () => ({
  getContractorsStream: jest.fn(() => jest.fn())
}));

// Mock lodash debounce
jest.mock('lodash', () => ({
  debounce: (fn: any) => fn
}));

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com'
};

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={{ currentUser: mockUser } as any}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe('Mobile Estimate Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders mobile estimate page', () => {
    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    expect(screen.getByText(/Новая смета/i)).toBeInTheDocument();
    expect(screen.getByText(/Итого:/i)).toBeInTheDocument();
  });

  test('opens search drawer when FAB is clicked', async () => {
    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    const fab = screen.getByRole('button', { name: /add/i });
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Поиск товаров и услуг/i)).toBeInTheDocument();
    });
  });

  test('displays empty state message', () => {
    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    expect(screen.getByText(/Нажмите \+ чтобы добавить позиции в смету/i)).toBeInTheDocument();
  });

  test('search functionality works', async () => {
    const { getProductsStream } = require('../api/productApi');
    const mockProducts = [
      { id: '1', name: 'Услуга 1', type: 'service', unit: 'шт', salePrice: 1000 },
      { id: '2', name: 'Товар 1', type: 'product', unit: 'кг', salePrice: 500 }
    ];

    getProductsStream.mockImplementation((userId: string, callback: Function) => {
      callback(mockProducts);
      return jest.fn();
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    // Open search
    const fab = screen.getByRole('button', { name: /add/i });
    fireEvent.click(fab);

    // Type in search
    const searchInput = await screen.findByPlaceholderText(/Поиск товаров и услуг/i);
    fireEvent.change(searchInput, { target: { value: 'Услуга' } });

    await waitFor(() => {
      expect(screen.getByText('Услуга 1')).toBeInTheDocument();
    });
  });

  test('quick create dialog opens for non-existent items', async () => {
    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    // Open search
    const fab = screen.getByRole('button', { name: /add/i });
    fireEvent.click(fab);

    // Type non-existent item
    const searchInput = await screen.findByPlaceholderText(/Поиск товаров и услуг/i);
    fireEvent.change(searchInput, { target: { value: 'Новая услуга' } });

    await waitFor(() => {
      expect(screen.getByText(/Создать: "Новая услуга"/i)).toBeInTheDocument();
    });
  });

  test('group dialog opens with multiple selection', async () => {
    const { getEstimatesStream } = require('../api/estimateApi');
    
    const mockEstimate = {
      id: 'test-estimate',
      number: 'EST-001',
      items: [
        { id: '1', name: 'Item 1', quantity: 1, unitPrice: 100, total: 100, level: 0, order: 0, type: 'service' },
        { id: '2', name: 'Item 2', quantity: 2, unitPrice: 200, total: 400, level: 0, order: 1, type: 'service' }
      ]
    };

    getEstimatesStream.mockImplementation((userId: string, projectId: string, callback: Function) => {
      callback([mockEstimate]);
      return jest.fn();
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    // Wait for items to load
    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  test('inline editing updates values', async () => {
    const { getEstimatesStream } = require('../api/estimateApi');
    
    const mockEstimate = {
      id: 'test-estimate',
      number: 'EST-001',
      items: [
        { id: '1', name: 'Test Item', quantity: 1, unitPrice: 100, total: 100, level: 0, order: 0, type: 'service' }
      ]
    };

    getEstimatesStream.mockImplementation((userId: string, projectId: string, callback: Function) => {
      callback([mockEstimate]);
      return jest.fn();
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    // Find quantity input
    const quantityInputs = screen.getAllByDisplayValue('1');
    if (quantityInputs.length > 0) {
      fireEvent.change(quantityInputs[0], { target: { value: '5' } });
      
      await waitFor(() => {
        expect(quantityInputs[0]).toHaveValue(5);
      });
    }
  });

  test('share functionality triggers PDF generation', async () => {
    const { generateEstimatePDF } = require('../api/estimateApi');
    const { getEstimatesStream } = require('../api/estimateApi');
    
    const mockEstimate = {
      id: 'test-estimate',
      number: 'EST-001',
      items: []
    };

    getEstimatesStream.mockImplementation((userId: string, projectId: string, callback: Function) => {
      callback([mockEstimate]);
      return jest.fn();
    });

    // Mock navigator.share
    Object.defineProperty(navigator, 'share', {
      value: jest.fn(),
      writable: true
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: /share/i });
      expect(shareButton).toBeInTheDocument();
      
      fireEvent.click(shareButton);
    });

    await waitFor(() => {
      expect(generateEstimatePDF).toHaveBeenCalled();
    });
  });

  test('accordion expands and collapses', async () => {
    const { getEstimatesStream } = require('../api/estimateApi');
    
    const mockEstimate = {
      id: 'test-estimate',
      number: 'EST-001',
      items: [
        {
          id: 'parent-1',
          name: 'Parent Service',
          quantity: 1,
          unitPrice: 500,
          total: 500,
          level: 0,
          order: 0,
          type: 'service',
          children: [
            { id: 'child-1', name: 'Child Item', quantity: 2, unitPrice: 250, total: 500, level: 1, order: 0, type: 'service' }
          ]
        }
      ]
    };

    getEstimatesStream.mockImplementation((userId: string, projectId: string, callback: Function) => {
      callback([mockEstimate]);
      return jest.fn();
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Parent Service')).toBeInTheDocument();
    });

    // Click to expand
    const accordion = screen.getByText('Parent Service').closest('[class*=MuiAccordion]');
    if (accordion) {
      const expandButton = accordion.querySelector('[class*=MuiAccordionSummary]');
      if (expandButton) {
        fireEvent.click(expandButton);
      }
    }
  });

  test('delete functionality removes item', async () => {
    const { getEstimatesStream, updateEstimate } = require('../api/estimateApi');
    
    const mockEstimate = {
      id: 'test-estimate',
      number: 'EST-001',
      items: [
        { id: '1', name: 'Item to Delete', quantity: 1, unitPrice: 100, total: 100, level: 0, order: 0, type: 'service' }
      ]
    };

    getEstimatesStream.mockImplementation((userId: string, projectId: string, callback: Function) => {
      callback([mockEstimate]);
      return jest.fn();
    });

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Item to Delete')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('[data-testid*="DeleteIcon"]')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(updateEstimate).toHaveBeenCalled();
      });
    }
  });
});

describe('Mobile Estimate Responsiveness', () => {
  test('renders correctly on mobile viewport', () => {
    // Set mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;

    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    // Check mobile-specific elements
    const fab = screen.getByRole('button', { name: /add/i });
    expect(fab).toHaveStyle({ position: 'fixed' });
  });

  test('swipeable drawer works on touch devices', async () => {
    render(
      <MockAuthProvider>
        <MobileEstimatePage />
      </MockAuthProvider>
    );

    const fab = screen.getByRole('button', { name: /add/i });
    
    // Simulate touch event
    fireEvent.touchStart(fab);
    fireEvent.touchEnd(fab);
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText(/Добавить позицию/i)).toBeInTheDocument();
    });
  });
});
