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

  /**
   * Saves project state to autosave.json file
   * @param state - SavedProjectState object to save
   * @returns Promise<void>
   * @throws Error if file write fails
   */
  saveProject: (state: any): Promise<void> => {
    return ipcRenderer.invoke('autosave:save', state);
  },

  /**
   * Loads project state from autosave.json file
   * @returns Promise<SavedProjectState | null> - state if file exists and is valid, null otherwise
   */
  loadProject: (): Promise<any | null> => {
    return ipcRenderer.invoke('autosave:load');
  },

  /**
   * Deletes autosave.json file
   * @returns Promise<void>
   */
  deleteAutosave: (): Promise<void> => {
    return ipcRenderer.invoke('autosave:delete');
  },

  /**
   * Gets autosave file age in milliseconds
   * @returns Promise<number | null> - age in milliseconds, or null if file doesn't exist
   */
  getAutosaveAge: (): Promise<number | null> => {
    return ipcRenderer.invoke('autosave:getAge');
  },

  /**
   * Shows restore dialog asking user to restore session
   * @param timestamp - ISO timestamp string to display
   * @returns Promise<'restore' | 'fresh' | null> - user choice or null if cancelled
   */
  showRestoreDialog: (timestamp: string): Promise<'restore' | 'fresh' | null> => {
    return ipcRenderer.invoke('autosave:showRestoreDialog', timestamp);
  },

  /**
   * Validates that a file path exists and is readable
   * @param filePath - Absolute path to file
   * @returns Promise<boolean> - true if file exists and is readable
   */
  validateFileExists: (filePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('file:validateExists', filePath);
  },

  /**
   * Trims a timeline clip by validating and committing trim values
   * @param clipId - UUID of timeline clip to trim
   * @param inPoint - Trim start point in seconds (trimStart)
   * @param outPoint - Trim end point in seconds (trimEnd)
   * @param clipDuration - Source clip duration in seconds (for validation)
   * @returns Promise<{ success: boolean; inPoint: number; outPoint: number }>
   * @throws Error if validation fails
   */
  trim: {
    trimClip: (
      clipId: string,
      inPoint: number,
      outPoint: number,
      clipDuration: number
    ): Promise<{ success: boolean; inPoint: number; outPoint: number }> => {
      return ipcRenderer.invoke('trim:trimClip', clipId, inPoint, outPoint, clipDuration);
    },
  },

  /**
   * Opens native save dialog for export file
   * @param defaultFilename - Default filename for export (e.g., "ollo_export_20250129_120000.mp4")
   * @returns Promise<string | null> - file path or null if cancelled
   */
  showSaveDialog: (defaultFilename: string): Promise<string | null> => {
    return ipcRenderer.invoke('export:showSaveDialog', defaultFilename);
  },

  /**
   * Starts video export process
   * @param clips - Timeline clips to export
   * @param libraryClips - Library clips for source files
   * @param outputPath - Output file path (absolute)
   * @param projectState - Optional project state for auto-save before export
   * @returns Promise<void>
   * @throws Error if export fails
   */
  exportVideo: (
    clips: any[],
    libraryClips: any[],
    outputPath: string,
    projectState?: any
  ): Promise<void> => {
    return ipcRenderer.invoke('export:start', clips, libraryClips, outputPath, projectState);
  },

  /**
   * Listens for export progress events
   * @param callback - Progress callback (0-100)
   * @returns Function to remove listener
   */
  onExportProgress: (callback: (progress: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: number) => {
      callback(progress);
    };
    ipcRenderer.on('export:progress', handler);
    return () => {
      ipcRenderer.removeListener('export:progress', handler);
    };
  },

  /**
   * Opens macOS Finder to file location
   * @param filePath - Absolute path to file
   * @returns Promise<void>
   */
  revealInFinder: (filePath: string): Promise<void> => {
    return ipcRenderer.invoke('export:revealInFinder', filePath);
  },
});
