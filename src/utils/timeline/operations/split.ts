/**
 * Split Operation
 * 
 * Splits a clip at a specific timeline time
 */

import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { TimelineClip, VideoClip } from '../../../types/video';
import { v4 as uuidv4 } from 'uuid';

export interface SplitClipParams {
  clipId: string;
  splitTime: number; // Timeline time where to split
}

export interface SplitClipResult {
  timelineDoc: TimelineDoc;
  secondClipId: string;
}

export function splitClip(
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  params: SplitClipParams
): SplitClipResult {
  const found = findClipInTimelineDoc(timelineDoc, params.clipId);
  if (!found) {
    throw new Error(`Clip ${params.clipId} not found`);
  }

  const { clip, track, lane } = found;

  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  if (!libraryClip) {
    throw new Error(`Library clip ${clip.libraryClipId} not found`);
  }

  // Calculate clip timeline position
  let clipStartTime = clip.start;
  if (clipStartTime === undefined) {
    // Calculate cumulative time for magnetic tracks
    if (track.role === 'main') {
      const sortedClips = lane.clips.sort((a, b) => a.order - b.order);
      clipStartTime = 0;
      for (const prevClip of sortedClips) {
        if (prevClip.id === clip.id) break;
        const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
        if (prevLib) {
          clipStartTime += prevClip.trimEnd - prevClip.trimStart;
        }
      }
    } else {
      clipStartTime = 0;
    }
  }

  // Calculate clip duration
  const clipDuration = clip.trimEnd - clip.trimStart;
  const clipEndTime = clipStartTime + clipDuration;

  // Validate split time is within clip bounds
  if (params.splitTime < clipStartTime || params.splitTime > clipEndTime) {
    throw new Error(`Split time ${params.splitTime}s is outside clip bounds [${clipStartTime}s, ${clipEndTime}s]`);
  }

  // Calculate relative time within clip
  const relativeSplitTime = params.splitTime - clipStartTime;

  // Calculate source clip time
  const sourceTimeAtSplit = clip.trimStart + relativeSplitTime;

  // Create first clip (before split)
  const firstClip: TimelineClip = {
    ...clip,
    trimEnd: sourceTimeAtSplit,
  };

  // Create second clip (after split)
  const secondClip: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: sourceTimeAtSplit,
    trimEnd: clip.trimEnd,
    order: clip.order + 1,
    start: params.splitTime,
    trackId: track.id,
    laneId: lane.id,
  };

  // Update clips in lane
  let updatedClips = lane.clips.map(c => c.id === clip.id ? firstClip : c);

  // Insert second clip after first clip
  const insertIndex = updatedClips.findIndex(c => c.id === clip.id) + 1;
  updatedClips.splice(insertIndex, 0, secondClip);

  // For magnetic tracks, recalculate order and start times
  if (track.isMagnetic && track.role === 'main') {
    updatedClips.sort((a, b) => {
      if (a.id === clip.id || b.id === clip.id) return a.order - b.order;
      return a.order - b.order;
    });

    updatedClips.forEach((c, index) => {
      c.order = index;
      let startTime = 0;
      for (let i = 0; i < index; i++) {
        const prevClip = updatedClips[i];
        const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
        if (prevLib) {
          startTime += prevClip.trimEnd - prevClip.trimStart;
        }
      }
      c.start = startTime;
    });
  }

  // Update lane
  const updatedLane = {
    ...lane,
    clips: updatedClips,
  };

  // Update track
  const updatedTrack = {
    ...track,
    lanes: track.lanes.map(l => l.id === lane.id ? updatedLane : l),
  };

  // Update timeline document
  return {
    timelineDoc: {
      ...timelineDoc,
      tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
    },
    secondClipId: secondClip.id,
  };
}

