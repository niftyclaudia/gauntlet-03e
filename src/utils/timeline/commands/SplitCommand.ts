/**
 * Split Command
 * 
 * Command to split a clip at a specific time
 */

import { BaseCommand } from './BaseCommand';
import { TimelineDoc, findClipInTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { splitClip } from '../operations/split';

export interface SplitCommandParams {
  clipId: string;
  splitTime: number; // Timeline time where to split
}

export class SplitCommand extends BaseCommand {
  description: string;
  private params: SplitCommandParams;
  private originalClipState: {
    trimStart: number;
    trimEnd: number;
    start?: number;
    order: number;
  } | null = null;
  private secondClipId: string | null = null;

  constructor(params: SplitCommandParams) {
    super();
    this.params = params;
    this.description = `Split clip ${params.clipId} at ${params.splitTime}s`;
  }

  execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    // Store original clip state
    const found = findClipInTimelineDoc(timelineDoc, this.params.clipId);
    if (found) {
      this.originalClipState = {
        trimStart: found.clip.trimStart,
        trimEnd: found.clip.trimEnd,
        start: found.clip.start,
        order: found.clip.order,
      };
    }

    const result = splitClip(timelineDoc, library, this.params);
    this.secondClipId = result.secondClipId;
    return result.timelineDoc;
  }

  undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc {
    if (!this.originalClipState || !this.secondClipId) {
      return timelineDoc;
    }

    // Find original clip
    const originalFound = findClipInTimelineDoc(timelineDoc, this.params.clipId);
    if (!originalFound) {
      return timelineDoc;
    }

    // Find second clip
    const secondFound = findClipInTimelineDoc(timelineDoc, this.secondClipId);
    if (!secondFound) {
      return timelineDoc;
    }

    // Restore original clip trim points
    const restoredClip = {
      ...originalFound.clip,
      trimStart: this.originalClipState.trimStart,
      trimEnd: this.originalClipState.trimEnd,
    };

    // Update lane: remove second clip, restore original
    const updatedClips = originalFound.lane.clips
      .filter(c => c.id !== this.secondClipId)
      .map(c => c.id === this.params.clipId ? restoredClip : c);

    // Sort clips
    if (originalFound.track.role === 'main') {
      updatedClips.sort((a, b) => a.order - b.order);
    } else {
      updatedClips.sort((a, b) => (a.start || 0) - (b.start || 0));
    }

    // Update lane
    const updatedLane = {
      ...originalFound.lane,
      clips: updatedClips,
    };

    // Update track
    const updatedTrack = {
      ...originalFound.track,
      lanes: originalFound.track.lanes.map(l => l.id === originalFound.lane.id ? updatedLane : l),
    };

    // Update timeline document
    return {
      ...timelineDoc,
      tracks: timelineDoc.tracks.map(t => t.id === originalFound.track.id ? updatedTrack : t),
    };
  }
}

