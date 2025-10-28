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

/**
 * Get the autosave file path
 * macOS: ~/Library/Application Support/ollo/autosave.json
 */
export function getAutosavePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'autosave.json');
}

/**
 * Ensure autosave directory exists (Application Support/ollo/)
 * Creates directory if needed
 * @throws Error if directory cannot be created
 */
export function ensureAutosaveDirectory(): void {
  const userDataPath = app.getPath('userData');
  
  try {
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
      console.log(`[FileSystem] Created Application Support directory: ${userDataPath}`);
    }
  } catch (error) {
    console.error('[FileSystem] Failed to create Application Support directory:', error);
    throw new Error(`Failed to create Application Support directory: ${error}`);
  }
}

/**
 * Read autosave file and parse JSON
 * @returns Parsed JSON object or null if file doesn't exist or is invalid
 */
export function readAutosaveFile(): any | null {
  const autosavePath = getAutosavePath();
  
  try {
    if (!fs.existsSync(autosavePath)) {
      return null;
    }
    
    const fileContent = fs.readFileSync(autosavePath, 'utf-8');
    const parsed = JSON.parse(fileContent);
    return parsed;
  } catch (error) {
    // File doesn't exist, is corrupted, or parse failed
    console.error('[FileSystem] Failed to read autosave file:', error);
    return null;
  }
}

/**
 * Write autosave file (serialize object to JSON)
 * Ensures directory exists before writing
 * @param state - Object to serialize to JSON
 * @throws Error if write fails
 */
export function writeAutosaveFile(state: any): void {
  try {
    ensureAutosaveDirectory();
    const autosavePath = getAutosavePath();
    const jsonString = JSON.stringify(state, null, 2);
    fs.writeFileSync(autosavePath, jsonString, 'utf-8');
    console.log(`[FileSystem] Autosave file written: ${autosavePath}`);
  } catch (error) {
    console.error('[FileSystem] Failed to write autosave file:', error);
    throw new Error(`Failed to write autosave file: ${error}`);
  }
}

/**
 * Delete autosave file if it exists
 * Handles file not found gracefully (no error)
 */
export function deleteAutosaveFile(): void {
  const autosavePath = getAutosavePath();
  
  try {
    if (fs.existsSync(autosavePath)) {
      fs.unlinkSync(autosavePath);
      console.log(`[FileSystem] Autosave file deleted: ${autosavePath}`);
    }
  } catch (error) {
    // File doesn't exist or already deleted - that's OK
    console.error('[FileSystem] Failed to delete autosave file:', error);
  }
}

/**
 * Get autosave file age in milliseconds
 * @returns Age in milliseconds, or null if file doesn't exist
 */
export function getAutosaveFileAge(): number | null {
  const autosavePath = getAutosavePath();
  
  try {
    if (!fs.existsSync(autosavePath)) {
      return null;
    }
    
    const stats = fs.statSync(autosavePath);
    const mtime = stats.mtime.getTime();
    const now = Date.now();
    const age = now - mtime;
    
    return age;
  } catch (error) {
    console.error('[FileSystem] Failed to get autosave file age:', error);
    return null;
  }
}

