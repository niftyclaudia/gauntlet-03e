/**
 * Timeline Commands Test Suite
 * 
 * Tests for command pattern implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyTimelineDoc } from '../../../types/timeline';
import { VideoClip } from '../../../types/video';
import { InsertCommand } from './InsertCommand';
import { DeleteCommand } from './DeleteCommand';
import { TrimCommand } from './TrimCommand';

const createMockLibraryClip = (id: string, duration: number = 10): VideoClip => ({
  id,
  path: `/test/${id}.mp4`,
  filename: `${id}.mp4`,
  duration,
  thumbnail: `/test/${id}.jpg`,
  metadata: {
    width: 1920,
    height: 1080,
    framerate: 30,
    codec: 'h264',
  },
  importedAt: Date.now(),
});

describe('Timeline Commands', () => {
  let timelineDoc: ReturnType<typeof createEmptyTimelineDoc>;
  let library: VideoClip[];

  beforeEach(() => {
    timelineDoc = createEmptyTimelineDoc();
    library = [
      createMockLibraryClip('clip1', 10),
      createMockLibraryClip('clip2', 15),
    ];
  });

  describe('InsertCommand', () => {
    it('should execute and undo insert', () => {
      const mainTrack = timelineDoc.tracks[0];
      const command = new InsertCommand({
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      // Execute
      const result = command.execute(timelineDoc, library);
      expect(result.tracks[0].lanes[0].clips).toHaveLength(1);

      // Undo
      const undone = command.undo(result, library);
      expect(undone.tracks[0].lanes[0].clips).toHaveLength(0);
    });
  });

  describe('DeleteCommand', () => {
    it('should execute and undo delete', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert clip first
      const insertCommand = new InsertCommand({
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });
      const afterInsert = insertCommand.execute(timelineDoc, library);
      const clipId = afterInsert.tracks[0].lanes[0].clips[0].id;

      // Delete
      const deleteCommand = new DeleteCommand({ clipId });
      const afterDelete = deleteCommand.execute(afterInsert, library);
      expect(afterDelete.tracks[0].lanes[0].clips).toHaveLength(0);

      // Undo
      const undone = deleteCommand.undo(afterDelete, library);
      expect(undone.tracks[0].lanes[0].clips).toHaveLength(1);
    });
  });

  describe('TrimCommand', () => {
    it('should execute and undo trim', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert clip first
      const insertCommand = new InsertCommand({
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });
      const afterInsert = insertCommand.execute(timelineDoc, library);
      const clipId = afterInsert.tracks[0].lanes[0].clips[0].id;

      // Trim
      const trimCommand = new TrimCommand({
        clipId,
        newTrimStart: 2,
        newTrimEnd: 8,
      });
      const afterTrim = trimCommand.execute(afterInsert, library);
      const trimmedClip = afterTrim.tracks[0].lanes[0].clips[0];
      expect(trimmedClip.trimStart).toBe(2);
      expect(trimmedClip.trimEnd).toBe(8);

      // Undo
      const undone = trimCommand.undo(afterTrim, library);
      const originalClip = undone.tracks[0].lanes[0].clips[0];
      expect(originalClip.trimStart).toBe(0);
      expect(originalClip.trimEnd).toBe(10);
    });
  });
});

