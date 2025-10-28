/**
 * Renderer process entry point
 * 
 * This file initializes the React application and mounts it to the DOM.
 * The renderer process runs in a browser context with contextIsolation enabled.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Mount React app to the #root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found. Check index.html for <div id="root"></div>');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
