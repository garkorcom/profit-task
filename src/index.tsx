import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('[DEBUG] index.tsx loaded');

const rootElement = document.getElementById('root');
console.log('[DEBUG] Root element:', rootElement);

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  console.log('[DEBUG] React root created');

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[DEBUG] App rendered');
} else {
  console.error('[DEBUG] Root element not found!');
}