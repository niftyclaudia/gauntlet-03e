/**
 * Multitrack Timeline Data Types
 * 
 * Simplified multitrack system:
 * - Main track: Magnetic (gapless, ripple edits)
 * - Overlay tracks: Freeform (gaps allowed, no ripple)
 * - Audio: Automatically linked to video clips
 */

import { TimelineClip } from './video';
import { v4 as uuidv4 } from 'uuid';

/**
 * Track role - simplified to main and overlay
 */
export type TrackRole = 'main' | 'overlay';

/**
 * Lane within a track (holds clips)
 */
export interface Lane {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Clips in this lane, sorted by start time */
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
  };
}

/**
 * Create empty timeline document with main track
 */
export function createEmptyTimelineDoc(): TimelineDoc {
  return {
    tracks: [createMainTrack()],
    timebase: { ticksPerSecond: 1 }, // Using seconds for now, can scale to 1000 later
  };
}

