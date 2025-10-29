/**
 * Video clip data types for ollo video editor
 * 
 * These interfaces define the structure for imported video clips,
 * their metadata, and app state management.
 */

/**
 * Video metadata extracted from video file via FFmpeg
 */
export interface VideoMetadata {
  /** Total duration in seconds */
  duration: number;
  /** Horizontal resolution in pixels (e.g., 1920) */
  width: number;
  /** Vertical resolution in pixels (e.g., 1080) */
  height: number;
  /** Frames per second (e.g., 30, 29.97) */
  framerate: number;
  /** Video codec name (e.g., "h264", "hevc") */
  codec: string;
}

/**
 * Video clip imported into Library
 */
export interface VideoClip {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Absolute file path to source video */
  path: string;
  /** Display filename (e.g., "clip.mp4") */
  filename: string;
  /** Total duration in seconds */
  duration: number;
  /** Absolute path to thumbnail image */
  thumbnail: string;
  /** Video metadata from FFmpeg */
  metadata: VideoMetadata;
  /** Import timestamp (Date.now()) */
  importedAt: number;
  /** Source of the clip - 'import' or 'recording' */
  source?: 'import' | 'recording';
  /** Timestamp when recorded (if source is 'recording') */
  recordedAt?: number;
}

/**
 * Clip on the timeline
 */
export interface TimelineClip {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Reference to library clip ID */
  libraryClipId: string;
  /** Trim start time in seconds (default: 0) */
  trimStart: number;
  /** Trim end time in seconds (default: clip duration) */
  trimEnd: number;
  /** Sequence position (0, 1, 2, ...) */
  order: number;
}

/**
 * Application state structure
 */
export interface AppState {
  /** Array of imported video clips */
  library: VideoClip[];
  /** Timeline clips */
  timeline: TimelineClip[];
  /** Currently selected clip ID */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Playback state (playing/paused) */
  isPlaying: boolean;
  /** Export in progress flag */
  isExporting: boolean;
  /** Export progress percentage (0-100) */
  exportProgress: number;
  /** Timeline zoom level (1.0 = 100%, 10.0 = 1000%) */
  timelineZoom: number;
  /** Timeline horizontal scroll position in pixels */
  timelineScrollPosition: number;
}

/**
 * Player state (component-level state for video player)
 */
export interface PlayerState {
  /** Currently loaded clip from library */
  currentVideo: VideoClip | null;
  /** Currently playing timeline clip (if sequence mode) */
  currentTimelineClip: TimelineClip | null;
  /** Playback state */
  isPlaying: boolean;
  /** Current playback time in seconds, synced with video element */
  currentTime: number;
  /** Total duration of current clip/sequence in seconds */
  duration: number;
  /** Playback mode: 'library' | 'timeline' | 'sequence' */
  playbackMode: 'library' | 'timeline' | 'sequence';
  /** Loading state while video metadata loads */
  isLoading: boolean;
  /** Error message if video fails to load */
  error: string | null;
}

/**
 * Sequence item for sequence preview
 */
export interface SequenceItem {
  /** Timeline clip */
  clip: TimelineClip;
  /** Library clip reference */
  libraryClip: VideoClip;
  /** Start time in sequence (cumulative) */
  startTime: number;
  /** End time in sequence (cumulative) */
  endTime: number;
}

/**
 * Saved project state (auto-save format)
 * Serialized to JSON for persistence
 */
export interface SavedProjectState {
  /** Version number for future compatibility (e.g., "1.0") */
  version: string;
  /** ISO 8601 timestamp when state was saved */
  timestamp: string;
  /** Array of imported video clips (file paths, not video data) */
  library: VideoClip[];
  /** Timeline clips with trim points and order */
  timeline: TimelineClip[];
  /** Currently selected clip ID (null if none) */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  timelineZoom: number;
  /** Timeline horizontal scroll position in pixels */
  timelineScrollPosition: number;
}

/**
 * Project version constant for auto-save compatibility
 */
export const PROJECT_VERSION = '1.0';

/**
 * Export settings (fixed preset per PRD)
 */
export interface ExportSettings {
  /** Output format (always "mp4" for MVP) */
  format: 'mp4';
  /** Video codec (always "libx264" for MVP) */
  videoCodec: 'libx264';
  /** Audio codec (always "aac" for MVP) */
  audioCodec: 'aac';
  /** Output frame rate (always 30 for MVP) */
  framerate: 30;
  /** Target resolution width (calculated from sources, max 1920) */
  width: number;
  /** Target resolution height (calculated from sources, max 1080) */
  height: number;
  /** Video bitrate in Mbps (always ~5 for MVP) */
  videoBitrate: number;
  /** Audio bitrate in kbps (always 128 for MVP) */
  audioBitrate: 128;
  /** Aspect ratio mode: 'letterbox' (matches first clip) */
  aspectRatioMode: 'letterbox';
}

/**
 * Export parameters for video export pipeline
 */
export interface ExportParams {
  /** Timeline clips to export (sorted by order) */
  clips: TimelineClip[];
  /** Library clips map (for accessing source file paths) */
  libraryClips: VideoClip[];
  /** Output file path (absolute path) */
  outputPath: string;
  /** Export settings (fixed preset) */
  settings: ExportSettings;
}

/**
 * Webcam recording session state (transient, not persisted)
 */
export interface RecordingSession {
  /** Current recording status */
  status: 'idle' | 'preview' | 'recording' | 'saving' | 'error';
  /** Live camera + audio stream from getUserMedia */
  mediaStream?: MediaStream;
  /** WebRTC recording object */
  mediaRecorder?: MediaRecorder;
  /** Raw recording chunks from MediaRecorder */
  recordedChunks: Blob[];
  /** Timestamp when recording started (ms) */
  startTime: number;
  /** Computed elapsed time in seconds */
  elapsedSeconds: number;
  /** Error description if failed */
  errorMessage?: string;
  /** Camera device ID (if multi-camera) */
  selectedCameraId?: string;
}

/**
 * Camera device info from enumerateDevices
 */
export interface CameraDevice {
  /** Unique device identifier */
  deviceId: string;
  /** Human-readable device name */
  label: string;
  /** Device type (always 'videoinput' for cameras) */
  kind: 'videoinput';
}

/**
 * Encoded recording result from FFmpeg
 */
export interface EncodedRecording {
  /** Full path to saved MP4 file */
  filePath: string;
  /** Duration in seconds */
  duration: number;
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Path to thumbnail image (optional) */
  thumbnailPath?: string;
}

