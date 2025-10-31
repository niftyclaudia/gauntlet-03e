/**
 * Magnetic Timeline Operations
 * 
 * Implements gapless main track with ripple edits per timeline-behavior.md
 * All operations maintain the invariant: adjacent clips have no gaps
 * 
 * Core invariant: For all adjacent clips i,j: i.start + i.duration == j.start
 */

import { TimelineClip, VideoClip } from '../types/video';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate clip duration from trim points
 */
function getClipDuration(clip: TimelineClip): number {
  return clip.trimEnd - clip.trimStart;
}

/**
 * Check if a timeline needs migration (missing start properties)
 */
export function needsMigration(timeline: TimelineClip[]): boolean {
  return timeline.length > 0 && timeline.some(clip => clip.start === undefined);
}

/**
 * Migrate timeline to magnetic format (adds start times)
 * Converts from order-based positioning to time-based positioning
 * 
 * Use this when loading old projects that don't have start times
 */
export function migrateToMagneticTimeline(timeline: TimelineClip[]): TimelineClip[] {
  if (timeline.length === 0) return timeline;
  
  // If already migrated, just validate and return
  if (!needsMigration(timeline)) {
    return timeline;
  }
  
  // Sort by order to ensure correct sequence
  const sorted = [...timeline].sort((a, b) => a.order - b.order);
  
  let currentStart = 0;
  const migrated = sorted.map((clip) => {
    const clipWithStart = {
      ...clip,
      start: currentStart,
    };
    // Calculate next clip's start (current clip's end)
    const clipDuration = getClipDuration(clip);
    currentStart += clipDuration;
    return clipWithStart;
  });
  
  // Validate after migration
  if (!validateGaplessInvariant(migrated)) {
    console.warn('[magneticTimelineOperations] Migration produced invalid timeline, enforcing invariant');
    return enforceGaplessInvariant(migrated);
  }
  
  return migrated;
}

/**
 * Enforce gapless invariant: ensure all clips are properly positioned
 * For magnetic main track: i.start + i.duration == j.start for all adjacent clips
 */
export function enforceGaplessInvariant(timeline: TimelineClip[]): TimelineClip[] {
  if (timeline.length === 0) return timeline;
  
  // Sort by order
  const sorted = [...timeline].sort((a, b) => a.order - b.order);
  
  let currentStart = 0;
  return sorted.map((clip) => {
    const clipWithStart = {
      ...clip,
      start: currentStart,
    };
    // Move to next clip's start position
    currentStart += getClipDuration(clipWithStart);
    return clipWithStart;
  });
}

/**
 * Validate gapless invariant - returns true if all adjacent clips are gapless
 * Allows small floating point tolerance (0.001 seconds)
 */
export function validateGaplessInvariant(timeline: TimelineClip[]): boolean {
  if (timeline.length <= 1) return true;
  
  const sorted = [...timeline].sort((a, b) => a.order - b.order);
  
  // Check that all clips have start property
  if (sorted.some(clip => clip.start === undefined)) {
    return false;
  }
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const clip = sorted[i];
    const nextClip = sorted[i + 1];
    const clipEnd = clip.start + getClipDuration(clip);
    
    // Check if there's a gap or overlap (allowing small floating point tolerance)
    const gap = Math.abs(clipEnd - nextClip.start);
    if (gap > 0.001) {
      console.warn(
        `[magneticTimelineOperations] Invariant violation: gap of ${gap.toFixed(3)}s between clips ${i} and ${i + 1}`
      );
      return false;
    }
  }
  return true;
}

/**
 * Add clip to timeline with ripple insert behavior
 * Inserting at a position shifts all downstream clips right (later in time)
 * 
 * @param libraryClipId - ID of the clip from library
 * @param timeline - Current timeline array
 * @param library - Library clips array
 * @param insertionIndex - Index where to insert (defaults to end)
 * @param mode - 'ripple' (default) or 'overwrite'
 */
