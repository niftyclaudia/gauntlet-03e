/**
 * Preload script - bridges main and renderer processes via contextBridge
 * 
 * Context isolation is enabled for security (see main.ts)
 * This exposes a controlled API to the renderer via window.electron
 * 
 * IPC handlers will be added in future PRs (PR-2+) for:
 * - Video metadata extraction
 * - Thumbnail generation
 * - Video export
 * - File system operations
 */

import { contextBridge } from 'electron';

// Expose electron API to renderer process
// Structure is set up now, handlers will be added in PR-2+
contextBridge.exposeInMainWorld('electron', {
  // Placeholder for future IPC handlers
  // Example: extractVideoMetadata: (filePath: string) => ipcRenderer.invoke('extract-metadata', filePath)
});
