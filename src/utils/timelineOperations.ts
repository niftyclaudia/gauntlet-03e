/**
 * Timeline state management operations
 * 
 * Functions for adding, removing, and reordering clips on the timeline
 */

import { TimelineClip, VideoClip } from '../types/video';
import { v4 as uuidv4 } from 'uuid';

/**
 * Add a clip from library to timeline
 * 
 * @param libraryClipId - ID of the clip from library
 * @param timeline - Current timeline array
 * @param library - Library clips array
 * @param insertionIndex - Optional index where to insert the clip (defaults to end)
 * @returns New timeline array with clip inserted at specified position
 */
export function addClipToTimeline(
  libraryClipId: string,
  timeline: TimelineClip[],
  library: VideoClip[],
  insertionIndex?: number
): TimelineClip[] {
  const libraryClip = library.find(clip => clip.id === libraryClipId);
  
  if (!libraryClip) {
    console.warn(`[timelineOperations] Library clip ${libraryClipId} not found`);
    return timeline;
  }

  const newClip: TimelineClip = {
    id: uuidv4(),
    libraryClipId: libraryClipId,
    trimStart: 0,
    trimEnd: libraryClip.duration,
    order: insertionIndex !== undefined ? insertionIndex : timeline.length,
  };

  // If insertion index is provided and valid, insert at that position
  if (insertionIndex !== undefined && insertionIndex >= 0 && insertionIndex <= timeline.length) {
    const newTimeline = [...timeline];
    newTimeline.splice(insertionIndex, 0, newClip);
    // Recalculate order properties
    return newTimeline.map((clip, index) => ({
      ...clip,
      order: index,
    }));
  }

  // Otherwise, append to end
  return [...timeline, newClip];
}

/**
 * Reorder a clip on the timeline by dragging
 * 
 * @param dragIndex - Index of the clip being dragged
 * @param hoverIndex - Index where clip is being dropped
 * @param timeline - Current timeline array
 * @returns New timeline array with clip reordered
 */
export function reorderTimelineClip(
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

  const newTimeline = [...timeline];
  const [draggedClip] = newTimeline.splice(dragIndex, 1);
  newTimeline.splice(hoverIndex, 0, draggedClip);

  // Recalculate order properties
  return newTimeline.map((clip, index) => ({
    ...clip,
    order: index,
  }));
}

/**
 * Remove a clip from the timeline
 * 
 * @param clipId - ID of the clip to remove
 * @param timeline - Current timeline array
 * @returns New timeline array without the clip
 */
export function removeClipFromTimeline(
  clipId: string,
  timeline: TimelineClip[]
): TimelineClip[] {
  const newTimeline = timeline.filter(clip => clip.id !== clipId);

  // Recalculate order properties
  return newTimeline.map((clip, index) => ({
    ...clip,
    order: index,
  }));
}

/**
 * Split a clip at the playhead position
 * 
 * @param clipId - ID of the clip to split
 * @param playheadPosition - Current playhead position in seconds
 * @param timeline - Current timeline array
 * @param library - Library clips array
 * @returns New timeline array with clip split into two segments
 */
export function splitClipAtPlayhead(
  clipId: string,
  playheadPosition: number,
  timeline: TimelineClip[],
  library: VideoClip[]
): TimelineClip[] {
  // Find clip to split
  const clipIndex = timeline.findIndex(c => c.id === clipId);
  const clip = timeline[clipIndex];
  
  if (!clip) {
    console.warn(`[timelineOperations] Clip ${clipId} not found for split`);
    return timeline;
  }

  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  if (!libraryClip) {
    console.warn(`[timelineOperations] Library clip ${clip.libraryClipId} not found for split`);
    return timeline;
  }

  // Calculate clip start time in timeline (cumulative time before this clip)
  let timelineStartTime = 0;
  for (let i = 0; i < clipIndex; i++) {
    const prevClip = timeline[i];
    const prevLibraryClip = library.find(lc => lc.id === prevClip.libraryClipId);
    if (prevLibraryClip) {
      timelineStartTime += prevClip.trimEnd - prevClip.trimStart;
    }
  }

  // Calculate local playhead position within the clip
  const localPlayheadTime = playheadPosition - timelineStartTime;
  
  // Validate split point (minimum 1 second segments)
  const minDuration = 1.0;
  if (localPlayheadTime < clip.trimStart + minDuration || 
      localPlayheadTime > clip.trimEnd - minDuration) {
    console.warn(`[timelineOperations] Cannot split clip - split point too close to edges`);
    return timeline;
  }

  // Create two segments
  const segment1: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: clip.trimStart,
    trimEnd: localPlayheadTime,
    order: clip.order
  };

  const segment2: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: localPlayheadTime,
    trimEnd: clip.trimEnd,
    order: clip.order + 1
  };

  // Insert segments and reorder
  const newTimeline = [...timeline];
  newTimeline.splice(clipIndex, 1, segment1, segment2);
  
  // Recalculate order properties for all clips
  return newTimeline.map((c, i) => ({ ...c, order: i }));
}

