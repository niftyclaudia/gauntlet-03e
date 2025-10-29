/**
 * IPC Handlers for Screen Recording
 * 
 * Bridges renderer process requests with main process recording service
 */

import { ipcMain, BrowserWindow } from 'electron';
import {
  getAvailableScreens,
  createRecordingSession,
  stopRecording as stopRecordingService,
  cancelRecording,
  updateSessionState,
  getElapsedSeconds,
  getSession,
} from '../services/screenRecordingService';
import { ScreenInfo } from '../../types/recording';

/**
 * Register all recording IPC handlers
 */
export function registerRecordingHandlers(): void {
  console.log('[Recording IPC] Registering recording handlers...');

  /**
   * Handler: recording:get-screens
   * Returns list of available screens for recording
   */
  ipcMain.handle('recording:get-screens', async (): Promise<{ screens: ScreenInfo[]; error?: string }> => {
    try {
      const screens = await getAvailableScreens();
      return { screens };
    } catch (error) {
      console.error('[Recording IPC] Failed to get screens:', error);
      return { screens: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  /**
   * Handler: recording:start
   * Creates a new recording session
   * Params: { screenSourceId: string; audioEnabled: boolean }
   */
  ipcMain.handle('recording:start', async (
    _event,
    { screenSourceId, audioEnabled }: { screenSourceId: string; audioEnabled: boolean }
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    try {
      if (!screenSourceId || typeof screenSourceId !== 'string') {
        return { success: false, error: 'Invalid screen source ID' };
      }

      // Check if there's already an active recording
      // (We could enhance this to support multiple sessions, but for now, one at a time)
      const sessionId = createRecordingSession(screenSourceId, audioEnabled ?? false);
      updateSessionState(sessionId, 'recording');

      // Get main window to send events
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('recording:state-changed', { state: 'recording', sessionId });
      }

      // Start elapsed time timer (emit every 100ms)
      const elapsedTimer = setInterval(() => {
        const elapsed = getElapsedSeconds(sessionId);
        if (mainWindow) {
          mainWindow.webContents.send('recording:elapsed-time', { seconds: elapsed, sessionId });
        }

        // Stop timer if recording is not active
        const session = getSession(sessionId);
        if (!session || session.recordingState !== 'recording') {
          clearInterval(elapsedTimer);
        }
      }, 100);

      return { success: true, sessionId };
    } catch (error) {
      console.error('[Recording IPC] Failed to start recording:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  /**
   * Handler: recording:stop
   * Stops recording and converts WebM to MP4
   * Params: { sessionId: string }
   */
  ipcMain.handle('recording:stop', async (
    _event,
    { sessionId }: { sessionId: string }
  ): Promise<{ success: boolean; filePath?: string; duration?: number; error?: string }> => {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        return { success: false, error: 'Invalid session ID' };
      }

      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('recording:state-changed', { state: 'stopping', sessionId });
      }

      const result = await stopRecordingService(sessionId);

      if (mainWindow) {
        mainWindow.webContents.send('recording:state-changed', { state: 'idle', sessionId });
        mainWindow.webContents.send('recording:complete', { 
          filePath: result.filePath, 
          duration: result.duration,
          sessionId 
        });
      }

      return { 
        success: true, 
        filePath: result.filePath, 
        duration: result.duration 
      };
    } catch (error) {
      console.error('[Recording IPC] Failed to stop recording:', error);
      
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('recording:error', { 
          message: error instanceof Error ? error.message : 'Unknown error',
          sessionId 
        });
        mainWindow.webContents.send('recording:state-changed', { state: 'idle', sessionId });
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  /**
   * Handler: recording:cancel
   * Cancels recording and cleans up temp files
   * Params: { sessionId: string }
   */
  ipcMain.handle('recording:cancel', async (
    _event,
    { sessionId }: { sessionId: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        return { success: false, error: 'Invalid session ID' };
      }

      await cancelRecording(sessionId);

      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow) {
        mainWindow.webContents.send('recording:state-changed', { state: 'idle', sessionId });
      }

      return { success: true };
    } catch (error) {
      console.error('[Recording IPC] Failed to cancel recording:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  /**
   * Handler: recording:get-audio-level
   * Returns current audio level (0-100) - placeholder for future implementation
   * Params: { sessionId: string }
   */
  ipcMain.handle('recording:get-audio-level', async (
    _event,
    { sessionId }: { sessionId: string }
  ): Promise<{ level: number }> => {
    // TODO: Implement audio level monitoring using Web Audio API AnalyserNode
    // For now, return 0
    return { level: 0 };
  });

  /**
   * Handler: recording:write-file
   * Writes WebM recording data to temp file
   * Params: { sessionId: string; data: ArrayBuffer | string (base64) }
   * Returns: { success: boolean; error?: string }
   */
  ipcMain.handle('recording:write-file', async (
    _event,
    { sessionId, data }: { sessionId: string; data: ArrayBuffer | string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const session = getSession(sessionId);
      if (!session || !session.tempWebmPath) {
        return { success: false, error: 'Session not found or temp path missing' };
      }

      const fs = require('fs');
      const path = require('path');

      let buffer: Buffer;
      if (typeof data === 'string') {
        // Base64 string
        buffer = Buffer.from(data, 'base64');
      } else {
        // ArrayBuffer - convert to Buffer
        buffer = Buffer.from(data);
      }

      await fs.promises.writeFile(session.tempWebmPath, buffer);
      console.log(`[IPC-Recording] WebM file written: ${session.tempWebmPath} (${buffer.length} bytes)`);

      return { success: true };
    } catch (error) {
      console.error('[IPC-Recording] Failed to write recording file:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  console.log('[Recording IPC] Recording handlers registered successfully');
}
