/**
 * Move Command
 * 
 * Command to move a clip within or across tracks
 */

import { BaseCommand } from './BaseCommand';
import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { moveClip } from '../operations/move';

export interface MoveCommandParams {
  clipId: string;
  targetTrackId: string;
  targetLaneId?: string;
  targetIndex?: number;
  targetTime?: number; // For overlay tracks
  mode?: 'ripple' | 'overwrite';
}

export class MoveCommand extends BaseCommand {
  description: string;
  private params: MoveCommandParams;
  private previousState: {
    trackId: string;
    laneId: string;
    index: number;
    start?: number;
    order: number;
  } | null = null;

  constructor(params: MoveCommandParams) {
    super();
    this.params = params;
    this.description = `Move clip ${params.clipId} to track ${params.targetTrackId}`;
  }

  execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    // Store previous state for undo
    const found = findClipInTimelineDoc(timelineDoc, this.params.clipId);
    if (found) {
      const track = found.track;
      const lane = found.lane;
      const clipIndex = lane.clips.findIndex(c => c.id === this.params.clipId);
      
      this.previousState = {
        trackId: track.id,
        laneId: lane.id,
        index: clipIndex,
        start: found.clip.start,
        order: found.clip.order,
      };
    }

    return moveClip(timelineDoc, library, this.params);
  }

  undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    if (!this.previousState) {
      return timelineDoc;
    }

    // Move clip back to original position
    const undoParams: MoveCommandParams = {
      clipId: this.params.clipId,
      targetTrackId: this.previousState.trackId,
      targetLaneId: this.previousState.laneId,
      targetIndex: this.previousState.index,
      targetTime: this.previousState.start,
    };

    return moveClip(timelineDoc, library, undoParams);
  }
}

