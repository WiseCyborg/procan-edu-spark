import { toast } from 'sonner';

// Register service worker for PWA functionality
export const registerServiceWorker = async (): Promise<void> => {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    try {
      const buildId = import.meta.env.VITE_BUILD_ID || 'dev';
      const registration = await navigator.serviceWorker.register(
        `/service-worker.js?v=${buildId}`
      );
      console.log('Service Worker registered successfully:', registration);

      // Reload exactly once when the new worker takes control.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Also check whenever the tab becomes visible again
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Non-blocking prompt: never force a reload (a learner may be mid-exam).
              toast('A new version of ProCann Edu is available', {
                description: 'Reload when you are ready — your current page will refresh.',
                duration: Infinity,
                action: {
                  label: 'Reload',
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Show push notification (for testing)
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        ...options,
      });
    });
  }
};

// Check if app is installed as PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Prompt user to install PWA
export const promptPWAInstall = (): void => {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install button to user
    const installButton = document.getElementById('pwa-install-button');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
          }
          deferredPrompt = null;
        });
      });
    }
  });
};
