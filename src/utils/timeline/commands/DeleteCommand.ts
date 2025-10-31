/**
 * Delete Command
 * 
 * Command to delete a clip from the timeline
 */

import { BaseCommand } from './BaseCommand';
import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { deleteClip } from '../operations/delete';

export interface DeleteCommandParams {
  clipId: string;
  mode?: 'ripple' | 'overwrite';
}

export class DeleteCommand extends BaseCommand {
  description: string;
  private params: DeleteCommandParams;
  private deletedClip: { clip: any; trackId: string; laneId: string } | null = null;

  constructor(params: DeleteCommandParams) {
    super();
    this.params = params;
    this.description = `Delete clip ${params.clipId}`;
  }

  execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    // Store deleted clip for undo
    const found = findClipInTimelineDoc(timelineDoc, this.params.clipId);
    if (found) {
      this.deletedClip = {
        clip: { ...found.clip },
        trackId: found.track.id,
        laneId: found.lane.id,
      };
    }

    return deleteClip(timelineDoc, library, this.params);
  }

  undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    if (!this.deletedClip) {
      return timelineDoc;
    }

    // Find track and lane
    const track = timelineDoc.tracks.find(t => t.id === this.deletedClip!.trackId);
    if (!track) {
      return timelineDoc;
    }

    const lane = track.lanes.find(l => l.id === this.deletedClip!.laneId);
    if (!lane) {
      return timelineDoc;
    }

    // Check if clip already exists
    if (lane.clips.some(c => c.id === this.deletedClip!.clip.id)) {
      return timelineDoc;
    }

    // Restore clip
    const updatedClips = [...lane.clips, this.deletedClip.clip];

    // Sort clips appropriately
    if (track.role === 'main') {
      updatedClips.sort((a, b) => a.order - b.order);
    } else {
      updatedClips.sort((a, b) => (a.start || 0) - (b.start || 0));
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
}

