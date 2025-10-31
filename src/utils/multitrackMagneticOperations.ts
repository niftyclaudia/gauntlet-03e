/**
 * Magnetic Timeline Operations for Multitrack
 * 
 * Wrapper functions that work with TimelineDoc and handle main track operations
 * These maintain compatibility with existing magnetic operations while working with multitrack structure
 */

import { TimelineClip, VideoClip } from '../types/video';
import { TimelineDoc, Track, Lane } from '../types/timeline';
import {
  addClipToTimelineMagnetic,
  removeClipFromTimelineMagnetic,
  reorderTimelineClipMagnetic,
  trimClipMagnetic,
  splitClipAtPlayheadMagnetic,
  migrateToMagneticTimeline,
  enforceGaplessInvariant,
  validateGaplessInvariant,
} from './magneticTimelineOperations';
import {
  extractMainTrackClips,
  getMainTrack,
  migrateToMultitrack,
  needsMultitrackMigration,
} from './multitrackMigration';
import { createEmptyTimelineDoc } from '../types/timeline';

/**
 * Ensure TimelineDoc exists and is valid
 * If timeline is legacy array, migrate to TimelineDoc
 */
function ensureTimelineDoc(
  timeline: TimelineClip[],
  timelineDoc: TimelineDoc | undefined
): TimelineDoc {
  if (timelineDoc && timelineDoc.tracks.length > 0) {
    return timelineDoc;
  }
  
  // Migrate from legacy timeline array
  if (timeline.length > 0 && needsMultitrackMigration(timeline)) {
    return migrateToMultitrack(timeline);
  }
  
  // Create empty timeline doc
  return createEmptyTimelineDoc();
}

/**
 * Add clip to main track with ripple behavior
 */
export function addClipToMainTrackMagnetic(
  libraryClipId: string,
  timelineDoc: TimelineDoc | undefined,
  legacyTimeline: TimelineClip[],
  library: VideoClip[],
  insertionIndex?: number,
  mode: 'ripple' | 'overwrite' = 'ripple'
): TimelineDoc {
  const doc = ensureTimelineDoc(legacyTimeline, timelineDoc);
  const mainTrack = getMainTrack(doc);
  
  if (!mainTrack || !mainTrack.isMagnetic) {
    throw new Error('Main track not found or not magnetic');
  }

  const mainLane = mainTrack.lanes[0];
  if (!mainLane) {
    throw new Error('Main track has no lanes');
  }

  // Get current clips from main lane
  const currentClips = mainLane.clips;

  // Use magnetic operation to add clip
  const updatedClips = addClipToTimelineMagnetic(
    libraryClipId,
    currentClips,
    library,
    insertionIndex,
    mode
  );

  // Update main lane with new clips (ensure all have trackId/laneId)
  const clipsWithTrackInfo = updatedClips.map(clip => ({
    ...clip,
    trackId: mainTrack.id,
    laneId: mainLane.id,
  }));

  // Update lane
  const updatedLane: Lane = {
    ...mainLane,
    clips: clipsWithTrackInfo,
  };

  // Update track
  const updatedTrack: Track = {
    ...mainTrack,
    lanes: [updatedLane],
  };

  // Update timeline doc
  return {
    ...doc,
    tracks: doc.tracks.map(t => t.id === mainTrack.id ? updatedTrack : t),
  };
}

/**
 * Remove clip from main track with ripple delete
 */
export function removeClipFromMainTrackMagnetic(
  clipId: string,
  timelineDoc: TimelineDoc | undefined,
  legacyTimeline: TimelineClip[]
): TimelineDoc {
  const doc = ensureTimelineDoc(legacyTimeline, timelineDoc);
  const mainTrack = getMainTrack(doc);
  
  if (!mainTrack) {
    throw new Error('Main track not found');
  }

  const mainLane = mainTrack.lanes[0];
  if (!mainLane) {
    throw new Error('Main track has no lanes');
  }

  // Get current clips
  const currentClips = mainLane.clips;

  // Use magnetic operation to remove clip
  const updatedClips = removeClipFromTimelineMagnetic(clipId, currentClips);

  // Update main lane
  const updatedLane: Lane = {
    ...mainLane,
    clips: updatedClips.map(clip => ({
      ...clip,
      trackId: mainTrack.id,
      laneId: mainLane.id,
    })),
  };

  // Update track
  const updatedTrack: Track = {
    ...mainTrack,
    lanes: [updatedLane],
  };

  // Update timeline doc
  return {
    ...doc,
    tracks: doc.tracks.map(t => t.id === mainTrack.id ? updatedTrack : t),
  };
}

/**
 * Reorder clip in main track with ripple move
 */
