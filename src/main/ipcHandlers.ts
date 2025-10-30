/**
 * Electron IPC handlers for video operations
 * 
 * These handlers are invoked from the renderer process via window.electron API
 */

import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import { extractMetadata, generateThumbnail, exportVideoSequence, calculateExportSettings } from './ffmpeg';
import { 
  validateFileExists, 
  ensureThumbnailDirectory, 
  getFileSize,
  writeAutosaveFile,
  readAutosaveFile,
  deleteAutosaveFile,
  getAutosaveFileAge
} from './fileSystem';
import { VideoMetadata, SavedProjectState, TimelineClip, VideoClip, AdvancedExportSettings } from '../types/video';
import * as path from 'path';
import * as os from 'os';

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

  /**
   * Handler: autosave:save
   * Saves project state to autosave.json file
   * Params: state (SavedProjectState)
   * Returns: Promise<void>
   * Errors: Throws Error if file write fails
   */
  ipcMain.handle('autosave:save', async (_event, state: SavedProjectState): Promise<void> => {
    try {
      writeAutosaveFile(state);
    } catch (error) {
      console.error('[IPC] Failed to save autosave file:', error);
      throw new Error(`Failed to save autosave file: ${error}`);
    }
  });

  /**
   * Handler: autosave:load
   * Loads project state from autosave.json file
   * Returns: Promise<SavedProjectState | null>
   * Errors: Returns null if file doesn't exist or is invalid
   */
  ipcMain.handle('autosave:load', async (): Promise<SavedProjectState | null> => {
    try {
      const state = readAutosaveFile();
      return state;
    } catch (error) {
      console.error('[IPC] Failed to load autosave file:', error);
      return null;
    }
  });

  /**
   * Handler: autosave:delete
   * Deletes autosave.json file
   * Returns: Promise<void>
   * Errors: Handles gracefully if file doesn't exist
   */
  ipcMain.handle('autosave:delete', async (): Promise<void> => {
    try {
      deleteAutosaveFile();
    } catch (error) {
      console.error('[IPC] Failed to delete autosave file:', error);
      // Don't throw - deletion failure is not critical
    }
  });

  /**
   * Handler: autosave:getAge
   * Gets autosave file age in milliseconds
   * Returns: Promise<number | null> (age in milliseconds, null if file doesn't exist)
   * Errors: Returns null if file doesn't exist
   */
  ipcMain.handle('autosave:getAge', async (): Promise<number | null> => {
    try {
      const age = getAutosaveFileAge();
      return age;
    } catch (error) {
      console.error('[IPC] Failed to get autosave file age:', error);
      return null;
    }
  });

  /**
   * Handler: autosave:showRestoreDialog
   * Shows native dialog asking user to restore session
   * Params: timestamp (string) - ISO timestamp to display
   * Returns: Promise<'restore' | 'fresh' | null> - user choice or null if cancelled
   */
  ipcMain.handle('autosave:showRestoreDialog', async (_event, timestamp: string): Promise<'restore' | 'fresh' | null> => {
    try {
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Restore', 'Start Fresh'],
        defaultId: 0,
        cancelId: 1,
        title: 'Restore previous session?',
        message: `Would you like to restore your previous editing session?`,
        detail: `Last saved: ${new Date(timestamp).toLocaleString()}`,
      });

      if (result.response === 0) {
        return 'restore';
      } else {
        return 'fresh';
      }
    } catch (error) {
      console.error('[IPC] Failed to show restore dialog:', error);
      return null;
    }
  });

  /**
   * Handler: file:validateExists
   * Validates that a file path exists and is readable
   * Params: filePath (string)
   * Returns: Promise<boolean>
   */
  ipcMain.handle('file:validateExists', async (_event, filePath: string): Promise<boolean> => {
    try {
      return validateFileExists(filePath);
    } catch (error) {
      console.error('[IPC] Failed to validate file exists:', error);
      return false;
    }
  });

  /**
   * Handler: trim:trimClip
   * Validates trim values for a timeline clip
   * Params: clipId (string), inPoint (number), outPoint (number), clipDuration (number)
   * Returns: Promise<{ success: boolean; inPoint: number; outPoint: number }>
   * Errors: Throws Error if validation fails
   * 
   * Note: This handler validates trim values only. The renderer ensures the clip exists
   * before calling. clipDuration is provided to validate trimEnd doesn't exceed source duration.
   */
  ipcMain.handle('trim:trimClip', async (
    _event, 
    clipId: string, 
    inPoint: number, 
    outPoint: number,
    clipDuration: number
  ): Promise<{ success: boolean; inPoint: number; outPoint: number }> => {
    try {
      // Validate clipId is provided
      if (!clipId || typeof clipId !== 'string') {
        throw new Error(`Invalid clipId: ${clipId}`);
      }

      // Validate inPoint and outPoint are numbers
      if (typeof inPoint !== 'number' || isNaN(inPoint)) {
        throw new Error(`Invalid inPoint: ${inPoint}`);
      }
      if (typeof outPoint !== 'number' || isNaN(outPoint)) {
        throw new Error(`Invalid outPoint: ${outPoint}`);
      }

      // Validate inPoint >= 0
      if (inPoint < 0) {
        throw new Error(`Invalid trim values: inPoint must be >= 0 (got ${inPoint})`);
      }

      // Validate outPoint > inPoint
      if (outPoint <= inPoint) {
        throw new Error(`Invalid trim values: outPoint must be > inPoint (got inPoint=${inPoint}, outPoint=${outPoint})`);
      }

      // Validate minimum duration (1.0 seconds)
      const duration = outPoint - inPoint;
      if (duration < 1.0) {
        throw new Error(`Trim duration must be at least 1.0 seconds (got ${duration.toFixed(2)}s)`);
      }

      // Validate outPoint <= clipDuration (cannot exceed source clip duration)
      if (outPoint > clipDuration) {
        throw new Error(`Invalid trim values: outPoint (${outPoint}) cannot exceed clip duration (${clipDuration})`);
      }

      // Validate inPoint < clipDuration
      if (inPoint >= clipDuration) {
        throw new Error(`Invalid trim values: inPoint (${inPoint}) must be < clip duration (${clipDuration})`);
      }

      console.log(`[IPC] Trim validation successful for clip ${clipId}: inPoint=${inPoint.toFixed(2)}s, outPoint=${outPoint.toFixed(2)}s`);

      return {
        success: true,
        inPoint,
        outPoint,
      };
    } catch (error) {
      console.error('[IPC] Trim validation error:', error);
      throw error;
    }
  });

  /**
   * Handler: export:showSaveDialog
   * Opens native save dialog for export file
   * Returns: Promise<string | null> (file path or null if cancelled)
   */
  ipcMain.handle('export:showSaveDialog', async (_event, defaultFilename: string, presetId?: string): Promise<string | null> => {
    try {
      // Create exports folder structure: exports/YYYY-MM-DD/
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const exportsDir = path.join(os.homedir(), 'Documents', 'ollo', 'exports', `${year}-${month}-${day}`);
      
      // Ensure exports directory exists
      const fs = require('fs');
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
        console.log(`[IPC] Created exports directory: ${exportsDir}`);
      }

      // Generate filename with preset if provided
      let filename = defaultFilename;
      if (presetId && presetId !== 'custom') {
        const nameWithoutExt = path.parse(defaultFilename).name;
        const ext = path.parse(defaultFilename).ext;
        filename = `ollo_${presetId}_${nameWithoutExt}${ext}`;
      }

      const result = await dialog.showSaveDialog({
        title: 'Export Video',
        defaultPath: path.join(exportsDir, filename),
        filters: [
          { name: 'MP4 Video', extensions: ['mp4'] }
        ],
        buttonLabel: 'Export',
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      // Ensure .mp4 extension
      let filePath = result.filePath;
      if (!filePath.endsWith('.mp4')) {
        filePath = `${filePath}.mp4`;
      }

      console.log(`[IPC] Export save location: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('[IPC] Export save dialog error:', error);
      throw new Error(`Failed to open save dialog: ${error}`);
    }
  });

  /**
   * Handler: export:start
   * Initiates video export process
   * Params: clips (TimelineClip[]), libraryClips (VideoClip[]), outputPath (string), advancedSettings (AdvancedExportSettings?)
   * Returns: Promise<void>
   * Progress: Emits 'export:progress' events via IPC (0-100)
   */
  ipcMain.handle('export:start', async (
    event,
    clips: TimelineClip[],
    libraryClips: VideoClip[],
    outputPath: string,
    projectState?: SavedProjectState,
    advancedSettings?: AdvancedExportSettings
  ): Promise<void> => {
    try {
      // Validate inputs
      if (!clips || clips.length === 0) {
        throw new Error('Cannot export: timeline is empty');
      }
      if (!libraryClips || libraryClips.length === 0) {
        throw new Error('Cannot export: no library clips provided');
      }
      if (!outputPath || typeof outputPath !== 'string') {
        throw new Error('Invalid output path');
      }

      // Trigger auto-save before export (if project state provided)
      if (projectState) {
        try {
          writeAutosaveFile(projectState);
          console.log('[IPC] Auto-saved project state before export');
        } catch (saveError) {
          console.error('[IPC] Failed to auto-save before export:', saveError);
          // Don't throw - export can proceed without auto-save
        }
      }

      // Calculate export settings (use advanced settings if provided)
      let settings;
      if (advancedSettings) {
        // Use advanced settings to create custom export settings
        const preset = advancedSettings.preset;
        settings = {
          format: 'mp4' as const,
          videoCodec: 'libx264' as const,
          audioCodec: 'aac' as const,
          framerate: advancedSettings.customFramerate || preset.framerate,
          width: advancedSettings.customResolution?.width || preset.resolution.width,
          height: advancedSettings.customResolution?.height || preset.resolution.height,
          videoBitrate: advancedSettings.customBitrate || preset.bitrate,
          audioBitrate: 128,
          aspectRatioMode: 'letterbox' as const
        };
        console.log('[IPC] Using advanced export settings:', settings);
      } else {
        // Use default calculation
        settings = calculateExportSettings(clips, libraryClips);
        console.log('[IPC] Using default export settings:', settings);
      }

      // Get the main window to send progress events
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        throw new Error('Main window not found');
      }

      // Export with progress tracking
      await exportVideoSequence(
        {
          clips,
          libraryClips,
          outputPath,
          settings,
        },
        (progress) => {
          // Emit progress event to renderer
          console.log('[IPC] Sending progress:', progress);
          mainWindow.webContents.send('export:progress', progress);
        }
      );

      console.log('[IPC] Export completed successfully');
    } catch (error) {
      console.error('[IPC] Export error:', error);
      throw error;
    }
  });

  /**
   * Handler: export:revealInFinder
   * Opens macOS Finder to file location
   * Params: filePath (string)
   * Returns: Promise<void>
   */
  ipcMain.handle('export:revealInFinder', async (_event, filePath: string): Promise<void> => {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Use shell.showItemInFolder for macOS
      shell.showItemInFolder(filePath);
      console.log(`[IPC] Revealed file in Finder: ${filePath}`);
    } catch (error) {
      console.error('[IPC] Failed to reveal file in Finder:', error);
      // Don't throw - Finder reveal failure shouldn't break the app
    }
  });

  console.log('[IPC] All handlers registered successfully');
}

