/**
 * Overlay Track Operations
 * 
 * Non-magnetic operations for overlay tracks (freeform, gaps allowed, no ripple)
 * Overlay tracks allow clips to be placed at absolute times with gaps between them
 */

import { TimelineClip, VideoClip } from '../types/video';
import { TimelineDoc, Track, Lane } from '../types/timeline';
import { findTrackById, findLaneById } from './multitrackMigration';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate clip duration from trim points
 */
function getClipDuration(clip: TimelineClip): number {
  return clip.trimEnd - clip.trimStart;
}

/**
 * Add clip to overlay track at absolute time (no ripple)
 * 
 * @param libraryClipId - ID of the clip from library
 * @param timelineDoc - Timeline document
 * @param library - Library clips array
 * @param trackId - Track ID to add to
 * @param laneId - Lane ID within track (defaults to first lane)
 * @param atTime - Absolute time in timeline to place clip
 */
export function addClipToOverlay(
  libraryClipId: string,
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  trackId: string,
  laneId: string | null,
  atTime: number
): TimelineDoc {
  const libraryClip = library.find(clip => clip.id === libraryClipId);
  if (!libraryClip) {
    console.warn(`[overlayTimelineOperations] Library clip ${libraryClipId} not found`);
    return timelineDoc;
  }

  const track = findTrackById(timelineDoc, trackId);
  if (!track) {
    console.warn(`[overlayTimelineOperations] Track ${trackId} not found`);
    return timelineDoc;
  }

  if (track.isMagnetic) {
    console.warn(`[overlayTimelineOperations] Cannot add clip to magnetic track using overlay operation`);
    return timelineDoc;
  }

  // Use provided lane or first lane
  const targetLaneId = laneId || track.lanes[0]?.id;
  const laneResult = findLaneById(timelineDoc, targetLaneId);
  if (!laneResult) {
    console.warn(`[overlayTimelineOperations] Lane ${targetLaneId} not found`);
    return timelineDoc;
  }

  const { lane } = laneResult;

  // Create new clip
  const newClip: TimelineClip = {
    id: uuidv4(),
    libraryClipId: libraryClipId,
    trimStart: 0,
    trimEnd: libraryClip.duration,
    order: lane.clips.length, // Order within lane
    start: atTime, // Absolute time position
    trackId: track.id,
    laneId: lane.id,
  };

  // Add clip to lane (sorted by start time)
  const updatedClips = [...lane.clips, newClip].sort((a, b) => {
    const aStart = a.start ?? 0;
    const bStart = b.start ?? 0;
    return aStart - bStart;
  });

  // Update lane
  const updatedLane: Lane = {
    ...lane,
    clips: updatedClips,
  };

  // Update track
  const updatedTrack: Track = {
    ...track,
    lanes: track.lanes.map(l => l.id === lane.id ? updatedLane : l),
  };

  // Update timeline doc
  return {
    ...timelineDoc,
    tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
  };
}

/**
 * Remove clip from overlay track (no ripple - gaps remain)
 * 
 * @param clipId - ID of clip to remove
 * @param timelineDoc - Timeline document
 */
export function removeClipFromOverlay(
  clipId: string,
  timelineDoc: TimelineDoc
): TimelineDoc {
  // Find clip
  let found = false;
  const updatedTracks = timelineDoc.tracks.map(track => {
    if (found) return track; // Already found and updated

    const updatedLanes = track.lanes.map(lane => {
      if (found) return lane;

      const clipIndex = lane.clips.findIndex(c => c.id === clipId);
      if (clipIndex >= 0) {
        found = true;
        return {
          ...lane,
          clips: lane.clips.filter(c => c.id !== clipId),
        };
      }
      return lane;
    });

    if (found) {
      return {
        ...track,
        lanes: updatedLanes,
      };
    }
    return track;
  });

  if (!found) {
    console.warn(`[overlayTimelineOperations] Clip ${clipId} not found in overlay track`);
    return timelineDoc;
  }

  return {
    ...timelineDoc,
    tracks: updatedTracks,
  };
}

/**
 * Move clip in overlay track to new absolute time (no ripple)
 * 
 * @param clipId - ID of clip to move
 * @param timelineDoc - Timeline document
 * @param toTime - New absolute time position
 */
export function moveClipInOverlay(
  clipId: string,
  timelineDoc: TimelineDoc,
  toTime: number
): TimelineDoc {
  // Find clip and update start time
  let found = false;
  const updatedTracks = timelineDoc.tracks.map(track => {
    if (found) return track;

    const updatedLanes = track.lanes.map(lane => {
      if (found) return lane;

      const updatedClips = lane.clips.map(clip => {
        if (clip.id === clipId) {
          found = true;
          return {
            ...clip,
            start: toTime,
          };
        }
        return clip;
      }).sort((a, b) => {
        const aStart = a.start ?? 0;
        const bStart = b.start ?? 0;
        return aStart - bStart;
      });

      return {
        ...lane,
        clips: updatedClips,
      };
    });

    return {
      ...track,
      lanes: updatedLanes,
    };
  });

  if (!found) {
    console.warn(`[overlayTimelineOperations] Clip ${clipId} not found`);
    return timelineDoc;
  }

  return {
    ...timelineDoc,
    tracks: updatedTracks,
  };
}

/**
 * Trim clip in overlay track (no ripple - only affects this clip)
 * 
 * @param clipId - ID of clip to trim
 * @param newTrimStart - New trim start time
 * @param newTrimEnd - New trim end time
 * @param timelineDoc - Timeline document
 * @param library - Library clips array
 */
export function trimClipInOverlay(
  clipId: string,
  newTrimStart: number,
  newTrimEnd: number,
  timelineDoc: TimelineDoc,
  library: VideoClip[]
): TimelineDoc {
  // Find clip and update trim points
  let found = false;
  const updatedTracks = timelineDoc.tracks.map(track => {
    if (found) return track;

    const updatedLanes = track.lanes.map(lane => {
      if (found) return lane;

      const updatedClips = lane.clips.map(clip => {
        if (clip.id === clipId) {
          found = true;
          return {
            ...clip,
            trimStart: newTrimStart,
            trimEnd: newTrimEnd,
          };
        }
        return clip;
      });

      return {
        ...lane,
        clips: updatedClips,
      };
    });

    return {
      ...track,
      lanes: updatedLanes,
    };
  });

  if (!found) {
    console.warn(`[overlayTimelineOperations] Clip ${clipId} not found`);
    return timelineDoc;
  }

  return {
    ...timelineDoc,
    tracks: updatedTracks,
  };
}

