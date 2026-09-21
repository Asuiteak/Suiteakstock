import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { TimeProvider } from './context/TimeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TimeProvider>
      <App />
    </TimeProvider>
  </StrictMode>,
);
