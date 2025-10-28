/**
 * Electron IPC handlers for video operations
 * 
 * These handlers are invoked from the renderer process via window.electron API
 */

import { ipcMain, dialog } from 'electron';
import { extractMetadata, generateThumbnail } from './ffmpeg';
import { validateFileExists, ensureThumbnailDirectory, getFileSize } from './fileSystem';
import { VideoMetadata } from '../types/video';

/**
 * Register all IPC handlers
 * Called from main.ts on app initialization
 */
export function registerIpcHandlers(): void {
  console.log('[IPC] Starting handler registration...');
  
  // Ensure thumbnail directory exists before handling any requests
  try {
    ensureThumbnailDirectory();
    console.log('[IPC] Thumbnail directory initialized');
  } catch (error) {
    console.error('[IPC] Failed to initialize thumbnail directory:', error);
  }

  /**
   * Handler: file:select
   * Opens native file picker dialog filtered to video files
   * Returns: Array of selected file paths (empty if cancelled)
   */
  ipcMain.handle('file:select', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Video Files', extensions: ['mp4', 'mov'] }
        ],
        title: 'Select Video Files'
      });

      if (result.canceled) {
        return [];
      }

      console.log(`[IPC] Selected files:`, result.filePaths);
      return result.filePaths;
    } catch (error) {
      console.error('[IPC] File selection error:', error);
      throw new Error(`Failed to open file picker: ${error}`);
    }
  });

  /**
   * Handler: file:getFileSize
   * Gets file size in bytes
   * Params: filePath (string)
   * Returns: File size in bytes (0 if error)
   */
  ipcMain.handle('file:getFileSize', async (_event, filePath: string): Promise<number> => {
    try {
      // Validate file exists
      if (!validateFileExists(filePath)) {
        throw new Error(`File not found or not readable: ${filePath}`);
      }

      const size = getFileSize(filePath);
      return size;
    } catch (error) {
      console.error('[IPC] Failed to get file size:', error);
      return 0;
    }
  });

  /**
   * Handler: file:getMetadata
   * Extracts video metadata using FFmpeg
   * Params: filePath (string)
   * Returns: VideoMetadata object
   */
  ipcMain.handle('file:getMetadata', async (_event, filePath: string): Promise<VideoMetadata> => {
    try {
      // Validate file exists and is readable
      if (!validateFileExists(filePath)) {
        throw new Error(`File not found or not readable: ${filePath}`);
      }

      // Extract metadata using FFmpeg
      const metadata = await extractMetadata(filePath);
      return metadata;
    } catch (error) {
      console.error('[IPC] Metadata extraction error:', error);
      throw new Error(`Failed to extract metadata: ${error}`);
    }
  });

  /**
   * Handler: file:getThumbnail
   * Generates thumbnail from video file using FFmpeg
   * Params: filePath (string), clipId (string)
   * Returns: Absolute path to generated thumbnail JPEG
   */
  ipcMain.handle('file:getThumbnail', async (_event, filePath: string, clipId: string): Promise<string> => {
    try {
      // Validate file exists and is readable
      if (!validateFileExists(filePath)) {
        throw new Error(`File not found or not readable: ${filePath}`);
      }

      // Generate thumbnail using FFmpeg
      const thumbnailPath = await generateThumbnail(filePath, clipId);
      return thumbnailPath;
    } catch (error) {
      console.error('[IPC] Thumbnail generation error:', error);
      throw new Error(`Failed to generate thumbnail: ${error}`);
    }
  });

  /**
   * Handler: file:getThumbnailDataUrl
   * Reads thumbnail file and returns as base64 data URL
   * Params: thumbnailPath (string)
   * Returns: Data URL string
   */
  ipcMain.handle('file:getThumbnailDataUrl', async (_event, thumbnailPath: string): Promise<string> => {
    try {
      const fs = require('fs');
      
      // Validate file exists
      if (!validateFileExists(thumbnailPath)) {
        throw new Error(`Thumbnail file not found: ${thumbnailPath}`);
      }

      // Read file as base64
      const imageBuffer = fs.readFileSync(thumbnailPath);
      const base64Image = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      return dataUrl;
    } catch (error) {
      console.error('[IPC] Failed to read thumbnail:', error);
      throw new Error(`Failed to read thumbnail: ${error}`);
    }
  });

  console.log('[IPC] All handlers registered successfully');
}

