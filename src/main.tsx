import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { monitoring } from '@/lib/monitoring'

// Initialize production monitoring
monitoring.initialize();

createRoot(document.getElementById("root")!).render(<App />);
