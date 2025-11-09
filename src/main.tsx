import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { monitoring } from '@/lib/monitoring'
import { registerServiceWorker, promptPWAInstall } from '@/lib/pwa-registration'

// Initialize production monitoring
monitoring.initialize();

// Register PWA service worker
registerServiceWorker();

// Setup PWA install prompt
promptPWAInstall();

// Global error handlers for debugging
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    promise: event.promise
  });
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  console.log('[App] Starting React render...');
  createRoot(rootElement).render(<App />);
  console.log('[App] React render initiated successfully');
} catch (error) {
  console.error('[App] Fatal error during initialization:', error);
  document.body.innerHTML = `
    <div style="padding: 40px; max-width: 600px; margin: 0 auto; font-family: system-ui;">
      <h1 style="color: #dc2626;">Application Failed to Start</h1>
      <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
      <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap;">${error instanceof Error ? error.stack : ''}</pre>
      <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}
