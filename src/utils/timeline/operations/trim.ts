/**
 * Trim Operation
 * 
 * Trims a clip (adjusts in/out points)
 */

import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';

export interface TrimClipParams {
  clipId: string;
  newTrimStart: number;
  newTrimEnd: number;
  mode?: 'ripple' | 'overwrite';
}

export function trimClip(
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  params: TrimClipParams
): TimelineDoc {
  const found = findClipInTimelineDoc(timelineDoc, params.clipId);
  if (!found) {
    throw new Error(`Clip ${params.clipId} not found`);
  }

  const { clip, track, lane } = found;

  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  if (!libraryClip) {
    throw new Error(`Library clip ${clip.libraryClipId} not found`);
  }

  // Validate trim points
  if (params.newTrimStart < 0 || params.newTrimEnd > libraryClip.duration) {
    throw new Error(`Trim points out of bounds: [${params.newTrimStart}, ${params.newTrimEnd}]`);
  }

  if (params.newTrimStart >= params.newTrimEnd) {
    throw new Error(`Invalid trim points: start (${params.newTrimStart}) >= end (${params.newTrimEnd})`);
  }

  // Update clip trim points
  const updatedClip = {
    ...clip,
    trimStart: params.newTrimStart,
    trimEnd: params.newTrimEnd,
  };

  // For magnetic tracks, may need to recalculate subsequent clip positions
  if (track.isMagnetic && track.role === 'main') {
    const clips = lane.clips.sort((a, b) => a.order - b.order);
    const clipIndex = clips.findIndex(c => c.id === params.clipId);
    
    // Update the clip
    clips[clipIndex] = updatedClip;

    // Recalculate start times for all clips
    clips.forEach((c, index) => {
      let startTime = 0;
      for (let i = 0; i < index; i++) {
        const prevClip = clips[i];
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
    clips: lane.clips.map(c => c.id === params.clipId ? updatedClip : c),
  };

  // Update track
  const updatedTrack = {
    ...track,
    lanes: track.lanes.map(l => l.id === lane.id ? updatedLane : l),
  };

  // Update timeline document
  return {
    ...timelineDoc,
    tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
  };
}

