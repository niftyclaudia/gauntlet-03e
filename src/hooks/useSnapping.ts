/**
 * useSnapping Hook
 * 
 * Hook for clip snapping behavior and snap points
 * Based on PR #17 architecture
 */

import { useState, useCallback, useMemo } from 'react';
import { TimelineDoc } from '../types/timeline';
import { VideoClip } from '../types/video';

export interface SnapPoint {
  /** Time position of snap point */
  time: number;
  /** Type of snap point */
  type: 'clip-start' | 'clip-end' | 'playhead' | 'grid';
}

export interface UseSnappingParams {
  /** Timeline document */
  timelineDoc: TimelineDoc;
  /** Library clips */
  library: VideoClip[];
  /** Current playhead position */
  playheadPosition: number;
  /** Snapping enabled */
  enabled?: boolean;
  /** Snap threshold in seconds */
  snapThreshold?: number;
  /** Grid interval in seconds (for grid snapping) */
  gridInterval?: number;
}

export interface UseSnappingReturn {
  /** All available snap points */
  snapPoints: SnapPoint[];
  /** Find nearest snap point to given time */
  findNearestSnap: (time: number) => SnapPoint | null;
  /** Check if a time is snapped to a snap point */
  isSnapped: (time: number) => boolean;
  /** Get snapped time value */
  snapTime: (time: number) => number;
}

export function useSnapping({
  timelineDoc,
  library,
  playheadPosition,
  enabled = true,
  snapThreshold = 0.1, // 100ms default threshold
  gridInterval = 1.0, // 1 second default grid
}: UseSnappingParams): UseSnappingReturn {
  // Calculate all snap points
  const snapPoints = useMemo(() => {
    if (!enabled) return [];

    const points: SnapPoint[] = [];

    // Add playhead snap point
    points.push({
      time: playheadPosition,
      type: 'playhead',
    });

    // Add clip start/end snap points
    for (const track of timelineDoc.tracks) {
      for (const lane of track.lanes) {
        for (const clip of lane.clips) {
          const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
          if (!libraryClip) continue;

          // Calculate clip timeline position
          let clipStartTime = clip.start;
          if (clipStartTime === undefined) {
            // Calculate cumulative time for magnetic tracks
            if (track.role === 'main') {
              const sortedClips = lane.clips.sort((a, b) => a.order - b.order);
              clipStartTime = 0;
              for (const prevClip of sortedClips) {
                if (prevClip.id === clip.id) break;
                const prevLib = library.find(lc => lc.id === prevClip.libraryClipId);
                if (prevLib) {
                  clipStartTime += prevClip.trimEnd - prevClip.trimStart;
                }
              }
            } else {
              clipStartTime = clip.start ?? 0;
            }
          }

          const clipDuration = clip.trimEnd - clip.trimStart;
          const clipEndTime = clipStartTime + clipDuration;

          // Add snap points
          points.push({
            time: clipStartTime,
            type: 'clip-start',
          });
          points.push({
            time: clipEndTime,
            type: 'clip-end',
          });
        }
      }
    }

    // Sort by time
    points.sort((a, b) => a.time - b.time);

    return points;
  }, [timelineDoc, library, playheadPosition, enabled]);

  // Find nearest snap point
  const findNearestSnap = useCallback((time: number): SnapPoint | null => {
    if (!enabled || snapPoints.length === 0) return null;

    let nearest: SnapPoint | null = null;
    let minDistance = Infinity;

    for (const point of snapPoints) {
      const distance = Math.abs(point.time - time);
      if (distance < minDistance && distance <= snapThreshold) {
        minDistance = distance;
        nearest = point;
      }
    }

    return nearest;
  }, [snapPoints, snapThreshold, enabled]);

  // Check if time is snapped
  const isSnapped = useCallback((time: number): boolean => {
    return findNearestSnap(time) !== null;
  }, [findNearestSnap]);

  // Get snapped time value
  const snapTime = useCallback((time: number): number => {
    const nearest = findNearestSnap(time);
    if (nearest) {
      return nearest.time;
    }
    return time;
  }, [findNearestSnap]);

  return {
    snapPoints,
    findNearestSnap,
    isSnapped,
    snapTime,
  };
}