export function addClipToTimelineMagnetic(
  libraryClipId: string,
  timeline: TimelineClip[],
  library: VideoClip[],
  insertionIndex?: number,
  mode: 'ripple' | 'overwrite' = 'ripple'
): TimelineClip[] {
  // Ensure timeline is migrated and valid
  const migrated = migrateToMagneticTimeline(timeline);
  let sorted = enforceGaplessInvariant(migrated);
  
  const libraryClip = library.find(clip => clip.id === libraryClipId);
  
  if (!libraryClip) {
    console.warn(`[magneticTimelineOperations] Library clip ${libraryClipId} not found`);
    return timeline;
  }

  const insertIdx = insertionIndex !== undefined 
    ? Math.max(0, Math.min(insertionIndex, sorted.length))
    : sorted.length;

  // Calculate start time for new clip
  let newClipStart: number;
  if (insertIdx === 0) {
    newClipStart = 0;
  } else if (insertIdx >= sorted.length) {
    // Insert at end
    const lastClip = sorted[sorted.length - 1];
    newClipStart = lastClip.start + getClipDuration(lastClip);
  } else {
    // Insert in middle - use the start time of the clip at this position
    newClipStart = sorted[insertIdx].start;
  }

  const newClip: TimelineClip = {
    id: uuidv4(),
    libraryClipId: libraryClipId,
    trimStart: 0,
    trimEnd: libraryClip.duration,
    order: insertIdx,
    start: newClipStart,
  };

  // Insert new clip
  const newTimeline = [...sorted];
  newTimeline.splice(insertIdx, 0, newClip);

  // Recalculate orders
  const withOrders = newTimeline.map((clip, index) => ({
    ...clip,
    order: index,
  }));

  // If ripple mode, shift downstream clips right
  if (mode === 'ripple') {
    const clipDuration = getClipDuration(newClip);
    const shifted = withOrders.map((clip, index) => {
      if (index > insertIdx) {
        // Shift downstream clips right by new clip's duration
        return {
          ...clip,
          start: clip.start + clipDuration,
        };
      }
      return clip;
    });
    return enforceGaplessInvariant(shifted);
  } else {
    // Overwrite mode - would truncate/replace collision region
    // For now, just enforce invariant
    return enforceGaplessInvariant(withOrders);
  }
}

/**
 * Delete clip with ripple behavior (closes gap by shifting downstream left)
 * 
 * @param clipId - ID of the clip to remove
 * @param timeline - Current timeline array
 */
export function removeClipFromTimelineMagnetic(
  clipId: string,
  timeline: TimelineClip[]
): TimelineClip[] {
  // Ensure timeline is migrated and valid
  const migrated = migrateToMagneticTimeline(timeline);
  let sorted = enforceGaplessInvariant(migrated);
  
  const clipIndex = sorted.findIndex(clip => clip.id === clipId);
  if (clipIndex < 0) {
    console.warn(`[magneticTimelineOperations] Clip ${clipId} not found`);
    return timeline;
  }

  const clipToRemove = sorted[clipIndex];
  const clipDuration = getClipDuration(clipToRemove);

  // Remove the clip
  const newTimeline = sorted.filter(clip => clip.id !== clipId);

  // Shift all downstream clips left (earlier in time) by removed clip's duration
  const shifted = newTimeline.map((clip, index) => {
    if (index >= clipIndex) {
      // Shift downstream clips left
      return {
        ...clip,
        start: clip.start - clipDuration,
      };
    }
    return clip;
  });

  // Recalculate orders
  const withOrders = shifted.map((clip, index) => ({
    ...clip,
    order: index,
  }));

  // Enforce gapless invariant
  return enforceGaplessInvariant(withOrders);
}

/**
 * Reorder clip with ripple behavior
 * Moving a clip to a new position ripples downstream content
 * 
 * @param dragIndex - Index of the clip being dragged
 * @param hoverIndex - Index where clip is being dropped
 * @param timeline - Current timeline array
 */
export function reorderTimelineClipMagnetic(
  dragIndex: number,
  hoverIndex: number,
  timeline: TimelineClip[]
): TimelineClip[] {
  if (
    dragIndex < 0 ||
    dragIndex >= timeline.length ||
    hoverIndex < 0 ||
    hoverIndex >= timeline.length ||
    dragIndex === hoverIndex
  ) {
    return timeline;
  }

  // Ensure timeline is migrated and valid
  const migrated = migrateToMagneticTimeline(timeline);
  let sorted = enforceGaplessInvariant(migrated);

  const draggedClip = sorted[dragIndex];
  const draggedDuration = getClipDuration(draggedClip);

  // Remove dragged clip
  const withoutDragged = sorted.filter((_, index) => index !== dragIndex);

  // Recalculate orders after removal
  let intermediate = withoutDragged.map((clip, index) => ({
    ...clip,
    order: index,
  }));

  // Recalculate start times after removal (shift left if dragged was earlier)
  if (dragIndex < hoverIndex) {
    // Dragging right - shift clips between dragIndex and hoverIndex left
    intermediate = intermediate.map((clip, index) => {
      if (index >= dragIndex && index < hoverIndex) {
        return {
          ...clip,
          start: clip.start - draggedDuration,
        };
      }
      return clip;
    });
  } else {
    // Dragging left - shift clips between hoverIndex and dragIndex right
    intermediate = intermediate.map((clip, index) => {
      if (index >= hoverIndex && index < dragIndex) {
        return {
          ...clip,
          start: clip.start + draggedDuration,
        };
      }
      return clip;
    });
  }

  // Calculate new start time for dragged clip
  let newStart: number;
  if (hoverIndex === 0) {
    newStart = 0;
  } else if (hoverIndex >= intermediate.length) {
    const lastClip = intermediate[intermediate.length - 1];
    newStart = lastClip.start + getClipDuration(lastClip);
  } else {
    newStart = intermediate[hoverIndex].start;
  }

  // Insert dragged clip at new position
  const newClip = {
    ...draggedClip,
    order: hoverIndex,
    start: newStart,
  };

  const withDragged = [...intermediate];
  withDragged.splice(hoverIndex, 0, newClip);

  // Shift downstream clips right by dragged clip's duration
  const shifted = withDragged.map((clip, index) => {
    if (index > hoverIndex) {
      return {
        ...clip,
        start: clip.start + draggedDuration,
      };
    }
    return clip;
  });

  // Recalculate orders
  const withOrders = shifted.map((clip, index) => ({
    ...clip,
    order: index,
  }));

  // Enforce gapless invariant
  return enforceGaplessInvariant(withOrders);
}

