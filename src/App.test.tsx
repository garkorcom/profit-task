import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app loading state', () => {
  render(<App />);
  const loadingSpinner = screen.getByRole('progressbar');
  expect(loadingSpinner).toBeInTheDocument();
});
