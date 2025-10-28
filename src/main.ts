import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerIpcHandlers } from './main/ipcHandlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

/**
 * Creates the main application window with ollo specifications:
 * - 1200x800px initial size, centered on screen
 * - Minimum size 1280x720px (per prd-v1.md requirements)
 * - Context isolation enabled for security
 * - Title set to "ollo"
 */
const createWindow = () => {
  // Create the browser window with ollo specifications
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1280,
    minHeight: 720,
    title: 'ollo',
    center: true,
    webPreferences: {
      contextIsolation: true, // Required for security (prd-v1.md)
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow loading local video files via file:// protocol
      // Note: This is acceptable for MVP as we only load user-selected local files
      // Consider implementing custom protocol handler for production
    },
  });

  // Load the index.html of the app (Vite handles dev vs production)
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Create window when Electron is ready
app.on('ready', () => {
  console.log('[Main] App ready, registering IPC handlers...');
  // Register IPC handlers before creating window
  try {
    registerIpcHandlers();
    console.log('[Main] IPC handlers registered successfully');
  } catch (error) {
    console.error('[Main] Failed to register IPC handlers:', error);
  }
  createWindow();
});

// Quit when all windows are closed, except on macOS
// On macOS, apps stay active until explicitly quit with Cmd + Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked and no windows open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
