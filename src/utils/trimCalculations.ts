/**
 * Trim calculation utilities
 * 
 * Functions for converting mouse position to trim time, validating constraints,
 * and calculating handle positions for video trimming.
 */

/** Pixels per second at 100% zoom (must match timelineCalculations.ts) */
const BASE_PIXELS_PER_SECOND = 10;

/** Minimum clip duration in seconds */
const MIN_CLIP_DURATION = 1.0;

/**
 * Convert mouse X position (in pixels) to time in seconds
 * 
 * @param pixelX - Mouse X position in pixels (relative to timeline container)
 * @param clipStartX - Clip start position in pixels (from left edge)
 * @param zoom - Timeline zoom level (1.0 to 10.0)
 * @returns Time in seconds, clamped to valid range [0, clipDuration]
 */
export function pixelsToTime(
  pixelX: number,
  clipStartX: number,
  zoom: number
): number {
  const relativeX = pixelX - clipStartX;
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  const time = relativeX / pixelsPerSecond;
  
  // Clamp to non-negative (minimum 0)
  return Math.max(0, time);
}

/**
 * Convert time in seconds to pixel X position
 * 
 * @param time - Time in seconds
 * @param clipStartX - Clip start position in pixels (from left edge)
 * @param zoom - Timeline zoom level (1.0 to 10.0)
 * @returns Pixel X position relative to timeline container
 */
export function timeToPixels(
  time: number,
  clipStartX: number,
  zoom: number
): number {
  const pixelsPerSecond = BASE_PIXELS_PER_SECOND * zoom;
  return clipStartX + (time * pixelsPerSecond);
}

/**
 * Validate and clamp trim start value
 * 
 * @param trimStart - Proposed trim start in seconds
 * @param trimEnd - Current trim end in seconds
 * @param clipDuration - Source clip duration in seconds
 * @returns Valid trim start value (clamped to constraints)
 */
export function validateTrimStart(
  trimStart: number,
  trimEnd: number,
  clipDuration: number
): number {
  // Clamp to [0, clipDuration]
  let validTrimStart = Math.max(0, Math.min(trimStart, clipDuration));
  
  // Ensure trimStart < trimEnd
  validTrimStart = Math.min(validTrimStart, trimEnd - 0.01);
  
  // Ensure minimum duration (trimEnd - trimStart >= 1.0)
  const maxTrimStart = trimEnd - MIN_CLIP_DURATION;
  validTrimStart = Math.min(validTrimStart, maxTrimStart);
  
  // Ensure trimStart cannot exceed (clipDuration - 1.0s)
  validTrimStart = Math.min(validTrimStart, clipDuration - MIN_CLIP_DURATION);
  
  return Math.max(0, validTrimStart);
}

/**
 * Validate and clamp trim end value
 * 
 * @param trimStart - Current trim start in seconds
 * @param trimEnd - Proposed trim end in seconds
 * @param clipDuration - Source clip duration in seconds
 * @returns Valid trim end value (clamped to constraints)
 */
export function validateTrimEnd(
  trimStart: number,
  trimEnd: number,
  clipDuration: number
): number {
  // Clamp to [0, clipDuration]
  let validTrimEnd = Math.max(0, Math.min(trimEnd, clipDuration));
  
  // Ensure trimEnd > trimStart
  validTrimEnd = Math.max(validTrimEnd, trimStart + 0.01);
  
  // Ensure minimum duration (trimEnd - trimStart >= 1.0)
  const minTrimEnd = trimStart + MIN_CLIP_DURATION;
  validTrimEnd = Math.max(validTrimEnd, minTrimEnd);
  
  return Math.min(validTrimEnd, clipDuration);
}

/**
 * Get minimum valid trim start value
 * 
 * @param trimEnd - Current trim end in seconds
 * @param clipDuration - Source clip duration in seconds
 * @returns Minimum valid trim start (ensures minimum duration)
 */
export function getMinTrimStart(
  trimEnd: number,
  clipDuration: number
): number {
  return Math.max(0, trimEnd - clipDuration + MIN_CLIP_DURATION);
}

/**
 * Get maximum valid trim end value
 * 
 * @param trimStart - Current trim start in seconds
 * @param clipDuration - Source clip duration in seconds
 * @returns Maximum valid trim end (ensures minimum duration)
 */
export function getMaxTrimEnd(
  trimStart: number,
  clipDuration: number
): number {
  return Math.min(clipDuration, trimStart + MIN_CLIP_DURATION);
}

/**
 * Smart snap time to grid intervals with automatic detection
 * 
 * CapCut-style approach: Always enabled, smart detection of:
 * - 1-second intervals (primary)
 * - Frame boundaries (secondary)
 * 
 * @param time - Time in seconds to snap
 * @param interval - Snap interval type (ignored, always uses smart detection)
 * @param framerate - Video framerate (default 30fps)
 * @returns Snapped time value
 */
export function snapToGrid(
  time: number,
  interval: '1sec' | '500ms' | 'frame',
  framerate = 30
): number {
  // Smart snapping: prioritize 1-second intervals, fall back to frame boundaries
  
  // First, try snapping to 1-second intervals
  const oneSecondSnap = Math.round(time);
  const oneSecondDistance = Math.abs(time - oneSecondSnap);
  
  // If we're very close to a 1-second mark (within 0.1 seconds), snap to it
  if (oneSecondDistance < 0.1) {
    return oneSecondSnap;
  }
  
  // Otherwise, snap to frame boundaries
  const frameSnap = Math.round(time * framerate) / framerate;
  const frameDistance = Math.abs(time - frameSnap);
  
  // If we're close to a frame boundary (within 1/60th of a second), snap to it
  if (frameDistance < 1/60) {
    return frameSnap;
  }
  
  // If neither is close enough, return original time (no snap)
  return time;
}

