/**
 * Move Operation
 * 
 * Moves a clip within or across tracks
 */

import { TimelineDoc, findClipInTimelineDoc, findTrackById, findLaneById } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';

export interface MoveClipParams {
  clipId: string;
  targetTrackId: string;
  targetLaneId?: string;
  targetIndex?: number;
  targetTime?: number; // For overlay tracks
  mode?: 'ripple' | 'overwrite';
}

export function moveClip(
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  params: MoveClipParams
): TimelineDoc {
  const found = findClipInTimelineDoc(timelineDoc, params.clipId);
  if (!found) {
    throw new Error(`Clip ${params.clipId} not found`);
  }

  const { clip, track: sourceTrack, lane: sourceLane } = found;

  const targetTrack = findTrackById(timelineDoc, params.targetTrackId);
  if (!targetTrack) {
    throw new Error(`Target track ${params.targetTrackId} not found`);
  }

  const targetLaneId = params.targetLaneId || targetTrack.lanes[0]?.id;
  if (!targetLaneId) {
    throw new Error(`Target track ${params.targetTrackId} has no lanes`);
  }

  const targetLaneResult = findLaneById(timelineDoc, targetLaneId);
  if (!targetLaneResult) {
    throw new Error(`Target lane ${targetLaneId} not found`);
  }

  const { lane: targetLane } = targetLaneResult;

  // Remove clip from source lane
  const sourceUpdatedClips = sourceLane.clips.filter(c => c.id !== params.clipId);

  // Update source lane
  const sourceUpdatedLane = {
    ...sourceLane,
    clips: sourceUpdatedClips,
  };

  // Update source track
  const sourceUpdatedTrack = {
    ...sourceTrack,
    lanes: sourceTrack.lanes.map(l => l.id === sourceLane.id ? sourceUpdatedLane : l),
  };

  // Update clip with new track/lane info
  const movedClip = {
    ...clip,
    trackId: targetTrack.id,
    laneId: targetLane.id,
  };

  // Add clip to target lane
  let targetUpdatedClips = [...targetLane.clips, movedClip];

  // Handle magnetic track
  if (targetTrack.isMagnetic && targetTrack.role === 'main') {
    const targetIndex = params.targetIndex !== undefined
      ? Math.max(0, Math.min(params.targetIndex, targetUpdatedClips.length - 1))
      : targetUpdatedClips.length - 1;

    // Sort by order
    targetUpdatedClips.sort((a, b) => {
      if (a.id === params.clipId) return targetIndex - b.order;
      if (b.id === params.clipId) return a.order - targetIndex;
      return a.order - b.order;
    });

    // Recalculate order and start times
    targetUpdatedClips.forEach((c, index) => {
      c.order = index;
      let startTime = 0;
      for (let i = 0; i < index; i++) {
        const prevClip = targetUpdatedClips[i];
        const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
        if (prevLib) {
          startTime += prevClip.trimEnd - prevClip.trimStart;
        }
      }
      c.start = startTime;
    });
  } else {
    // Handle overlay track
    const targetTime = params.targetTime ?? 0;
    movedClip.start = targetTime;
    targetUpdatedClips.sort((a, b) => {
      const aStart = a.start ?? 0;
      const bStart = b.start ?? 0;
      return aStart - bStart;
    });
  }

  // Update target lane
  const targetUpdatedLane = {
    ...targetLane,
    clips: targetUpdatedClips,
  };

  // Update target track
  const targetUpdatedTrack = {
    ...targetTrack,
    lanes: targetTrack.lanes.map(l => l.id === targetLane.id ? targetUpdatedLane : l),
  };

  // Update timeline document
  return {
    ...timelineDoc,
    tracks: timelineDoc.tracks.map(t => {
      if (t.id === sourceTrack.id) return sourceUpdatedTrack;
      if (t.id === targetTrack.id) return targetUpdatedTrack;
      return t;
    }),
  };
}

