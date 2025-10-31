/**
 * Multitrack Migration Utilities
 * 
 * Migrates from single-track (flat array) to multitrack (Track/Lane) structure
 */

import { TimelineClip } from '../types/video';
import { TimelineDoc, Track, Lane, createMainTrack, createEmptyTimelineDoc, createOverlayTrack } from '../types/timeline';
import { migrateToMagneticTimeline } from './magneticTimelineOperations';

/**
 * Migrate single-track timeline array to multitrack TimelineDoc
 * 
 * @param timeline - Existing timeline clips array
 * @returns TimelineDoc with main track containing all clips
 */
export function migrateToMultitrack(timeline: TimelineClip[]): TimelineDoc {
  // Start with empty timeline doc
  const timelineDoc = createEmptyTimelineDoc();
  
  if (timeline.length === 0) {
    return timelineDoc;
  }

  // Ensure clips are migrated to magnetic format (have start times)
  const migratedTimeline = migrateToMagneticTimeline(timeline);
  
  // Get main track (first track)
  const mainTrack = timelineDoc.tracks[0];
  const mainLane = mainTrack.lanes[0];
  
  // Assign trackId and laneId to all clips
  const clipsWithTrackInfo: TimelineClip[] = migratedTimeline.map(clip => ({
    ...clip,
    trackId: mainTrack.id,
    laneId: mainLane.id,
  }));
  
  // Sort by order to maintain sequence
  const sortedClips = [...clipsWithTrackInfo].sort((a, b) => a.order - b.order);
  
  // Add clips to main lane
  mainLane.clips = sortedClips;
  
  return timelineDoc;
}

/**
 * Extract flat timeline array from TimelineDoc (for backward compatibility)
 * Gets clips from main track only
 */
export function extractMainTrackClips(timelineDoc: TimelineDoc): TimelineClip[] {
  if (timelineDoc.tracks.length === 0) {
    return [];
  }
  
  const mainTrack = timelineDoc.tracks[0];
  if (mainTrack.lanes.length === 0) {
    return [];
  }
  
  const mainLane = mainTrack.lanes[0];
  return mainLane.clips;
}

/**
 * Check if timeline needs migration to multitrack
 * (checking if clips have trackId/laneId)
 */
export function needsMultitrackMigration(timeline: TimelineClip[]): boolean {
  if (timeline.length === 0) return false;
  return timeline.some(clip => !clip.trackId || !clip.laneId);
}

/**
 * Get main track from TimelineDoc
 */
export function getMainTrack(timelineDoc: TimelineDoc): Track | null {
  if (timelineDoc.tracks.length === 0) return null;
  return timelineDoc.tracks[0];
}

/**
 * Get overlay tracks from TimelineDoc
 */
export function getOverlayTracks(timelineDoc: TimelineDoc): Track[] {
  return timelineDoc.tracks.slice(1); // Everything after main track
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
 * Get all clips from TimelineDoc (across all tracks/lanes)
 */
export function getAllClips(timelineDoc: TimelineDoc): TimelineClip[] {
  const clips: TimelineClip[] = [];
  for (const track of timelineDoc.tracks) {
    for (const lane of track.lanes) {
      clips.push(...lane.clips);
    }
  }
  return clips;
}

/**
 * Add overlay track to TimelineDoc
 */
export function addOverlayTrack(timelineDoc: TimelineDoc): TimelineDoc {
  const overlayIndex = getOverlayTracks(timelineDoc).length;
  const newTrack = createOverlayTrack(overlayIndex);
  return {
    ...timelineDoc,
    tracks: [...timelineDoc.tracks, newTrack],
  };
}

