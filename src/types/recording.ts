/**
 * Recording feature data types
 * 
 * Defines interfaces for screen recording functionality
 */

/**
 * Screen information from desktopCapturer
 */
export interface ScreenInfo {
  /** desktopCapturer source ID */
  id: string;
  /** Display name (e.g., "Display 1", "Built-in Retina") */
  name: string;
  /** Screen resolution (e.g., "2560x1600") */
  resolution: string;
  /** Base64 data URL of screen thumbnail */
  thumbnail: string;
  /** Source type - either 'screen' or 'window' */
  type: 'screen' | 'window';
}

/**
 * Recording session state
 */
export interface RecordingSession {
  /** Unique session identifier (UUID) */
  sessionId: string;
  /** Selected screen source ID */
  screenSourceId: string;
  /** Recording state */
  recordingState: 'idle' | 'recording' | 'stopping' | 'converting';
  /** Timestamp when recording started (Date.now()) */
  startTime: number;
  /** Elapsed seconds since recording started */
  elapsedSeconds: number;
  /** Whether audio is enabled */
  audioEnabled: boolean;
  /** Path to temporary WebM file */
  tempWebmPath?: string;
  /** Path to final MP4 file */
  finalMp4Path?: string;
}
