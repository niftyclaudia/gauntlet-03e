/**
 * Insert Operation
 * 
 * Inserts a clip into the timeline at the specified position
 */

import { TimelineDoc, Track, Lane, findTrackById, findLaneById } from '../../../types/timeline';
import { TimelineClip, VideoClip } from '../../../types/video';
import { v4 as uuidv4 } from 'uuid';

export interface InsertClipParams {
  libraryClipId: string;
  trackId: string;
  laneId?: string;
  insertionIndex?: number;
  atTime?: number; // For overlay tracks
  mode?: 'ripple' | 'overwrite';
}

export interface InsertClipResult {
  timelineDoc: TimelineDoc;
  insertedClipId: string;
}

export function insertClip(
  timelineDoc: TimelineDoc,
  library: VideoClip[],
  params: InsertClipParams
): InsertClipResult {
  const libraryClip = library.find(lc => lc.id === params.libraryClipId);
  if (!libraryClip) {
    throw new Error(`Library clip ${params.libraryClipId} not found`);
  }

  const track = findTrackById(timelineDoc, params.trackId);
  if (!track) {
    throw new Error(`Track ${params.trackId} not found`);
  }

  const laneId = params.laneId || track.lanes[0]?.id;
  if (!laneId) {
    throw new Error(`Track ${params.trackId} has no lanes`);
  }

  const laneResult = findLaneById(timelineDoc, laneId);
  if (!laneResult) {
    throw new Error(`Lane ${laneId} not found`);
  }

  const { lane } = laneResult;

  // Create new clip
  const newClip: TimelineClip = {
    id: uuidv4(),
    libraryClipId: params.libraryClipId,
    trimStart: 0,
    trimEnd: libraryClip.duration,
    order: 0,
    trackId: track.id,
    laneId: lane.id,
  };

  // Handle magnetic track (main track)
  if (track.isMagnetic && track.role === 'main') {
    const clips = lane.clips.sort((a, b) => a.order - b.order);
    const insertionIndex = params.insertionIndex !== undefined 
      ? Math.max(0, Math.min(params.insertionIndex, clips.length))
      : clips.length;

    // Calculate start time for new clip
    let startTime = 0;
    for (let i = 0; i < insertionIndex; i++) {
      const clip = clips[i];
      const clipLib = library.find(lc => lc.id === clip.libraryClipId);
      if (clipLib) {
        startTime += clip.trimEnd - clip.trimStart;
      }
    }

    // Insert clip
    const updatedClips = [...clips];
    updatedClips.splice(insertionIndex, 0, {
      ...newClip,
      start: startTime,
      order: insertionIndex,
    });

    // Update order for subsequent clips
    updatedClips.forEach((clip, index) => {
      clip.order = index;
      if (clip.start !== undefined && index > insertionIndex) {
        // Recalculate start times for clips after insertion
        let newStart = 0;
        for (let i = 0; i < index; i++) {
          const prevClip = updatedClips[i];
          const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
          if (prevLib) {
            newStart += prevClip.trimEnd - prevClip.trimStart;
          }
        }
        clip.start = newStart;
      }
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

    // Update timeline document
    return {
      timelineDoc: {
        ...timelineDoc,
        tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
      },
      insertedClipId: newClip.id,
    };
  } else {
    // Handle overlay track (freeform)
    const atTime = params.atTime ?? 0;
    
    const updatedClip: TimelineClip = {
      ...newClip,
      start: atTime,
    };

    // Add clip to lane
    const updatedClips = [...lane.clips, updatedClip].sort((a, b) => {
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

    // Update timeline document
    return {
      timelineDoc: {
        ...timelineDoc,
        tracks: timelineDoc.tracks.map(t => t.id === track.id ? updatedTrack : t),
      },
      insertedClipId: newClip.id,
    };
  }
}