export function reorderClipInMainTrackMagnetic(
  dragIndex: number,
  hoverIndex: number,
  timelineDoc: TimelineDoc | undefined,
  legacyTimeline: TimelineClip[]
): TimelineDoc {
  const doc = ensureTimelineDoc(legacyTimeline, timelineDoc);
  const mainTrack = getMainTrack(doc);
  
  if (!mainTrack) {
    throw new Error('Main track not found');
  }

  const mainLane = mainTrack.lanes[0];
  if (!mainLane) {
    throw new Error('Main track has no lanes');
  }

  // Get current clips
  const currentClips = mainLane.clips;

  // Use magnetic operation to reorder
  const updatedClips = reorderTimelineClipMagnetic(dragIndex, hoverIndex, currentClips);

  // Update main lane
  const updatedLane: Lane = {
    ...mainLane,
    clips: updatedClips.map(clip => ({
      ...clip,
      trackId: mainTrack.id,
      laneId: mainLane.id,
    })),
  };

  // Update track
  const updatedTrack: Track = {
    ...mainTrack,
    lanes: [updatedLane],
  };

  // Update timeline doc
  return {
    ...doc,
    tracks: doc.tracks.map(t => t.id === mainTrack.id ? updatedTrack : t),
  };
}

/**
 * Trim clip in main track with ripple behavior
 */
export function trimClipInMainTrackMagnetic(
  clipId: string,
  newTrimStart: number,
  newTrimEnd: number,
  timelineDoc: TimelineDoc | undefined,
  legacyTimeline: TimelineClip[],
  library: VideoClip[],
  mode: 'ripple' | 'overwrite' = 'ripple'
): TimelineDoc {
  // Ensure we have a valid timelineDoc
  let doc = timelineDoc;
  if (!doc || doc.tracks.length === 0) {
    doc = ensureTimelineDoc(legacyTimeline, timelineDoc);
  }
  
  const mainTrack = getMainTrack(doc);
  
  if (!mainTrack) {
    throw new Error('Main track not found');
  }

  const mainLane = mainTrack.lanes[0];
  if (!mainLane) {
    throw new Error('Main track has no lanes');
  }

  // Use the clips passed in (currentClips) which should be the most up-to-date
  // These are extracted from the current timelineDoc state
  const clipsToUse = legacyTimeline.length > 0 ? legacyTimeline : mainLane.clips;
  
  // Verify clip exists
  const clipExists = clipsToUse.some(clip => clip.id === clipId);
  if (!clipExists) {
    console.error(`[multitrackMagneticOperations] Clip ${clipId} not found. Available clips:`, clipsToUse.map(c => c.id));
    // Return doc unchanged if clip not found
    return doc;
  }

  // Use magnetic operation to trim with the current clips
  const updatedClips = trimClipMagnetic(clipId, newTrimStart, newTrimEnd, clipsToUse, library, mode);

  // Update main lane
  const updatedLane: Lane = {
    ...mainLane,
    clips: updatedClips.map(clip => ({
      ...clip,
      trackId: mainTrack.id,
      laneId: mainLane.id,
    })),
  };

  // Update track
  const updatedTrack: Track = {
    ...mainTrack,
    lanes: [updatedLane],
  };

  // Update timeline doc
  return {
    ...doc,
    tracks: doc.tracks.map(t => t.id === mainTrack.id ? updatedTrack : t),
  };
}

/**
 * Split clip in main track
 */
export function splitClipInMainTrackMagnetic(
  clipId: string,
  playheadPosition: number,
  timelineDoc: TimelineDoc | undefined,
  legacyTimeline: TimelineClip[],
  library: VideoClip[]
): TimelineDoc {
  const doc = ensureTimelineDoc(legacyTimeline, timelineDoc);
  const mainTrack = getMainTrack(doc);
  
  if (!mainTrack) {
    throw new Error('Main track not found');
  }

  const mainLane = mainTrack.lanes[0];
  if (!mainLane) {
    throw new Error('Main track has no lanes');
  }

  // Get current clips
  const currentClips = mainLane.clips;

  // Use magnetic operation to split
  const updatedClips = splitClipAtPlayheadMagnetic(clipId, playheadPosition, currentClips, library);

  // Update main lane
  const updatedLane: Lane = {
    ...mainLane,
    clips: updatedClips.map(clip => ({
      ...clip,
      trackId: mainTrack.id,
      laneId: mainLane.id,
    })),
  };

  // Update track
  const updatedTrack: Track = {
    ...mainTrack,
    lanes: [updatedLane],
  };

  // Update timeline doc
  return {
    ...doc,
    tracks: doc.tracks.map(t => t.id === mainTrack.id ? updatedTrack : t),
  };
}

