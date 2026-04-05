/** @format */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const urlParams = new URLSearchParams(window.location.search);
const key = urlParams.get('key');
if (key && !window.location.pathname.startsWith('/login')) {
  window.location.href = `/login?key=${encodeURIComponent(key)}`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
