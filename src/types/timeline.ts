/**
 * Multitrack Timeline Data Types
 * 
 * Comprehensive multitrack system based on PR #17 architecture:
 * - Main track: Magnetic (gapless, ripple edits)
 * - Overlay tracks: Freeform (gaps allowed, no ripple)
 * - Audio: Automatically linked to video clips
 * - Proper separation of Timeline, Track, Lane, Clip, and Segment types
 */

import { TimelineClip, VideoClip } from './video';
import { v4 as uuidv4 } from 'uuid';

/**
 * Track role - simplified to main and overlay
 */
export type TrackRole = 'main' | 'overlay';

/**
 * Segment represents a trimmed portion of a clip on the timeline
 * This is the actual content that appears on the timeline
 */
export interface Segment {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Reference to the timeline clip this segment is part of */
  clipId: string;
  /** Start time in timeline (seconds) - absolute position */
  startTime: number;
  /** End time in timeline (seconds) - absolute position */
  endTime: number;
  /** Trim start time in source clip (seconds) */
  trimStart: number;
  /** Trim end time in source clip (seconds) */
  trimEnd: number;
}

/**
 * Lane within a track (holds clips)
 */
export interface Lane {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Clips in this lane, sorted by start time or order (depending on track type) */
  clips: TimelineClip[];
}

/**
 * Track with policy settings
 */
export interface Track {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Track role: main (magnetic) or overlay (freeform) */
  role: TrackRole;
  /** Whether track is magnetic (gapless, ripple edits) */
  isMagnetic: boolean;
  /** Default edit mode: 'ripple' (shift downstream) or 'overwrite' (replace) */
  defaultMode: 'ripple' | 'overwrite';
  /** Lanes in this track (main: 1 lane, overlay: can have multiple) */
  lanes: Lane[];
  /** Whether track is locked (cannot be edited) */
  locked?: boolean;
  /** Track name for display (optional) */
  name?: string;
  /** Track order in timeline (0 = main track, 1+ = overlay tracks) */
  order?: number;
}

/**
 * Timeline document structure
 * Main track first, then overlay tracks
 */
export interface TimelineDoc {
  /** Tracks (main track always first, then overlays) */
  tracks: Track[];
  /** Timebase for timeline (seconds, can extend to ticks later) */
  timebase: { ticksPerSecond: number };
  /** Total duration of timeline in seconds (calculated from clips) */
  duration?: number;
  /** Currently selected clip ID (optional) */
  selectedClipId?: string | null;
  /** Current playhead position in seconds (optional) */
  playheadPosition?: number;
}

/**
 * Create default main track (magnetic, single lane)
 */
export function createMainTrack(): Track {
  return {
    id: uuidv4(),
    role: 'main',
    isMagnetic: true,
    defaultMode: 'ripple',
    lanes: [{
      id: uuidv4(),
      clips: [],
    }],
    locked: false,
    name: 'Main',
    order: 0,
  };
}

/**
 * Create default overlay track (freeform, single lane)
 */
export function createOverlayTrack(index: number): Track {
  return {
    id: uuidv4(),
    role: 'overlay',
    isMagnetic: false,
    defaultMode: 'overwrite',
    lanes: [{
      id: uuidv4(),
      clips: [],
    }],
    locked: false,
    name: `Overlay ${index + 1}`,
    order: index + 1,
  };
}

/**
 * Create empty timeline document with main track
 */
export function createEmptyTimelineDoc(): TimelineDoc {
  return {
    tracks: [createMainTrack()],
    timebase: { ticksPerSecond: 1 }, // Using seconds for now, can scale to 1000 later
    duration: 0,
    selectedClipId: null,
    playheadPosition: 0,
  };
}

/**
 * Validation and invariant functions for timeline integrity
 */

/**
 * Validate that a timeline document has valid structure
 */
