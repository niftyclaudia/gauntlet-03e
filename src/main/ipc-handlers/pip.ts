/**
 * IPC Handlers for Picture-in-Picture Recording
 * 
 * Handles PiP recording operations including simultaneous screen + webcam capture
 * and FFmpeg overlay composition
 */

import { ipcMain } from 'electron';
import { composePiPVideo } from '../ffmpeg';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// In-memory store for active PiP recording sessions
interface PiPSession {
  id: string;
  screenFilePath: string;
  webcamFilePath: string;
  startTime: number;
  settings: {
    position: 'TL' | 'TR' | 'BL' | 'BR';
    size: 'small' | 'medium' | 'large';
    shape: 'rectangle' | 'circle';
    audioMode: 'both' | 'screen-only' | 'webcam-only';
  };
}

const activeSessions = new Map<string, PiPSession>();

// Ensure recordings directory exists
function ensureRecordingsDir(): string {
  const userDataPath = process.env.APPDATA || 
    (process.platform === 'darwin' ? 
      path.join(os.homedir(), 'Library', 'Application Support', 'ollo') : 
      path.join(os.homedir(), '.config', 'ollo'));
  
  const recordingsDir = path.join(userDataPath, 'recordings');
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
  }
  return recordingsDir;
}

/**
 * Register all PiP IPC handlers
 */
export function registerPiPHandlers(): void {
  console.log('[PiP IPC] Registering PiP handlers...');

  /**
   * Handler: pip:start-recording
   * Initializes PiP recording session and starts screen recording
   */
  ipcMain.handle('pip:start-recording', async (
    _event,
    settings: {
      screenId: string;
      position: 'TL' | 'TR' | 'BL' | 'BR';
      size: 'small' | 'medium' | 'large';
      shape: 'rectangle' | 'circle';
      audioMode: 'both' | 'screen-only' | 'webcam-only';
    }
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
    try {
      const sessionId = uuidv4();
      
      // Create temp file paths for recordings
      const tempDir = os.tmpdir();
      const screenFilePath = path.join(tempDir, `pip-screen-${sessionId}.webm`);
      const webcamFilePath = path.join(tempDir, `pip-webcam-${sessionId}.webm`);
      
      // Store session
      activeSessions.set(sessionId, {
        id: sessionId,
        screenFilePath,
        webcamFilePath,
        startTime: Date.now(),
        settings: {
          position: settings.position,
          size: settings.size,
          shape: settings.shape,
          audioMode: settings.audioMode,
        },
      });
      
      console.log('[PiP IPC] Started PiP recording session:', sessionId);
      
      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      console.error('[PiP IPC] Failed to start PiP recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handler: pip:stop-recording
   * Stops recording and composes PiP video using FFmpeg
   */
  ipcMain.handle('pip:stop-recording', async (
    _event,
    data: {
      sessionId: string;
      screenData: string; // base64 encoded string
      webcamData: string; // base64 encoded string
    }
  ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
    const { sessionId, screenData, webcamData } = data;
    try {
      const session = activeSessions.get(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      console.log('[PiP IPC] Stopping PiP recording for session:', sessionId);

      // Validate both screen and webcam data
      if (!screenData) {
        return { success: false, error: 'Missing screen recording data' };
      }
      if (!webcamData) {
        return { success: false, error: 'Missing webcam recording data' };
      }

      // Convert base64 strings back to buffers
      let screenBuffer: Buffer;
      let webcamBuffer: Buffer;
      
      try {
        screenBuffer = Buffer.from(screenData, 'base64');
        webcamBuffer = Buffer.from(webcamData, 'base64');
      } catch (error) {
        console.error('[PiP IPC] Failed to convert base64 data:', error);
        return { success: false, error: 'Invalid recording data format' };
      }

      console.log('[PiP IPC] Converted screen data size:', screenBuffer.length);
      console.log('[PiP IPC] Converted webcam data size:', webcamBuffer.length);

      // Write both recordings to temp files
      await fs.promises.writeFile(session.screenFilePath, screenBuffer);
      await fs.promises.writeFile(session.webcamFilePath, webcamBuffer);

      // Compose PiP video
      const recordingsDir = ensureRecordingsDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const outputFile = path.join(recordingsDir, `PiP_Recording_${timestamp}.mp4`);

      await composePiPVideo(
        session.screenFilePath,
        session.webcamFilePath,
        outputFile,
        {
          position: session.settings.position,
          size: session.settings.size,
          shape: session.settings.shape,
          audioMode: session.settings.audioMode,
        }
      );

      // Clean up temp files
      try {
        await fs.promises.unlink(session.screenFilePath);
        await fs.promises.unlink(session.webcamFilePath);
      } catch (cleanupError) {
        console.warn('[PiP IPC] Failed to cleanup temp files:', cleanupError);
      }

      // Remove session
      activeSessions.delete(sessionId);

      console.log('[PiP IPC] PiP recording complete:', outputFile);

      return {
        success: true,
        filePath: outputFile,
      };
    } catch (error) {
      console.error('[PiP IPC] Failed to stop PiP recording:', error);
      
      const session = activeSessions.get(sessionId);
      if (session) {
        activeSessions.delete(sessionId);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  /**
   * Handler: pip:get-session
   * Returns session information for a given session ID
   */
  ipcMain.handle('pip:get-session', async (
    _event,
    data: { sessionId: string }
  ): Promise<{ success: boolean; session?: PiPSession; error?: string }> => {
    const { sessionId } = data;
    const session = activeSessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    return { success: true, session };
  });

  console.log('[PiP IPC] PiP handlers registered successfully');
}

