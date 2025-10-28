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
  /** Export in progress flag */
  isExporting: boolean;
  /** Export progress percentage (0-100) */
  exportProgress: number;
  /** Timeline zoom level (1.0 = 100%, 10.0 = 1000%) */
  timelineZoom: number;
  /** Timeline horizontal scroll position in pixels */
  timelineScrollPosition: number;
}

