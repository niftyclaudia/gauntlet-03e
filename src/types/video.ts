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

