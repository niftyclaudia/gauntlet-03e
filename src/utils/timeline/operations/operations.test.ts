/**
 * Timeline Operations Test Suite
 * 
 * Comprehensive vitest tests for timeline operations
 * Based on PR #17 architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyTimelineDoc } from '../../../types/timeline';
import { VideoClip, TimelineClip } from '../../../types/video';
import { insertClip } from './insert';
import { deleteClip } from './delete';
import { moveClip } from './move';
import { splitClip } from './split';
import { trimClip } from './trim';

// Mock library clips
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

describe('Timeline Operations', () => {
  let timelineDoc: ReturnType<typeof createEmptyTimelineDoc>;
  let library: VideoClip[];

  beforeEach(() => {
    timelineDoc = createEmptyTimelineDoc();
    library = [
      createMockLibraryClip('clip1', 10),
      createMockLibraryClip('clip2', 15),
      createMockLibraryClip('clip3', 20),
    ];
  });

  describe('insertClip', () => {
    it('should insert clip into main track', () => {
      const mainTrack = timelineDoc.tracks[0];
      const result = insertClip(timelineDoc, library, {
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      expect(result.insertedClipId).toBeDefined();
      expect(result.timelineDoc.tracks[0].lanes[0].clips).toHaveLength(1);
      expect(result.timelineDoc.tracks[0].lanes[0].clips[0].libraryClipId).toBe('clip1');
    });

    it('should insert clip at specific index', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert first clip
      const result1 = insertClip(timelineDoc, library, {
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      // Insert second clip at index 0
      const result2 = insertClip(result1.timelineDoc, library, {
        libraryClipId: 'clip2',
        trackId: mainTrack.id,
        insertionIndex: 0,
      });

      expect(result2.timelineDoc.tracks[0].lanes[0].clips).toHaveLength(2);
      expect(result2.timelineDoc.tracks[0].lanes[0].clips[0].libraryClipId).toBe('clip2');
      expect(result2.timelineDoc.tracks[0].lanes[0].clips[1].libraryClipId).toBe('clip1');
    });
  });

  describe('deleteClip', () => {
    it('should delete clip from timeline', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert clip
      const insertResult = insertClip(timelineDoc, library, {
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      const clipId = insertResult.insertedClipId;

      // Delete clip
      const deleteResult = deleteClip(insertResult.timelineDoc, library, {
        clipId,
      });

      expect(deleteResult.tracks[0].lanes[0].clips).toHaveLength(0);
    });
  });

  describe('splitClip', () => {
    it('should split clip at specified time', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert clip
      const insertResult = insertClip(timelineDoc, library, {
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      const clipId = insertResult.insertedClipId;

      // Split clip at 5 seconds
      const splitResult = splitClip(insertResult.timelineDoc, library, {
        clipId,
        splitTime: 5,
      });

      expect(splitResult.timelineDoc.tracks[0].lanes[0].clips).toHaveLength(2);
      expect(splitResult.secondClipId).toBeDefined();
    });
  });

  describe('trimClip', () => {
    it('should trim clip to new bounds', () => {
      const mainTrack = timelineDoc.tracks[0];
      
      // Insert clip
      const insertResult = insertClip(timelineDoc, library, {
        libraryClipId: 'clip1',
        trackId: mainTrack.id,
      });

      const clipId = insertResult.insertedClipId;

      // Trim clip
      const trimResult = trimClip(insertResult.timelineDoc, library, {
        clipId,
        newTrimStart: 2,
        newTrimEnd: 8,
      });

      const clip = trimResult.tracks[0].lanes[0].clips[0];
      expect(clip.trimStart).toBe(2);
      expect(clip.trimEnd).toBe(8);
    });
  });
});

