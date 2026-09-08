import './polyfills/iteratorPolyfill';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="Application Error" fallbackMessage="Review Master AI encountered an unexpected problem. Your data is safely stored locally.">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

