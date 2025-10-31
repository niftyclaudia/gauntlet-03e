/**
 * Delete Operation
 * 
 * Deletes a clip from the timeline
 */

import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';

export interface DeleteClipParams {
  clipId: string;
  mode?: 'ripple' | 'overwrite';
}

export function deleteClip(
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  params: DeleteClipParams
): TimelineDoc {
  const found = findClipInTimelineDoc(timelineDoc, params.clipId);
  if (!found) {
    throw new Error(`Clip ${params.clipId} not found`);
  }

  const { track, lane } = found;

  // Remove clip from lane
  const updatedClips = lane.clips.filter(c => c.id !== params.clipId);

  // Handle magnetic track (need to recalculate start times and order)
  if (track.isMagnetic && track.role === 'main') {
    const sortedClips = updatedClips.sort((a, b) => a.order - b.order);
    
    // Recalculate order and start times
    sortedClips.forEach((clip, index) => {
      clip.order = index;
      
      // Recalculate start time
      let startTime = 0;
      for (let i = 0; i < index; i++) {
        const prevClip = sortedClips[i];
        const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
        if (prevLib) {
          startTime += prevClip.trimEnd - prevClip.trimStart;
        }
      }
      clip.start = startTime;
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
    ...timelineDoc,
    tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
  };
}

