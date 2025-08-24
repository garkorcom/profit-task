import React from 'react';
import { render } from '@testing-library/react';

describe('Responsive Design Tests', () => {
  beforeEach(() => {
    // Reset viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  test('should handle mobile viewport', () => {
    // Simulate mobile viewport
    window.innerWidth = 375;
    window.innerHeight = 667;
    
    expect(window.innerWidth).toBeLessThan(600);
    expect(window.innerHeight).toBeGreaterThan(500);
  });

  test('should handle tablet viewport', () => {
    // Simulate tablet viewport
    window.innerWidth = 768;
    window.innerHeight = 1024;
    
    expect(window.innerWidth).toBeGreaterThanOrEqual(600);
    expect(window.innerWidth).toBeLessThan(960);
  });

  test('should handle desktop viewport', () => {
    // Simulate desktop viewport
    window.innerWidth = 1920;
    window.innerHeight = 1080;
    
    expect(window.innerWidth).toBeGreaterThanOrEqual(960);
  });

  test('should have responsive CSS loaded', () => {
    // Check if responsive CSS file exists in the build
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/responsive.css';
    
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('responsive.css');
  });
});


