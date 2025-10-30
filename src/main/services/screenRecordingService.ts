/**
 * Screen Recording Service
 * 
 * Handles screen recording operations in Electron main process.
 * Note: Actual MediaRecorder recording happens in renderer process.
 * This service manages session state, screen enumeration, and file operations.
 */

import { desktopCapturer, app, screen as electronScreen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ScreenInfo, RecordingSession } from '../../types/recording';
import { convertWebmToMp4 } from '../ffmpeg';

/**
 * Active recording sessions map
 * Key: sessionId, Value: RecordingSession
 */
const activeSessions = new Map<string, RecordingSession>();

/**
 * Get recordings directory path
 * Creates directory if it doesn't exist
 */
function getRecordingsDirectory(): string {
  const tempPath = app.getPath('temp');
  const recordingsDir = path.join(tempPath, 'klippy-recordings');
  
  if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
    console.log(`[ScreenRecording] Created recordings directory: ${recordingsDir}`);
  }
  
  return recordingsDir;
}

/**
 * Get available screens for recording
 * Uses Electron's desktopCapturer API with enhanced thumbnail generation
 */
export async function getAvailableScreens(): Promise<ScreenInfo[]> {
  try {
    console.log(`[ScreenRecording] Requesting screen and window sources...`);
    
    // Get actual screen displays to get real resolutions
    const displays = electronScreen.getAllDisplays();
    console.log(`[ScreenRecording] Found ${displays.length} physical display(s)`);
    displays.forEach((display, idx) => {
      console.log(`[ScreenRecording] Display ${idx + 1}: ${display.bounds.width}x${display.bounds.height} at (${display.bounds.x}, ${display.bounds.y})`);
    });
    
    // Get both screens and windows with larger thumbnail size for better quality
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 240 }
    });

    console.log(`[ScreenRecording] Found ${sources.length} source(s) (screens + windows)`);

    // Process screens with enhanced thumbnail validation
    const screens: ScreenInfo[] = [];
    
    for (let index = 0; index < sources.length; index++) {
      const source = sources[index];
      const thumbnailSizeObj = source.thumbnail.getSize();
      
      // Check if thumbnail size is valid
      console.log(`[ScreenRecording] Screen ${index + 1}: ${source.name}`);
      console.log(`[ScreenRecording] Source ID: ${source.id}`);
      console.log(`[ScreenRecording] Thumbnail size object:`, thumbnailSizeObj);
      
      // Try to match this source to a physical display
      let width = 320;
      let height = 240;
      
      // First, try to get dimensions from thumbnail size
      const thumbWidth = (thumbnailSizeObj as any).width || thumbnailSizeObj.width;
      const thumbHeight = (thumbnailSizeObj as any).height || thumbnailSizeObj.height;
      
      if (thumbWidth && thumbHeight && thumbWidth > 0 && thumbHeight > 0) {
        width = thumbWidth;
        height = thumbHeight;
        console.log(`[ScreenRecording] Using thumbnail dimensions: ${width}x${height}`);
      } else {
        // Try to match source to a physical display
        // Source names like "Screen 1" or displays by index
        const displayIndex = sources.length > 1 ? index : 0;
        if (displays[displayIndex]) {
          width = displays[displayIndex].bounds.width;
          height = displays[displayIndex].bounds.height;
          console.log(`[ScreenRecording] Using display dimensions from display ${displayIndex}: ${width}x${height}`);
        } else {
          console.log(`[ScreenRecording] Using fallback dimensions: ${width}x${height}`);
        }
      }
      
      // Enhanced thumbnail generation with multiple strategies
      let thumbnailDataUrl = '';
      
      // Strategy 1: Try immediate conversion
      try {
        const dataUrl = source.thumbnail.toDataURL('image/png');
        if (dataUrl.startsWith('data:image/png') && dataUrl.length > 1000) {
          thumbnailDataUrl = dataUrl;
          console.log(`[ScreenRecording] Immediate PNG conversion successful for screen ${index + 1}`);
        }
      } catch (error) {
        console.warn(`[ScreenRecording] Immediate PNG conversion failed for screen ${index + 1}:`, error);
      }
      
      // Strategy 2: If immediate failed, try with delay and retry
      if (!thumbnailDataUrl) {
        const maxRetries = 5;
        const retryDelay = 200; // Increased delay for better success rate
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            // Wait before retry (except first attempt)
            if (attempt > 1) {
              console.log(`[ScreenRecording] Waiting ${retryDelay}ms before attempt ${attempt}...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            // Try different formats in order of preference
            const formats = ['image/png', 'image/jpeg', 'image/webp'];
            
            for (const format of formats) {
              try {
                const dataUrl = source.thumbnail.toDataURL(format);
                console.log(`[ScreenRecording] Attempt ${attempt}/${maxRetries} - ${format} data URL length: ${dataUrl.length}`);
                
                // Validate the data URL with stricter requirements
                if (dataUrl.startsWith(`data:${format}`) && dataUrl.length > 2000) {
                  thumbnailDataUrl = dataUrl;
                  console.log(`[ScreenRecording] Successfully created ${format} data URL for screen ${index + 1} on attempt ${attempt}`);
                  break;
                } else if (dataUrl.startsWith(`data:${format}`) && dataUrl.length > 500) {
                  // Accept smaller but valid thumbnails
                  thumbnailDataUrl = dataUrl;
                  console.log(`[ScreenRecording] Created smaller ${format} data URL for screen ${index + 1} on attempt ${attempt}`);
                  break;
                }
              } catch (formatError) {
                console.warn(`[ScreenRecording] Attempt ${attempt}/${maxRetries} - Failed to create ${format} data URL for screen ${index + 1}:`, formatError);
              }
            }
            
            if (thumbnailDataUrl) {
              break; // Success, exit retry loop
            }
          } catch (error) {
            console.error(`[ScreenRecording] Attempt ${attempt}/${maxRetries} - Failed to convert thumbnail to data URL for screen ${index + 1}:`, error);
          }
        }
      }
      
      // Strategy 3: If still no thumbnail, try one more time with fresh source
      if (!thumbnailDataUrl) {
        console.log(`[ScreenRecording] Trying fresh source for source ${index + 1}...`);
        try {
          // Get a fresh source for this screen/window
          const freshSources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 320, height: 240 }
          });
          
          const freshSource = freshSources.find(s => s.id === source.id);
          if (freshSource) {
            const freshDataUrl = freshSource.thumbnail.toDataURL('image/png');
            if (freshDataUrl.startsWith('data:image/png') && freshDataUrl.length > 500) {
              thumbnailDataUrl = freshDataUrl;
              console.log(`[ScreenRecording] Fresh source thumbnail successful for source ${index + 1}`);
            }
          }
        } catch (freshError) {
          console.warn(`[ScreenRecording] Fresh source attempt failed for source ${index + 1}:`, freshError);
        }
      }
      
      if (!thumbnailDataUrl) {
        console.error(`[ScreenRecording] Failed to create any valid data URL for screen ${index + 1} after all attempts`);
      } else {
        console.log(`[ScreenRecording] Final data URL length: ${thumbnailDataUrl.length}, starts with: ${thumbnailDataUrl.substring(0, 50)}...`);
      }
      
      // Use thumbnail size as resolution (it should match the actual screen resolution)
      const resolutionStr = `${width}x${height}`;
      
      console.log(`[ScreenRecording] Final resolution string for screen ${index + 1}: "${resolutionStr}"`);
      
      // Determine if this is a screen or window by checking the source name pattern
      const isScreen = source.name.toLowerCase().includes('entire screen') || 
                       source.name.toLowerCase().includes('screen') ||
                       (!source.name.includes(':') && source.name.match(/^\s*(screen|display)\s+\d+/i));
      
      screens.push({
        id: source.id,
        name: source.name || (isScreen ? `Screen ${index + 1}` : `Window ${index + 1}`),
        resolution: resolutionStr,
        thumbnail: thumbnailDataUrl,
        type: isScreen ? 'screen' : 'window'
      });
      
      console.log(`[ScreenRecording] Added ${isScreen ? 'screen' : 'window'} ${index + 1} with resolution: "${screens[screens.length - 1].resolution}"`);
    }

    console.log(`[ScreenRecording] Processed ${screens.length} source(s) with thumbnails`);
    return screens;
  } catch (error) {
    console.error('[ScreenRecording] Failed to get available screens:', error);
    return [];
  }
}

/**
 * Create a new recording session
 * Returns session ID and initializes session state
 * Note: This only creates the session - actual recording starts in renderer
 */
export function createRecordingSession(screenSourceId: string, audioEnabled: boolean): string {
  const sessionId = uuidv4();
  const recordingsDir = getRecordingsDirectory();
  const tempWebmPath = path.join(recordingsDir, `${sessionId}.webm`);

  const session: RecordingSession = {
    sessionId,
    screenSourceId,
    recordingState: 'idle',
    startTime: 0,
    elapsedSeconds: 0,
    audioEnabled,
    tempWebmPath,
  };

  activeSessions.set(sessionId, session);
  console.log(`[ScreenRecording] Created session ${sessionId} for screen ${screenSourceId}`);
  console.log(`[ScreenRecording] Temp WebM path: ${tempWebmPath}`);

  return sessionId;
}

/**
 * Update session state
 */
export function updateSessionState(sessionId: string, state: RecordingSession['recordingState']): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.recordingState = state;
    if (state === 'recording') {
      session.startTime = Date.now();
    }
  }
}

/**
 * Stop recording and convert WebM to MP4
 */
export async function stopRecording(sessionId: string): Promise<{ filePath: string; duration: number }> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  if (session.recordingState !== 'recording') {
    throw new Error(`Session ${sessionId} is not recording`);
  }

  session.recordingState = 'stopping';

  // Wait a moment for MediaRecorder to finish writing
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!session.tempWebmPath || !fs.existsSync(session.tempWebmPath)) {
    throw new Error(`WebM file not found: ${session.tempWebmPath}`);
  }

  // Calculate duration from file metadata (will use FFprobe later)
  // For now, use elapsed time
  session.elapsedSeconds = (Date.now() - session.startTime) / 1000;
  const duration = session.elapsedSeconds;

  // Convert WebM to MP4
  session.recordingState = 'converting';
  const recordingsDir = getRecordingsDirectory();
  const finalMp4Path = path.join(recordingsDir, `${sessionId}-final.mp4`);

  try {
    await convertWebmToMp4(session.tempWebmPath, finalMp4Path);
    
    // Delete intermediate WebM file after successful conversion
    if (fs.existsSync(session.tempWebmPath)) {
      fs.unlinkSync(session.tempWebmPath);
      console.log(`[ScreenRecording] Deleted intermediate WebM: ${session.tempWebmPath}`);
    }

    session.finalMp4Path = finalMp4Path;
    session.recordingState = 'idle';

    // Get actual duration from MP4 metadata
    // For now, return elapsed time (will enhance with FFprobe later)
    
    return {
      filePath: finalMp4Path,
      duration
    };
  } catch (error) {
    session.recordingState = 'idle';
    throw error;
  }
}

/**
 * Cancel recording and cleanup
 */
export async function cancelRecording(sessionId: string): Promise<void> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return; // Session not found, nothing to clean up
  }

  // Delete temp files if they exist
  if (session.tempWebmPath && fs.existsSync(session.tempWebmPath)) {
    try {
      fs.unlinkSync(session.tempWebmPath);
      console.log(`[ScreenRecording] Deleted WebM file: ${session.tempWebmPath}`);
    } catch (error) {
      console.error(`[ScreenRecording] Failed to delete WebM file:`, error);
    }
  }

  if (session.finalMp4Path && fs.existsSync(session.finalMp4Path)) {
    try {
      fs.unlinkSync(session.finalMp4Path);
      console.log(`[ScreenRecording] Deleted MP4 file: ${session.finalMp4Path}`);
    } catch (error) {
      console.error(`[ScreenRecording] Failed to delete MP4 file:`, error);
    }
  }

  // Remove session
  activeSessions.delete(sessionId);
  console.log(`[ScreenRecording] Cancelled and cleaned up session ${sessionId}`);
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): RecordingSession | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Get elapsed time for active recording
 */
export function getElapsedSeconds(sessionId: string): number {
  const session = activeSessions.get(sessionId);
  if (!session || session.recordingState !== 'recording') {
    return 0;
  }
  return (Date.now() - session.startTime) / 1000;
}