export function validateTimelineDoc(doc: TimelineDoc): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have at least one track (main track)
  if (!doc.tracks || doc.tracks.length === 0) {
    errors.push('Timeline must have at least one track');
  }

  // First track must be main track
  if (doc.tracks.length > 0 && doc.tracks[0].role !== 'main') {
    errors.push('First track must be the main track');
  }

  // Validate each track
  doc.tracks.forEach((track, index) => {
    // Track must have at least one lane
    if (!track.lanes || track.lanes.length === 0) {
      errors.push(`Track ${track.id} (${track.role}) must have at least one lane`);
    }

    // Validate track role consistency
    if (index === 0 && track.role !== 'main') {
      errors.push(`Track at index 0 must have role 'main'`);
    }

    // Validate magnetic property matches role
    if (track.role === 'main' && !track.isMagnetic) {
      errors.push(`Main track must be magnetic`);
    }

    // Validate lanes
    track.lanes.forEach((lane, laneIndex) => {
      if (!lane.id) {
        errors.push(`Track ${track.id} lane ${laneIndex} must have an ID`);
      }

      // Validate clips in lane
      lane.clips.forEach((clip, clipIndex) => {
        if (!clip.id) {
          errors.push(`Track ${track.id} lane ${lane.id} clip ${clipIndex} must have an ID`);
        }
        if (!clip.libraryClipId) {
          errors.push(`Clip ${clip.id} must reference a library clip`);
        }
        if (clip.trimStart >= clip.trimEnd) {
          errors.push(`Clip ${clip.id} has invalid trim points (start >= end)`);
        }
        if (clip.trackId !== track.id) {
          errors.push(`Clip ${clip.id} trackId mismatch (expected ${track.id}, got ${clip.trackId})`);
        }
        if (clip.laneId !== lane.id) {
          errors.push(`Clip ${clip.id} laneId mismatch (expected ${lane.id}, got ${clip.laneId})`);
        }
      });
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that main track clips maintain gapless invariant
 */
export function validateMainTrackGapless(timelineDoc: TimelineDoc, library: VideoClip[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
  
  if (!mainTrack || mainTrack.lanes.length === 0) {
    return { valid: true, errors: [] };
  }

  const mainLane = mainTrack.lanes[0];
  const clips = mainLane.clips.sort((a, b) => a.order - b.order);

  // Check that clips are gapless
  let expectedStart = 0;
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
    
    if (!libraryClip) {
      errors.push(`Clip ${clip.id} references missing library clip ${clip.libraryClipId}`);
      continue;
    }

    const clipDuration = clip.trimEnd - clip.trimStart;
    
    // Check that start time matches expected (for magnetic tracks)
    if (clip.start !== undefined && Math.abs(clip.start - expectedStart) > 0.001) {
      errors.push(`Clip ${clip.id} start time mismatch (expected ${expectedStart}, got ${clip.start})`);
    }

    expectedStart += clipDuration;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that overlay track clips don't overlap within the same lane
 */
export function validateOverlayTrackNoOverlap(timelineDoc: TimelineDoc): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const overlayTracks = timelineDoc.tracks.filter(t => t.role === 'overlay');

  overlayTracks.forEach(track => {
    track.lanes.forEach(lane => {
      const clips = lane.clips
        .filter(c => c.start !== undefined)
        .sort((a, b) => (a.start || 0) - (b.start || 0));

      for (let i = 0; i < clips.length - 1; i++) {
        const currentClip = clips[i];
        const nextClip = clips[i + 1];
        
        if (currentClip.start === undefined || nextClip.start === undefined) {
          continue;
        }

        const currentEnd = currentClip.start + (currentClip.trimEnd - currentClip.trimStart);
        
        if (currentEnd > nextClip.start) {
          errors.push(
            `Overlay clips overlap: clip ${currentClip.id} ends at ${currentEnd}, ` +
            `clip ${nextClip.id} starts at ${nextClip.start}`
          );
        }
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Find clip by ID in timeline document
 */
export function findClipInTimelineDoc(timelineDoc: TimelineDoc, clipId: string): {
  clip: TimelineClip;
  track: Track;
  lane: Lane;
} | null {
  for (const track of timelineDoc.tracks) {
    for (const lane of track.lanes) {
      const clip = lane.clips.find(c => c.id === clipId);
      if (clip) {
        return { clip, track, lane };
      }
    }
  }
  return null;
}

/**
 * Find track by ID
 */
export function findTrackById(timelineDoc: TimelineDoc, trackId: string): Track | null {
  return timelineDoc.tracks.find(track => track.id === trackId) || null;
}

/**
 * Find lane by ID (searches all tracks)
 */
export function findLaneById(timelineDoc: TimelineDoc, laneId: string): { track: Track; lane: Lane } | null {
  for (const track of timelineDoc.tracks) {
    for (const lane of track.lanes) {
      if (lane.id === laneId) {
        return { track, lane };
      }
    }
  }
  return null;
}

/**
 * Calculate total duration of timeline from all tracks
 */
export function calculateTimelineDuration(timelineDoc: TimelineDoc, library: VideoClip[]): number {
  let maxDuration = 0;

  // Main track duration (sum of all clips)
  const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
  if (mainTrack && mainTrack.lanes.length > 0) {
    const mainLane = mainTrack.lanes[0];
    const mainDuration = mainLane.clips.reduce((sum, clip) => {
      return sum + (clip.trimEnd - clip.trimStart);
    }, 0);
    maxDuration = Math.max(maxDuration, mainDuration);
  }

  // Overlay tracks duration (max end time of all clips)
  const overlayTracks = timelineDoc.tracks.filter(t => t.role === 'overlay');
  overlayTracks.forEach(track => {
    track.lanes.forEach(lane => {
      lane.clips.forEach(clip => {
        if (clip.start !== undefined) {
          const clipDuration = clip.trimEnd - clip.trimStart;
          const clipEnd = clip.start + clipDuration;
          maxDuration = Math.max(maxDuration, clipEnd);
        }
      });
    });
  });

  return maxDuration;
}

