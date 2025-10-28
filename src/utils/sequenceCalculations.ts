/**
 * Sequence calculation utilities for video preview
 * 
 * Handles converting timeline clips to sequence items with trim points
 * and calculating cumulative start/end times for sequence preview
 */

import { TimelineClip, VideoClip, SequenceItem } from '../types/video';

/**
 * Calculate sequence from timeline clips
 * Returns array of clips with trim points and cumulative start/end times
 * 
 * @param timeline - Array of timeline clips (must be sorted by order)
 * @param library - Array of library clips
 * @returns Array of sequence items with start/end times
 * 
 * @example
 * const sequence = calculateSequence(timeline, library);
 * // Returns: [{ clip, libraryClip, startTime: 0, endTime: 10 }, { clip, libraryClip, startTime: 10, endTime: 25 }]
 */
export function calculateSequence(
  timeline: TimelineClip[],
  library: VideoClip[]
): SequenceItem[] {
  // Sort timeline by order to ensure correct sequence
  const sortedTimeline = [...timeline].sort((a, b) => a.order - b.order);
  
  const sequence: SequenceItem[] = [];
  let cumulativeStartTime = 0;

  for (const clip of sortedTimeline) {
    const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
    if (!libraryClip) {
      console.warn(`[sequenceCalculations] Library clip not found for timeline clip ${clip.id}`);
      continue;
    }

    // Calculate trimmed duration
    const trimmedDuration = clip.trimEnd - clip.trimStart;
    const endTime = cumulativeStartTime + trimmedDuration;

    sequence.push({
      clip,
      libraryClip,
      startTime: cumulativeStartTime,
      endTime,
    });

    // Update cumulative start time for next clip (no gaps, clips snap together)
    cumulativeStartTime = endTime;
  }

  return sequence;
}

/**
 * Calculate total duration of sequence
 * Sum of (trimEnd - trimStart) for all clips
 * 
 * @param sequence - Array of sequence items
 * @returns Total duration in seconds
 * 
 * @example
 * const duration = calculateSequenceDuration(sequence);
 * // Returns: 45.5 (total seconds)
 */
export function calculateSequenceDuration(sequence: SequenceItem[]): number {
  if (sequence.length === 0) {
    return 0;
  }

  // Total duration is the end time of the last clip
  const lastItem = sequence[sequence.length - 1];
  return lastItem.endTime;
}

/**
 * Find current clip index in sequence based on current time
 * 
 * @param sequence - Array of sequence items
 * @param currentTime - Current time in seconds
 * @returns Index of current clip, or -1 if not found
 * 
 * @example
 * const index = findCurrentClipInSequence(sequence, 15.5);
 * // Returns: 1 (second clip in sequence)
 */
export function findCurrentClipInSequence(
  sequence: SequenceItem[],
  currentTime: number
): number {
  for (let i = 0; i < sequence.length; i++) {
    const item = sequence[i];
    if (currentTime >= item.startTime && currentTime < item.endTime) {
      return i;
    }
  }

  // If currentTime >= last clip's end time, return last clip index
  if (sequence.length > 0 && currentTime >= sequence[sequence.length - 1].endTime) {
    return sequence.length - 1;
  }

  return -1;
}

/**
 * Get the local time within a clip from sequence time
 * Converts sequence time to time within the specific clip (accounting for trimStart)
 * 
 * @param sequenceItem - The sequence item (clip)
 * @param sequenceTime - Current time in sequence
 * @returns Local time within the clip (0 = trimStart of clip)
 * 
 * @example
 * // Clip trimmed from 5 to 15 seconds, at sequence time 10 (5 seconds into sequence)
 * const localTime = getLocalTimeInClip(item, 10);
 * // Returns: 5 (5 seconds into the clip = 5 seconds from trimStart)
 */
export function getLocalTimeInClip(
  sequenceItem: SequenceItem,
  sequenceTime: number
): number {
  const timeInSequence = sequenceTime - sequenceItem.startTime;
  // Add trimStart to get actual time in source video
  return sequenceItem.clip.trimStart + timeInSequence;
}

