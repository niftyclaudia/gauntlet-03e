/**
 * Timeline calculation utilities
 * 
 * Functions for calculating clip positions, durations, and zoom levels
 * for the timeline interface.
 */

import { TimelineClip, VideoClip } from '../types/video';

/** Pixels per second at 100% zoom - reasonable base scale for video editor */
const BASE_PIXELS_PER_SECOND = 10;

/** Minimum clip width in pixels (matches TimelineClipCard) */
const MIN_CLIP_WIDTH = 50;
/** Maximum clip width in pixels (matches TimelineClipCard) */
const MAX_CLIP_WIDTH = 5000;

/**
 * Apply width constraints matching TimelineClipCard rendering
 * This ensures position calculations use the same width as rendered clips
 */
export function applyClipWidthConstraints(width: number): number {
  return Math.max(MIN_CLIP_WIDTH, Math.min(width, MAX_CLIP_WIDTH));
}

/**
 * Calculate the pixel position (X coordinate) of a clip on the timeline
 * 
 * @param clipIndex - Index of the clip in the timeline array
 * @param timeline - Array of timeline clips
 * @param library - Array of library clips
 * @param zoom - Timeline zoom level (1.0 to 10.0)
 * @returns Pixel position from left edge of timeline
 */
export function calculateClipPosition(
  clipIndex: number,
  timeline: TimelineClip[],
  library: VideoClip[],
  zoom: number
): number {
  if (clipIndex < 0 || clipIndex >= timeline.length) {
    return 0;
  }

  let position = 0;

  // Sum up widths of all clips before this one
  // Must use the SAME width constraints as TimelineClipCard to prevent overlap
  for (let i = 0; i < clipIndex; i++) {
    const timelineClip = timeline[i];
    const libraryClip = library.find(clip => clip.id === timelineClip.libraryClipId);
    
    if (libraryClip) {
      const calculatedWidth = calculateClipWidth(timelineClip, libraryClip, zoom);
      // Apply same constraints as TimelineClipCard for accurate positioning
      const renderedWidth = applyClipWidthConstraints(calculatedWidth);
      position += renderedWidth;
    }
  }

  return position;
}

/**
 * Calculate the total duration of all clips on the timeline
 * 
 * @param timeline - Array of timeline clips
 * @param library - Array of library clips
 * @returns Total duration in seconds
 */
export function calculateTotalDuration(
  timeline: TimelineClip[],
  library: VideoClip[]
): number {
  if (timeline.length === 0) {
    return 0;
  }

  let totalDuration = 0;

  for (const timelineClip of timeline) {
    const clipDuration = timelineClip.trimEnd - timelineClip.trimStart;
    totalDuration += clipDuration;
  }

  return totalDuration;
}

/**
 * Calculate auto-fit zoom level to fit entire timeline in viewport
 * 
 * @param timeline - Array of timeline clips
 * @param library - Array of library clips
 * @param timelineWidth - Width of timeline viewport in pixels
 * @returns Zoom level (1.0 to 10.0) or current zoom if timeline is empty
 */
export function calculateAutoFitZoom(
  timeline: TimelineClip[],
  library: VideoClip[],
  timelineWidth: number
): number {
  if (timeline.length === 0 || timelineWidth <= 0) {
    return 1.0; // Default zoom
  }

  const totalDuration = calculateTotalDuration(timeline, library);
  
  if (totalDuration <= 0) {
    return 1.0;
  }

  // Calculate natural width at 100% zoom (1.0)
  const naturalWidth = totalDuration * BASE_PIXELS_PER_SECOND;
  
  // Leave some padding (90% of width for content)
  const availableWidth = timelineWidth * 0.9;

  // Only zoom OUT (reduce zoom below 1.0) if content is longer than viewport
  // Never zoom IN beyond 1.0 to fill empty space - keep clips at natural size
  if (naturalWidth > availableWidth) {
    // Content is longer than viewport - zoom out to fit
    const calculatedZoom = availableWidth / naturalWidth;
    // Clamp between 0.1 and 1.0 (only zoom out, never zoom in)
    return Math.max(0.1, Math.min(1.0, calculatedZoom));
  } else {
    // Content is shorter than viewport - keep at 100% zoom (natural size)
    return 1.0;
  }
}

/**
 * Calculate the width of a clip in pixels on the timeline
 * 
 * @param timelineClip - Timeline clip
 * @param libraryClip - Library clip (for duration validation)
 * @param zoom - Timeline zoom level (1.0 to 10.0)
 * @returns Clip width in pixels
 */
export function calculateClipWidth(
  timelineClip: TimelineClip,
  libraryClip: VideoClip,
  zoom: number
): number {
  const clipDuration = timelineClip.trimEnd - timelineClip.trimStart;
  return clipDuration * zoom * BASE_PIXELS_PER_SECOND;
}

