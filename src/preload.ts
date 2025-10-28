/**
 * Preload script - bridges main and renderer processes via contextBridge
 * 
 * Context isolation is enabled for security (see main.ts)
 * This exposes a controlled API to the renderer via window.electron
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Expose electron API to renderer process
// Provides type-safe bridge to main process IPC handlers
contextBridge.exposeInMainWorld('electron', {
  /**
   * Opens native file picker dialog filtered to video files
   * @returns Array of selected file paths (empty if cancelled)
   */
  selectFiles: (): Promise<string[]> => {
    return ipcRenderer.invoke('file:select');
  },

  /**
   * Gets file size in bytes
   * @param filePath - Absolute path to file
   * @returns File size in bytes (0 if error)
   */
  getFileSize: (filePath: string): Promise<number> => {
    return ipcRenderer.invoke('file:getFileSize', filePath);
  },

  /**
   * Extracts video metadata using FFmpeg
   * @param filePath - Absolute path to video file
   * @returns Video metadata (duration, resolution, framerate, codec)
   * @throws Error if file unreadable or FFmpeg fails
   */
  getMetadata: (filePath: string) => {
    return ipcRenderer.invoke('file:getMetadata', filePath);
  },

  /**
   * Generates thumbnail from video file using FFmpeg
   * @param filePath - Absolute path to video file
   * @param clipId - UUID for thumbnail filename
   * @returns Absolute path to generated thumbnail JPEG
   * @throws Error if FFmpeg fails or directory not writable
   */
  getThumbnail: (filePath: string, clipId: string): Promise<string> => {
    return ipcRenderer.invoke('file:getThumbnail', filePath, clipId);
  },

  /**
   * Reads thumbnail file and returns as base64 data URL
   * @param thumbnailPath - Absolute path to thumbnail file
   * @returns Data URL string
   */
  getThumbnailDataUrl: (thumbnailPath: string): Promise<string> => {
    return ipcRenderer.invoke('file:getThumbnailDataUrl', thumbnailPath);
  },

  /**
   * Get file path from File object (for drag-and-drop)
   * @param file - File object from drag-and-drop
   * @returns Absolute file path
   */
  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file);
  },
});
