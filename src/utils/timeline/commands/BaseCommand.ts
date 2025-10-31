/**
 * Base Command for Timeline Operations
 * 
 * Command pattern implementation for undo/redo functionality
 * Based on PR #17 architecture
 */

import { TimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';

/**
 * Base command interface for timeline operations
 */
export abstract class BaseCommand {
  /** Command description for debugging/logging */
  abstract description: string;

  /**
   * Execute the command
   * @param timelineDoc - Current timeline document
   * @param library - Library clips array
   * @returns New timeline document after command execution
   */
  abstract execute(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc;

  /**
   * Undo the command
   * @param timelineDoc - Current timeline document
   * @param library - Library clips array
   * @returns New timeline document after undo
   */
  abstract undo(timelineDoc: TimelineDoc, library: VideoClip[]): TimelineDoc;
}

