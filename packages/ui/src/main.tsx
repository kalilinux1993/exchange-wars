import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// PWA shell — production builds only (a dev service worker just causes confusion).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
    /* PWA is progressive — the game works fine without it */
  });
}
