/**
 * Trim Command
 * 
 * Command to trim a clip (adjust in/out points)
 */

import { BaseCommand } from './BaseCommand';
import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { trimClip } from '../operations/trim';

export interface TrimCommandParams {
  clipId: string;
  newTrimStart: number;
  newTrimEnd: number;
  mode?: 'ripple' | 'overwrite';
}

export class TrimCommand extends BaseCommand {
  description: string;
  private params: TrimCommandParams;
  private previousTrimState: {
    trimStart: number;
    trimEnd: number;
  } | null = null;

  constructor(params: TrimCommandParams) {
    super();
    this.params = params;
    this.description = `Trim clip ${params.clipId} to [${params.newTrimStart}s, ${params.newTrimEnd}s]`;
  }

  execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    // Store previous trim state
    const found = findClipInTimelineDoc(timelineDoc, this.params.clipId);
    if (found) {
      this.previousTrimState = {
        trimStart: found.clip.trimStart,
        trimEnd: found.clip.trimEnd,
      };
    }

    return trimClip(timelineDoc, library, this.params);
  }

  undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    if (!this.previousTrimState) {
      return timelineDoc;
    }

    // Restore previous trim state
    const undoParams: TrimCommandParams = {
      clipId: this.params.clipId,
      newTrimStart: this.previousTrimState.trimStart,
      newTrimEnd: this.previousTrimState.trimEnd,
      mode: this.params.mode,
    };

    return trimClip(timelineDoc, library, undoParams);
  }
}

