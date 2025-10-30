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
   * @param presetId - Optional preset ID for filename generation
   * @returns Promise<string | null> - file path or null if cancelled
   */
  showSaveDialog: (defaultFilename: string, presetId?: string): Promise<string | null> => {
    return ipcRenderer.invoke('export:showSaveDialog', defaultFilename, presetId);
  },

  /**
   * Starts video export process
   * @param clips - Timeline clips to export
   * @param libraryClips - Library clips for source files
   * @param outputPath - Output file path (absolute)
   * @param projectState - Optional project state for auto-save before export
   * @param advancedSettings - Optional advanced export settings
   * @returns Promise<void>
   * @throws Error if export fails
   */
  exportVideo: (
    clips: any[],
    libraryClips: any[],
    outputPath: string,
    projectState?: any,
    advancedSettings?: any
  ): Promise<void> => {
    return ipcRenderer.invoke('export:start', clips, libraryClips, outputPath, projectState, advancedSettings);
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

  /**
   * Screen recording API
   */
  recording: {
    /**
     * Get available screens for recording
     * @returns Promise with screens array or error
     */
    getScreens: (): Promise<{ screens: any[]; error?: string }> => {
      return ipcRenderer.invoke('recording:get-screens');
    },

    /**
     * Start recording session
     * @param screenSourceId - Screen source ID from desktopCapturer
     * @param audioEnabled - Whether microphone audio is enabled
     * @returns Promise with success status and sessionId
     */
    startRecording: (
      screenSourceId: string,
      audioEnabled: boolean
    ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      return ipcRenderer.invoke('recording:start', { screenSourceId, audioEnabled });
    },

    /**
     * Stop recording and convert to MP4
     * @param sessionId - Recording session ID
     * @returns Promise with success status, filePath, and duration
     */
    stopRecording: (
      sessionId: string
    ): Promise<{ success: boolean; filePath?: string; duration?: number; error?: string }> => {
      return ipcRenderer.invoke('recording:stop', { sessionId });
    },

    /**
     * Cancel recording and cleanup
     * @param sessionId - Recording session ID
     * @returns Promise with success status
     */
    cancelRecording: (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('recording:cancel', { sessionId });
    },

    /**
     * Get audio level (0-100)
     * @param sessionId - Recording session ID
     * @returns Promise with audio level
     */
    getAudioLevel: (sessionId: string): Promise<{ level: number }> => {
      return ipcRenderer.invoke('recording:get-audio-level', { sessionId });
    },

    /**
     * Listen to elapsed time updates (every 100ms during recording)
     * @param callback - Callback function receiving seconds
     * @returns Cleanup function to remove listener
     */
    onElapsedTime: (callback: (data: { seconds: number; sessionId: string }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { seconds: number; sessionId: string }) => {
        callback(data);
      };
      ipcRenderer.on('recording:elapsed-time', handler);
      return () => {
        ipcRenderer.removeListener('recording:elapsed-time', handler);
      };
    },

    /**
     * Listen to recording state changes
     * @param callback - Callback function receiving state
     * @returns Cleanup function to remove listener
     */
    onStateChanged: (callback: (data: { state: string; sessionId: string }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { state: string; sessionId: string }) => {
        callback(data);
      };
      ipcRenderer.on('recording:state-changed', handler);
      return () => {
        ipcRenderer.removeListener('recording:state-changed', handler);
      };
    },

    /**
     * Listen to audio level updates (every 200ms during recording)
     * @param callback - Callback function receiving level (0-100)
     * @returns Cleanup function to remove listener
     */
    onAudioLevel: (callback: (level: number) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, level: number) => {
        callback(level);
      };
      ipcRenderer.on('recording:audio-level', handler);
      return () => {
        ipcRenderer.removeListener('recording:audio-level', handler);
      };
    },

    /**
     * Listen to recording errors
     * @param callback - Callback function receiving error message
     * @returns Cleanup function to remove listener
     */
    onError: (callback: (data: { message: string; sessionId: string }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { message: string; sessionId: string }) => {
        callback(data);
      };
      ipcRenderer.on('recording:error', handler);
      return () => {
        ipcRenderer.removeListener('recording:error', handler);
      };
    },

    /**
     * Listen to recording completion
     * @param callback - Callback function receiving filePath and duration
     * @returns Cleanup function to remove listener
     */
    onComplete: (callback: (data: { filePath: string; duration: number; sessionId: string }) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: { filePath: string; duration: number; sessionId: string }) => {
        callback(data);
      };
      ipcRenderer.on('recording:complete', handler);
      return () => {
        ipcRenderer.removeListener('recording:complete', handler);
      };
    },

    /**
     * Write WebM recording data to temp file
     * @param sessionId - Recording session ID
     * @param data - ArrayBuffer or base64 string of recording data
     * @returns Promise with success status
     */
    writeRecordingFile: (
      sessionId: string,
      data: ArrayBuffer | string
    ): Promise<{ success: boolean; error?: string }> => {
      return ipcRenderer.invoke('recording:write-file', { sessionId, data });
    },
  },

  /**
   * Webcam recording API
   */
  webcam: {
    /**
     * Encode webcam recording using FFmpeg
     * @param recordedBlob - Buffer containing recorded video data
     * @param outputPath - Path where to save the encoded MP4
     * @param mimeType - MIME type of the recorded data
     * @param videoDimensions - Video dimensions { width, height }
     * @returns Promise with encoded recording info
     */
    encodeRecording: (
      recordedBlob: ArrayBuffer,
      outputPath: string,
      mimeType: string,
      videoDimensions: { width: number; height: number }
    ): Promise<{
      filePath: string;
      duration: number;
      width: number;
      height: number;
      thumbnailPath?: string;
    }> => {
      return ipcRenderer.invoke('encode-webcam-recording', {
        recordedBlob,
        outputPath,
        mimeType,
        videoDimensions
      });
    },

    /**
     * Check camera permission (placeholder - actual check happens in renderer)
     * @returns Promise<boolean> - always true
     */
    checkCameraPermission: (): Promise<boolean> => {
      return ipcRenderer.invoke('check-camera-permission');
    },

    /**
     * Check microphone permission (placeholder - actual check happens in renderer)
     * @returns Promise<boolean> - always true
     */
    checkMicrophonePermission: (): Promise<boolean> => {
      return ipcRenderer.invoke('check-microphone-permission');
    },
  },

  /**
   * PiP recording API
   */
  pip: {
    /**
     * Start PiP recording session
     * @param settings - PiP recording settings
     * @returns Promise with session ID
     */
    startRecording: (settings: {
      screenId: string;
      position: 'TL' | 'TR' | 'BL' | 'BR';
      size: 'small' | 'medium' | 'large';
      shape: 'rectangle' | 'circle';
      audioMode: 'both' | 'screen-only' | 'webcam-only';
    }): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      return ipcRenderer.invoke('pip:start-recording', settings);
    },

    /**
     * Stop PiP recording and compose video
     * @param sessionId - Recording session ID
     * @param screenData - Screen recording data as base64 string
     * @param webcamData - Webcam recording data as base64 string
     * @returns Promise with output file path
     */
    stopRecording: (data: {
      sessionId: string;
      screenData: string; // base64 encoded string
      webcamData: string; // base64 encoded string
    }): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      return ipcRenderer.invoke('pip:stop-recording', data);
    },

    /**
     * Get PiP session information
     * @param sessionId - Recording session ID
     * @returns Promise with session info
     */
    getSession: (sessionId: string): Promise<{ success: boolean; session?: any; error?: string }> => {
      return ipcRenderer.invoke('pip:get-session', { sessionId });
    },
  },

  /**
   * AI script generation API
   */
  ai: {
    /**
     * Generates script using OpenAI API
     * @param topic - User-provided topic
     * @param duration - Requested duration in seconds
     * @param format - Optional format preference ('bullets' | 'paragraphs')
     * @param feedback - Optional feedback for regeneration
     * @returns Generated script with metadata
     */
    generateScript: (
      topic: string,
      duration: number,
      format?: 'bullets' | 'paragraphs',
      feedback?: string
    ): Promise<{
      script: string;
      wordCount: number;
      estimatedReadTime: number;
    }> => {
      return ipcRenderer.invoke('ai:generateScript', topic, duration, format, feedback);
    },
  },
});
