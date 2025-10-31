/**
 * Insert Command
 * 
 * Command to insert a clip into the timeline
 */

import { BaseCommand } from './BaseCommand';
import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { insertClip } from '../operations/insert';

export interface InsertCommandParams {
  libraryClipId: string;
  trackId: string;
  laneId?: string;
  insertionIndex?: number;
  atTime?: number; // For overlay tracks
  mode?: 'ripple' | 'overwrite';
}

export class InsertCommand extends BaseCommand {
  description: string;
  private params: InsertCommandParams;
  private insertedClipId: string | null = null;

  constructor(params: InsertCommandParams) {
    super();
    this.params = params;
    this.description = `Insert clip ${params.libraryClipId} into track ${params.trackId}`;
  }

  execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    const result = insertClip(timelineDoc, library, this.params);
    this.insertedClipId = result.insertedClipId;
    return result.timelineDoc;
  }

  undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    if (!this.insertedClipId) {
      return timelineDoc;
    }

    // Find and remove the inserted clip
    const found = findClipInTimelineDoc(timelineDoc, this.insertedClipId);
    if (!found) {
      return timelineDoc;
    }

    const { track, lane } = found;

    // Remove clip from lane
    const updatedClips = lane.clips.filter(c => c.id !== this.insertedClipId);

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
}