/**
 * Trim clip with ripple behavior
 * Trimming shifts downstream clips to maintain gapless invariant
 * 
 * @param clipId - ID of the clip to trim
 * @param newTrimStart - New trim start time
 * @param newTrimEnd - New trim end time
 * @param timeline - Current timeline array
 * @param library - Library clips array
 * @param mode - 'ripple' (default) or 'overwrite'
 */
export function trimClipMagnetic(
  clipId: string,
  newTrimStart: number,
  newTrimEnd: number,
  timeline: TimelineClip[],
  library: VideoClip[],
  mode: 'ripple' | 'overwrite' = 'ripple'
): TimelineClip[] {
  // Ensure timeline is migrated and valid
  const migrated = migrateToMagneticTimeline(timeline);
  let sorted = enforceGaplessInvariant(migrated);

  const clipIndex = sorted.findIndex(clip => clip.id === clipId);
  if (clipIndex < 0) {
    console.warn(`[magneticTimelineOperations] Clip ${clipId} not found`);
    return timeline;
  }

  const clip = sorted[clipIndex];
  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  if (!libraryClip) {
    console.warn(`[magneticTimelineOperations] Library clip ${clip.libraryClipId} not found`);
    return timeline;
  }

  // Calculate old and new durations
  const oldDuration = getClipDuration(clip);
  const newDuration = newTrimEnd - newTrimStart;
  const durationDelta = newDuration - oldDuration;

  // Update the trimmed clip
  const updatedClip = {
    ...clip,
    trimStart: newTrimStart,
    trimEnd: newTrimEnd,
  };

  const newTimeline = [...sorted];
  newTimeline[clipIndex] = updatedClip;

  // If ripple mode, shift downstream clips
  if (mode === 'ripple') {
    const shifted = newTimeline.map((clip, index) => {
      if (index > clipIndex) {
        // Shift downstream clips by duration delta
        return {
          ...clip,
          start: clip.start + durationDelta,
        };
      }
      return clip;
    });
    return enforceGaplessInvariant(shifted);
  } else {
    // Overwrite mode - no ripple
    return enforceGaplessInvariant(newTimeline);
  }
}

/**
 * Split clip at playhead position
 * Preserves gapless invariant
 */
export function splitClipAtPlayheadMagnetic(
  clipId: string,
  playheadPosition: number,
  timeline: TimelineClip[],
  library: VideoClip[]
): TimelineClip[] {
  // Ensure timeline is migrated and valid
  const migrated = migrateToMagneticTimeline(timeline);
  let sorted = enforceGaplessInvariant(migrated);

  const clipIndex = sorted.findIndex(c => c.id === clipId);
  const clip = sorted[clipIndex];
  
  if (!clip) {
    console.warn(`[magneticTimelineOperations] Clip ${clipId} not found for split`);
    return timeline;
  }

  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  if (!libraryClip) {
    console.warn(`[magneticTimelineOperations] Library clip ${clip.libraryClipId} not found for split`);
    return timeline;
  }

  // Calculate local playhead position within the clip on the timeline
  // This is the time offset from when the clip starts on the timeline
  const timelineOffset = playheadPosition - clip.start;
  
  // Convert timeline offset to source time within the clip
  // Timeline position 0 corresponds to trimStart, so we add trimStart to get source time
  const localPlayheadTime = clip.trimStart + timelineOffset;
  
  // Validate split point (minimum 1 second segments)
  const minDuration = 1.0;
  if (localPlayheadTime < clip.trimStart + minDuration || 
      localPlayheadTime > clip.trimEnd - minDuration) {
    console.warn(
      `[magneticTimelineOperations] Cannot split clip - split point too close to edges. ` +
      `localPlayheadTime=${localPlayheadTime.toFixed(2)}s, trimStart=${clip.trimStart.toFixed(2)}s, trimEnd=${clip.trimEnd.toFixed(2)}s`
    );
    return timeline;
  }

  // Create two segments
  const segment1: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: clip.trimStart,
    trimEnd: localPlayheadTime,
    order: clip.order,
    start: clip.start,
  };

  const segment2: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: localPlayheadTime,
    trimEnd: clip.trimEnd,
    order: clip.order + 1,
    start: clip.start + (localPlayheadTime - clip.trimStart), // Start where segment1 ends
  };

  // Replace clip with two segments
  const newTimeline = [...sorted];
  newTimeline.splice(clipIndex, 1, segment1, segment2);
  
  // Recalculate orders for all clips
  const withOrders = newTimeline.map((c, i) => ({ ...c, order: i }));

  // Enforce gapless invariant
  return enforceGaplessInvariant(withOrders);
}

