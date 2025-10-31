/**
 * Project state serialization utilities
 * 
 * Handles conversion between App state and SavedProjectState format
 * for auto-save and session recovery functionality
 */

import { 
  SavedProjectState, 
  VideoClip, 
  TimelineClip, 
  PROJECT_VERSION,
  LEGACY_PROJECT_VERSION,
} from '../types/video';

/**
 * Serialize current app state to SavedProjectState format
 * @param library - Array of imported video clips
 * @param timeline - Array of timeline clips
 * @param selectedClipId - Currently selected clip ID or null
 * @param currentPlayheadPosition - Current playhead position in seconds
 * @param timelineZoom - Timeline zoom level (1.0 to 10.0)
 * @param timelineScrollPosition - Timeline horizontal scroll position in pixels
 * @returns SavedProjectState object ready for JSON serialization
 */
export function serializeProjectState(
  library: VideoClip[],
  timeline: TimelineClip[],
  selectedClipId: string | null,
  currentPlayheadPosition: number,
  timelineZoom: number,
  timelineScrollPosition: number
): SavedProjectState {
  return {
    version: PROJECT_VERSION,
    timestamp: new Date().toISOString(),
    library: library,
    timeline: timeline,
    selectedClipId: selectedClipId,
    currentPlayheadPosition: Math.max(0, currentPlayheadPosition),
    timelineZoom: Math.max(1.0, Math.min(10.0, timelineZoom)),
    timelineScrollPosition: Math.max(0, timelineScrollPosition),
  };
}

/**
 * Deserialize SavedProjectState to app state values
 * Validates structure and version
 * @param savedState - SavedProjectState object from JSON
 * @returns Object with deserialized state values, or null if invalid
 */
export function deserializeProjectState(
  savedState: any
): {
  library: VideoClip[];
  timeline: TimelineClip[];
  selectedClipId: string | null;
  currentPlayheadPosition: number;
  timelineZoom: number;
  timelineScrollPosition: number;
} | null {
  // Validate basic structure
  if (!savedState || typeof savedState !== 'object') {
    console.error('[ProjectState] Invalid saved state: not an object');
    return null;
  }

  // Validate version (accept both current and legacy versions for migration)
  const version = savedState.version || LEGACY_PROJECT_VERSION;
  if (version !== PROJECT_VERSION && version !== LEGACY_PROJECT_VERSION) {
    console.error(`[ProjectState] Unsupported version: ${version}. Expected ${PROJECT_VERSION} or ${LEGACY_PROJECT_VERSION}`);
    return null;
  }
  
  if (version === LEGACY_PROJECT_VERSION) {
    console.log(`[ProjectState] Loading legacy project (version ${LEGACY_PROJECT_VERSION}). Will migrate to magnetic timeline format.`);
  }

  // Validate required fields
  if (!Array.isArray(savedState.library)) {
    console.error('[ProjectState] Invalid saved state: library is not an array');
    return null;
  }

  if (!Array.isArray(savedState.timeline)) {
    console.error('[ProjectState] Invalid saved state: timeline is not an array');
    return null;
  }

  // Validate and normalize state values
  const library: VideoClip[] = Array.isArray(savedState.library) ? savedState.library : [];
  const timeline: TimelineClip[] = Array.isArray(savedState.timeline) ? savedState.timeline : [];
  const selectedClipId: string | null = savedState.selectedClipId || null;
  const currentPlayheadPosition: number = typeof savedState.currentPlayheadPosition === 'number' 
    ? Math.max(0, savedState.currentPlayheadPosition) 
    : 0;
  const timelineZoom: number = typeof savedState.timelineZoom === 'number'
    ? Math.max(1.0, Math.min(10.0, savedState.timelineZoom))
    : 1.0;
  const timelineScrollPosition: number = typeof savedState.timelineScrollPosition === 'number'
    ? Math.max(0, savedState.timelineScrollPosition)
    : 0;

  return {
    library,
    timeline,
    selectedClipId,
    currentPlayheadPosition,
    timelineZoom,
    timelineScrollPosition,
  };
}

/**
 * Validate project state structure
 * Checks that timeline clips reference valid library clips
 * @param savedState - SavedProjectState object to validate
 * @returns true if state is valid, false otherwise
 */
export function validateProjectState(savedState: SavedProjectState): boolean {
  try {
    // Check version
    if (savedState.version !== PROJECT_VERSION) {
      return false;
    }

    // Check library is array
    if (!Array.isArray(savedState.library)) {
      return false;
    }

    // Check timeline is array
    if (!Array.isArray(savedState.timeline)) {
      return false;
    }

    // Create set of library clip IDs for fast lookup
    const libraryClipIds = new Set(savedState.library.map(clip => clip.id));

    // Validate all timeline clips reference valid library clips
    for (const timelineClip of savedState.timeline) {
      if (!timelineClip.libraryClipId || !libraryClipIds.has(timelineClip.libraryClipId)) {
        console.warn(`[ProjectState] Timeline clip references invalid library clip: ${timelineClip.libraryClipId}`);
        return false;
      }
    }

    // Validate selectedClipId references valid clip (if not null)
    if (savedState.selectedClipId !== null) {
      const selectedInLibrary = savedState.library.some(clip => clip.id === savedState.selectedClipId);
      const selectedInTimeline = savedState.timeline.some(clip => clip.id === savedState.selectedClipId);
      if (!selectedInLibrary && !selectedInTimeline) {
        console.warn(`[ProjectState] Selected clip ID not found in library or timeline: ${savedState.selectedClipId}`);
        // Not a fatal error - just clear selection
      }
    }

    return true;
  } catch (error) {
    console.error('[ProjectState] Validation error:', error);
    return false;
  }
}

/**
 * Filter out clips with missing video files
 * Validates file paths exist and returns filtered library and timeline
 * @param library - Array of video clips to validate
 * @param timeline - Array of timeline clips to filter
 * @param validateFileExists - Function to check if file path exists (from IPC)
 * @returns Object with validLibrary and validTimeline arrays
 */
export async function filterValidFilePaths(
  library: VideoClip[],
  timeline: TimelineClip[],
  validateFileExists: (path: string) => Promise<boolean>
): Promise<{
  validLibrary: VideoClip[];
  validTimeline: TimelineClip[];
}> {
  // Validate library clip file paths
  const validLibrary: VideoClip[] = [];
  const validLibraryIds = new Set<string>();

  for (const clip of library) {
    try {
      const exists = await validateFileExists(clip.path);
      if (exists) {
        validLibrary.push(clip);
        validLibraryIds.add(clip.id);
      } else {
        console.warn(`[ProjectState] Video file not found, removing clip: ${clip.filename} (${clip.path})`);
      }
    } catch (error) {
      console.warn(`[ProjectState] Error validating file path, removing clip: ${clip.filename}`, error);
    }
  }

  // Filter timeline clips to only include those referencing valid library clips
  const validTimeline: TimelineClip[] = [];
  for (const timelineClip of timeline) {
    if (validLibraryIds.has(timelineClip.libraryClipId)) {
      validTimeline.push(timelineClip);
    } else {
      console.warn(`[ProjectState] Timeline clip references missing library clip, removing: ${timelineClip.id}`);
    }
  }

  // Reorder timeline clips to ensure order property is sequential
  validTimeline.sort((a, b) => a.order - b.order);
  validTimeline.forEach((clip, index) => {
    clip.order = index;
  });

  return {
    validLibrary,
    validTimeline,
  };
}

