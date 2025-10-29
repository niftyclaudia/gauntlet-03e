/**
 * TypeScript definitions for window.electron API
 * 
 * This file provides type safety for the Electron API exposed via contextBridge
 * in preload.ts. As IPC handlers are added in future PRs, update this interface.
 */

import { VideoMetadata, SavedProjectState, TimelineClip, VideoClip } from '../../types/video';

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
  
  /**
   * Saves project state to autosave.json file
   * @param state - SavedProjectState object to save
   * @returns Promise<void>
   * @throws Error if file write fails
   */
  saveProject: (state: SavedProjectState) => Promise<void>;
  
  /**
   * Loads project state from autosave.json file
   * @returns Promise<SavedProjectState | null> - state if file exists and is valid, null otherwise
   */
  loadProject: () => Promise<SavedProjectState | null>;
  
  /**
   * Deletes autosave.json file
   * @returns Promise<void>
   */
  deleteAutosave: () => Promise<void>;
  
  /**
   * Gets autosave file age in milliseconds
   * @returns Promise<number | null> - age in milliseconds, or null if file doesn't exist
   */
  getAutosaveAge: () => Promise<number | null>;
  
  /**
   * Shows restore dialog asking user to restore session
   * @param timestamp - ISO timestamp string to display
   * @returns Promise<'restore' | 'fresh' | null> - user choice or null if cancelled
   */
  showRestoreDialog: (timestamp: string) => Promise<'restore' | 'fresh' | null>;
  
  /**
   * Validates that a file path exists and is readable
   * @param filePath - Absolute path to file
   * @returns Promise<boolean> - true if file exists and is readable
   */
  validateFileExists: (filePath: string) => Promise<boolean>;

  /**
   * Trims a timeline clip by validating and committing trim values
   */
  trim: {
    /**
     * Validates and returns trim values for a timeline clip
     * @param clipId - UUID of timeline clip to trim
     * @param inPoint - Trim start point in seconds (trimStart)
     * @param outPoint - Trim end point in seconds (trimEnd)
     * @param clipDuration - Source clip duration in seconds (for validation)
     * @returns Promise with validated trim values
     * @throws Error if validation fails
     */
    trimClip: (
      clipId: string,
      inPoint: number,
      outPoint: number,
      clipDuration: number
    ) => Promise<{ success: boolean; inPoint: number; outPoint: number }>;
  };

  /**
   * Opens native save dialog for export file
   * @param defaultFilename - Default filename for export
   * @returns Promise with file path or null if cancelled
   */
  showSaveDialog: (defaultFilename: string) => Promise<string | null>;

  /**
   * Starts video export process
   * @param clips - Timeline clips to export
   * @param libraryClips - Library clips for source files
   * @param outputPath - Output file path (absolute)
   * @param projectState - Optional project state for auto-save before export
   * @returns Promise that resolves when export completes
   * @throws Error if export fails
   */
  exportVideo: (
    clips: TimelineClip[],
    libraryClips: VideoClip[],
    outputPath: string,
    projectState?: SavedProjectState
  ) => Promise<void>;

  /**
   * Listens for export progress events
   * @param callback - Progress callback (0-100)
   * @returns Function to remove listener
   */
  onExportProgress: (callback: (progress: number) => void) => (() => void);

  /**
   * Opens macOS Finder to file location
   * @param filePath - Absolute path to file
   * @returns Promise<void>
   */
  revealInFinder: (filePath: string) => Promise<void>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

