/**
 * TypeScript definitions for window.electron API
 * 
 * This file provides type safety for the Electron API exposed via contextBridge
 * in preload.ts. As IPC handlers are added in future PRs, update this interface.
 */

import { VideoMetadata } from '../../types/video';

export interface ElectronAPI {
  /**
   * Opens native file picker dialog filtered to video files
   * @returns Array of selected file paths (empty if cancelled)
   */
  selectFiles: () => Promise<string[]>;
  
  /**
   * Gets file size in bytes
   * @param filePath - Absolute path to file
   * @returns File size in bytes (0 if error)
   */
  getFileSize: (filePath: string) => Promise<number>;
  
  /**
   * Extracts video metadata using FFmpeg
   * @param filePath - Absolute path to video file
   * @returns Video metadata (duration, resolution, framerate, codec)
   * @throws Error if file unreadable or FFmpeg fails
   */
  getMetadata: (filePath: string) => Promise<VideoMetadata>;
  
  /**
   * Generates thumbnail from video file using FFmpeg
   * @param filePath - Absolute path to video file
   * @param clipId - UUID for thumbnail filename
   * @returns Absolute path to generated thumbnail JPEG
   * @throws Error if FFmpeg fails or directory not writable
   */
  getThumbnail: (filePath: string, clipId: string) => Promise<string>;
  
  /**
   * Reads thumbnail file and returns as base64 data URL
   * @param thumbnailPath - Absolute path to thumbnail file
   * @returns Data URL string (data:image/jpeg;base64,...)
   */
  getThumbnailDataUrl: (thumbnailPath: string) => Promise<string>;
  
  /**
   * Get file path from File object (for drag-and-drop)
   * @param file - File object from drag-and-drop
   * @returns Absolute file path
   */
  getPathForFile: (file: File) => string;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

