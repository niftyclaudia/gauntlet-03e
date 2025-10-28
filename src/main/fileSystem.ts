/**
 * File system utilities for ollo video editor
 * 
 * Handles temp directory setup and file path operations
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the thumbnails directory path
 * macOS: ~/Library/Application Support/ollo/thumbnails/
 */
export function getThumbnailDirectory(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'thumbnails');
}

/**
 * Ensure thumbnail directory exists, create if needed
 * @throws Error if directory cannot be created
 */
export function ensureThumbnailDirectory(): void {
  const thumbnailDir = getThumbnailDirectory();
  
  try {
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
      console.log(`[FileSystem] Created thumbnail directory: ${thumbnailDir}`);
    }
  } catch (error) {
    console.error('[FileSystem] Failed to create thumbnail directory:', error);
    throw new Error(`Failed to create thumbnail directory: ${error}`);
  }
}

/**
 * Validate that a file exists and is readable
 * @param filePath - Absolute path to file
 * @returns true if file is valid and readable
 */
export function validateFileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 * @param filePath - Absolute path to file
 * @returns File size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error('[FileSystem] Failed to get file size:', error);
    return 0;
  }
}

