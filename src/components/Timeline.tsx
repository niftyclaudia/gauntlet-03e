/**
 * Timeline Panel Component
 * 
 * Displays video clips on timeline for editing (bottom panel, 30% height).
 * Supports drag-and-drop from Library, reordering, zoom, selection, and deletion.
 */

import React, { useRef, useEffect, useState } from 'react';
import { TimelineClip, VideoClip } from '../types/video';
import { TimelineDoc } from '../types/timeline';
import TimelineClipCard from './TimelineClipCard';
import TimelineSplitButton from './TimelineSplitButton';
import SnapIndicator from './SnapIndicator';
import CutLine from './CutLine';
import Playhead from './Playhead';
import TimeRuler from './TimeRuler';
import TrimTooltip from './TrimTooltip';
import { calculateClipPosition, calculateTotalDuration, calculateAutoFitZoom, calculateClipWidth, applyClipWidthConstraints } from '../utils/timelineCalculations';
import { formatDuration } from '../utils/formatDuration';
import { useTrimDrag } from '../hooks/useTrimDrag';
import { migrateToMultitrack } from '../utils/multitrackMigration';

interface TimelineProps {
  /** Array of timeline clips (legacy - for backward compatibility) */
  timeline: TimelineClip[];
  /** Timeline document (multitrack structure - optional, will extract from timeline if not provided) */
  timelineDoc?: TimelineDoc;
  /** Array of library clips */
  library: VideoClip[];
  /** Currently selected clip ID */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  timelineZoom: number;
  /** Timeline scroll position in pixels */
  timelineScrollPosition: number;
  /** Callback when clip is added to timeline */
  onAddClip: (libraryClipId: string, insertionIndex?: number) => void;
  /** Callback when clip is reordered */
  onReorderClip: (dragIndex: number, hoverIndex: number) => void;
  /** Callback when clip is selected */
  onSelectClip: (clipId: string | null) => void;
  /** Callback when clip is deleted */
  onDeleteClip: (clipId: string) => void;
  /** Callback when all clips are cleared */
  onClearAll: () => void;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Callback when scroll position changes */
  onScrollChange: (scrollPosition: number) => void;
  /** Callback when playhead position changes (from dragging) */
  onPlayheadChange?: (position: number) => void;
  /** Total duration for playhead dragging */
  totalDuration?: number;
  /** Callback when trim values are updated */
  onTrimUpdate?: (clipId: string, trimStart: number, trimEnd: number) => void;
  /** Callback when split button is clicked */
  onSplitClip?: () => void;
  /** Whether playhead is currently over a clip */
  isPlayheadOverClip?: boolean;
  /** Ref callback to expose timeline container ref */
  timelineContainerRefCallback?: (ref: React.RefObject<HTMLDivElement>) => void;
  /** Currently active track ID (where new clips will be added) */
  activeTrackId?: string | null;
  /** Callback to create a new overlay track */
  onCreateOverlayTrack?: () => void;
  /** Callback when a track is selected (becomes active) */
  onSelectTrack?: (trackId: string | null) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  timeline,
  timelineDoc,
  library,
  selectedClipId,
  currentPlayheadPosition,
  timelineZoom,
  timelineScrollPosition,
  onAddClip,
  onReorderClip,
  onSelectClip,
  onDeleteClip,
  onClearAll,
  onZoomChange,
  onScrollChange,
  onPlayheadChange,
  onTrimUpdate,
  onSplitClip,
  isPlayheadOverClip = false,
  timelineContainerRefCallback,
  activeTrackId,
  onCreateOverlayTrack,
  onSelectTrack,
}) => {
  // Get TimelineDoc from prop or migrate from timeline array
  const doc: TimelineDoc = timelineDoc || migrateToMultitrack(timeline);
  
  // Extract tracks - ensure doc has tracks
  const allTracks = doc?.tracks || [];
  const mainTrack = allTracks.find(t => t.role === 'main') || null;
  const overlayTracks = allTracks.filter(t => t.role === 'overlay');
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const clipsContainerRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Expose timeline container ref to parent
  useEffect(() => {
    if (timelineContainerRefCallback && timelineContainerRef.current) {
      timelineContainerRefCallback(timelineContainerRef as React.RefObject<HTMLDivElement>);
    }
  }, [timelineContainerRefCallback]);
  
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFromLibrary, setIsDraggingFromLibrary] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedClipIndex, setDraggedClipIndex] = useState<number | null>(null);
  const [libraryInsertIndex, setLibraryInsertIndex] = useState<number | null>(null);
  const hasAutoFittedRef = useRef(false); // Track if auto-fit has been applied
  const previousTimelineLengthRef = useRef(0);
  const isDraggingPlayheadRef = useRef(false); // Track if playhead is being dragged
  const dragEndTimeRef = useRef(0); // Track when drag ended to prevent click after drag
  const [hoveredEdge, setHoveredEdge] = useState<{ clipId: string; edge: 'left' | 'right' } | null>(null);
  const [snapIndicatorPosition, setSnapIndicatorPosition] = useState<number | null>(null);

  // Get clips from main track for backward compatibility and calculations
  const mainTrackClips = mainTrack ? (mainTrack.lanes[0]?.clips || []) : timeline;

  // Trim drag hook for centralized state management
  const trimDrag = useTrimDrag(timelineZoom);

  // Sort timeline clips by order (needed for calculations)
  const sortedTimeline = [...mainTrackClips].sort((a, b) => a.order - b.order);

  // Wrapper for onSelectClip to add logging
  const handleSelectClip = (clipId: string | null) => {
    console.log(`[Timeline] handleSelectClip called with clipId=${clipId}, current selectedClipId=${selectedClipId}`);
    onSelectClip(clipId);
  };

  // Calculate total duration from all clips
  const totalDuration = calculateTotalDuration(mainTrackClips, library);

  // Auto-fit zoom only once when first clip is added, or when timeline goes from 0 to N clips
  // This prevents clips from resizing when dragging multiple clips in quick succession
  useEffect(() => {
    const previousLength = previousTimelineLengthRef.current;
    const currentLength = mainTrackClips.length;
    previousTimelineLengthRef.current = currentLength;

    // Only auto-fit if:
    // 1. Going from 0 clips to having clips (first clip added)
    // 2. OR if zoom is still at default (1.0) and we haven't auto-fitted yet
    const isFirstClip = previousLength === 0 && currentLength > 0;
    const isAtDefaultZoom = timelineZoom >= 0.9 && timelineZoom <= 1.1;
    const shouldAutoFit = isFirstClip || (isAtDefaultZoom && !hasAutoFittedRef.current && currentLength > 0);

    if (shouldAutoFit && timelineContainerRef.current) {
      const containerWidth = timelineContainerRef.current.clientWidth;
      const autoFitZoom = calculateAutoFitZoom(mainTrackClips, library, containerWidth);
      
      // Only update if difference is significant (avoid unnecessary updates)
      if (Math.abs(autoFitZoom - timelineZoom) > 0.05) {
        onZoomChange(autoFitZoom);
        hasAutoFittedRef.current = true;
      }
    }
    
    // Reset auto-fit flag when timeline is cleared
    if (currentLength === 0) {
      hasAutoFittedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTrackClips.length]); // Only recalculate when clip count changes

  // Sync sidebar vertical scroll with timeline
  useEffect(() => {
    const sidebar = sidebarRef.current;
    const timeline = timelineContainerRef.current;
    
    if (!sidebar || !timeline) return;
    
    let isSyncing = false;
    
    const handleTimelineScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      sidebar.scrollTop = timeline.scrollTop;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };
    
    const handleSidebarScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      timeline.scrollTop = sidebar.scrollTop;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };
    
    timeline.addEventListener('scroll', handleTimelineScroll);
    sidebar.addEventListener('scroll', handleSidebarScroll);
    
    return () => {
      timeline.removeEventListener('scroll', handleTimelineScroll);
      sidebar.removeEventListener('scroll', handleSidebarScroll);
    };
  }, []);

  // Restore scroll position only when externally changed (not during user scroll)
  const isUserScrollingRef = useRef(false);
  
  useEffect(() => {
    if (timelineContainerRef.current && !isUserScrollingRef.current) {
      timelineContainerRef.current.scrollLeft = timelineScrollPosition;
    }
  }, [timelineScrollPosition]);

  // Track user scrolling
  const handleScroll = () => {
    isUserScrollingRef.current = true;
    if (timelineContainerRef.current) {
      const scrollLeft = timelineContainerRef.current.scrollLeft;
      onScrollChange(scrollLeft);
      
      // Sync ruler scroll with timeline scroll
      if (rulerRef.current) {
        rulerRef.current.scrollLeft = scrollLeft;
      }
    }
    // Reset flag after a short delay
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 100);
  };
  
  // Sync ruler scroll when timeline scroll position changes externally
  useEffect(() => {
    if (rulerRef.current && timelineContainerRef.current && !isUserScrollingRef.current) {
      rulerRef.current.scrollLeft = timelineContainerRef.current.scrollLeft;
    }
  }, [timelineScrollPosition]);

  // Handle drag from Library
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('application/library-clip-id')) {
      setIsDraggingFromLibrary(true);
      
      // Calculate insertion index based on mouse position
      if (clipsContainerRef.current && timelineContainerRef.current) {
        const rect = clipsContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        // Account for scroll position when comparing with clip positions
        const scrollX = timelineContainerRef.current.scrollLeft;
        const absoluteMouseX = mouseX + scrollX;
        
        // Find which index to insert at based on X position
        let insertIndex = timeline.length; // Default to end
        
        for (let i = 0; i < sortedTimeline.length; i++) {
          const clip = sortedTimeline[i];
          const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
          if (!libraryClip) continue;
          
          const clipPosition = calculateClipPosition(i, sortedTimeline, library, timelineZoom);
          const clipWidth = applyClipWidthConstraints(calculateClipWidth(clip, libraryClip, timelineZoom));
          
          // Check if mouse is before this clip (insert before)
          if (absoluteMouseX < clipPosition) {
            insertIndex = i;
            break;
          }
          // Check if mouse is in the first half of this clip (insert before)
          else if (absoluteMouseX < clipPosition + clipWidth / 2) {
            insertIndex = i;
            break;
          }
          // Otherwise, insert after (continue to next iteration)
          else if (i === sortedTimeline.length - 1) {
            insertIndex = mainTrackClips.length;
          }
        }
        
        setLibraryInsertIndex(insertIndex);
      }
    } else if (e.dataTransfer.types.includes('application/timeline-clip-index')) {
      // Handle timeline clip reordering drag over
      console.log('[Timeline] Main container drag over - timeline clip reordering');
      // Calculate hover index based on mouse position for timeline clip reordering
      if (clipsContainerRef.current && timelineContainerRef.current) {
        const rect = clipsContainerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scrollX = timelineContainerRef.current.scrollLeft;
        const absoluteMouseX = mouseX + scrollX;
        
        // Find which index to hover at based on X position
        let hoverIndex = mainTrackClips.length; // Default to end
        
        for (let i = 0; i < sortedTimeline.length; i++) {
          const clip = sortedTimeline[i];
          const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
          if (!libraryClip) continue;
          
          const clipPosition = calculateClipPosition(i, sortedTimeline, library, timelineZoom);
          const clipWidth = applyClipWidthConstraints(calculateClipWidth(clip, libraryClip, timelineZoom));
          
          // Check if mouse is before this clip (hover before)
          if (absoluteMouseX < clipPosition) {
            hoverIndex = i;
            break;
          }
          // Check if mouse is in the first half of this clip (hover before)
          else if (absoluteMouseX < clipPosition + clipWidth / 2) {
            hoverIndex = i;
            break;
          }
          // Otherwise, hover after (continue to next iteration)
          else if (i === sortedTimeline.length - 1) {
            hoverIndex = mainTrackClips.length;
          }
        }
        
        console.log('[Timeline] Calculated hover index from main container:', hoverIndex);
        // Set hover index and store in dataTransfer
        setDragOverIndex(hoverIndex);
        e.dataTransfer.setData('application/timeline-hover-index', String(hoverIndex));
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if leaving the timeline container
    if (!timelineContainerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingFromLibrary(false);
      setDragOverIndex(null);
      setLibraryInsertIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFromLibrary(false);
    setDragOverIndex(null);

    // Check if dropping from Library
    const libraryClipId = e.dataTransfer.getData('application/library-clip-id');
    if (libraryClipId) {
      // Use the calculated insert index, or append to end if not calculated
      const insertIndex = libraryInsertIndex !== null ? libraryInsertIndex : mainTrackClips.length;
      onAddClip(libraryClipId, insertIndex);
      setLibraryInsertIndex(null);
      return;
    }

    // Check if reordering
    const dragIndexStr = e.dataTransfer.getData('application/timeline-clip-index');
    const hoverIndexStr = e.dataTransfer.getData('application/timeline-hover-index');
    
    console.log('[Timeline] Drop event - dragIndex:', dragIndexStr, 'hoverIndex:', hoverIndexStr, 'isReordering:', isReordering, 'dragOverIndex:', dragOverIndex);
    
    // If hover index wasn't set in dataTransfer, use the current dragOverIndex state
    let finalHoverIndex = hoverIndexStr;
    if ((!finalHoverIndex || finalHoverIndex === '') && dragOverIndex !== null) {
      finalHoverIndex = String(dragOverIndex);
      console.log('[Timeline] Using dragOverIndex from state:', dragOverIndex);
    }
    
    if (dragIndexStr !== '' && finalHoverIndex !== '') {
      const dragIndex = parseInt(dragIndexStr, 10);
      let hoverIndex = parseInt(finalHoverIndex, 10);
      
      console.log('[Timeline] Parsed indices - dragIndex:', dragIndex, 'hoverIndex:', hoverIndex);
      
      // Handle dropping at the end (hoverIndex === mainTrackClips.length)
      if (hoverIndex >= mainTrackClips.length) {
        hoverIndex = mainTrackClips.length - 1;
      }
      
      if (!isNaN(dragIndex) && !isNaN(hoverIndex) && dragIndex !== hoverIndex && dragIndex >= 0 && hoverIndex >= 0) {
        console.log('[Timeline] Calling onReorderClip:', dragIndex, '->', hoverIndex);
        onReorderClip(dragIndex, hoverIndex);
      } else {
        console.log('[Timeline] Reorder validation failed:', { dragIndex, hoverIndex, timelineLength: mainTrackClips.length });
      }
    } else {
      console.log('[Timeline] Missing drag data:', { dragIndexStr, hoverIndexStr, dragOverIndex });
    }

    setIsReordering(false);
    setDraggedClipIndex(null);
  };

  // Handle reorder drag over
  const handleReorderDragOver = (e: React.DragEvent, hoverIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.types.includes('application/timeline-clip-index')) {
      console.log('[Timeline] Drag over clip index:', hoverIndex);
      setIsReordering(true);
      setDragOverIndex(hoverIndex);
      e.dataTransfer.dropEffect = 'move';
      
      // Store hover index for drop
      e.dataTransfer.setData('application/timeline-hover-index', String(hoverIndex));
    }
  };

  // Handle clip drag start (for reordering)
  const handleClipDragStart = (e: React.DragEvent, clipIndex: number) => {
    setDraggedClipIndex(clipIndex);
    setIsReordering(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/timeline-clip-index', String(clipIndex));
  };

  // Handle click on timeline to seek playhead
  const handleTimelineClick = (e: React.MouseEvent) => {
    // Don't handle if we just finished dragging playhead (prevent click after drag)
    const timeSinceDragEnd = Date.now() - dragEndTimeRef.current;
    if (timeSinceDragEnd < 200) { // 200ms threshold to prevent click after drag
      console.log('[Timeline] Ignoring click (too soon after drag)');
      return;
    }
    
    // Don't handle if currently dragging playhead
    if (isDraggingPlayheadRef.current) {
      console.log('[Timeline] Ignoring click (playhead is being dragged)');
      return;
    }
    
    // Don't handle if clicking on playhead (let playhead handle its own drag)
    if ((e.target as HTMLElement).classList.contains('playhead')) {
      return;
    }
    
    // Only handle if clicking directly on timeline container or clips container
    if (e.target === timelineContainerRef.current || e.target === clipsContainerRef.current || (e.target as HTMLElement).classList.contains('timeline-clips-container')) {
      if (onPlayheadChange && clipsContainerRef.current && timelineContainerRef.current) {
        const rect = clipsContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        // Account for scroll position
        const scrollX = timelineContainerRef.current.scrollLeft;
        const absoluteX = x + scrollX;
        
        // Convert pixels to seconds
        const BASE_PIXELS_PER_SECOND = 10;
        const newPosition = absoluteX / (timelineZoom * BASE_PIXELS_PER_SECOND);
        
        // Clamp to valid range
        const clampedPosition = Math.max(0, Math.min(newPosition, totalDuration));
        console.log('[Timeline] Click seek to:', clampedPosition, 'seconds');
        onPlayheadChange(clampedPosition);
      } else {
        // Just deselect if no playhead change handler
        handleSelectClip(null);
      }
    }
  };

  // Wrapper for playhead change that tracks drag state
  const handlePlayheadDragChange = (position: number) => {
    isDraggingPlayheadRef.current = true;
    if (onPlayheadChange) {
      onPlayheadChange(position);
    }
  };

  // Handle playhead drag end
  const handlePlayheadDragEnd = () => {
    isDraggingPlayheadRef.current = false;
    dragEndTimeRef.current = Date.now();
  };

  /**
   * Handle trim start - called when user clicks on trim handle
   */
  const handleTrimStart = (clipId: string, edge: 'left' | 'right', event: React.MouseEvent) => {
    // Find clip and library clip
    const clip = timeline.find(c => c.id === clipId);
    if (!clip) {
      console.error('[Timeline] Clip not found for trim:', clipId);
      return;
    }

    const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
    if (!libraryClip) {
      console.error('[Timeline] Library clip not found for trim:', clip.libraryClipId);
      return;
    }

    // Find clip index in sorted timeline
    const clipIndex = sortedTimeline.findIndex(c => c.id === clipId);
    if (clipIndex < 0) {
      console.error('[Timeline] Clip index not found for trim:', clipId);
      return;
    }

    // Calculate clip position
    const clipStartX = calculateClipPosition(clipIndex, sortedTimeline, library, timelineZoom);
    
    // Calculate initial clip width (before any trimming)
    const initialClipWidth = applyClipWidthConstraints(
      calculateClipWidth(clip, libraryClip, timelineZoom)
    );
    
    // Calculate timeline start time (cumulative time before this clip)
    let timelineStartTime = 0;
    for (let i = 0; i < clipIndex; i++) {
      const prevClip = sortedTimeline[i];
      const prevLibraryClip = library.find(lc => lc.id === prevClip.libraryClipId);
      if (prevLibraryClip) {
        timelineStartTime += prevClip.trimEnd - prevClip.trimStart;
      }
    }

    // Convert mouse position to timeline container coordinates (accounting for scroll)
    const containerRect = timelineContainerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      console.error('[Timeline] Cannot get timeline container rect');
      return;
    }

    const mouseX = event.clientX - containerRect.left;
    const scrollX = timelineContainerRef.current?.scrollLeft || 0;
    const absoluteMouseX = mouseX + scrollX;
    const clipRelativeMouseX = absoluteMouseX - clipStartX;

    // Start trim drag
    trimDrag.handleTrimStart(
      clipId,
      edge,
      clip.trimStart,
      clip.trimEnd,
      clipStartX,
      clipRelativeMouseX,
      event.clientY,
      timelineStartTime,
      initialClipWidth
    );

    // Update hover state to persist during drag
    setHoveredEdge({ clipId, edge });
  };

  /**
   * Handle edge hover change - called when mouse enters/leaves trim handle
   */
  const handleEdgeHoverChange = (clipId: string | null, edge: 'left' | 'right' | null) => {
    if (clipId && edge) {
      setHoveredEdge({ clipId, edge });
    } else {
      setHoveredEdge(null);
    }
  };

  /**
   * Global mouse listeners for trim drag (allows dragging beyond clip boundaries)
   */
  useEffect(() => {
    if (!trimDrag.dragging) {
      return; // No cleanup needed if not dragging
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const containerRect = timelineContainerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Calculate mouse position relative to timeline container
      const mouseX = e.clientX - containerRect.left;
      const scrollX = timelineContainerRef.current?.scrollLeft || 0;
      const absoluteMouseX = mouseX + scrollX;

      // Find clip being trimmed
      const clip = timeline.find(c => c.id === trimDrag.dragging!.clipId);
      if (!clip) return;

      const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
      if (!libraryClip) return;

      const clipIndex = sortedTimeline.findIndex(c => c.id === clip.id);
      if (clipIndex < 0) return;

      const clipStartX = calculateClipPosition(clipIndex, sortedTimeline, library, timelineZoom);
      const clipRelativeMouseX = absoluteMouseX - clipStartX;
      
      // Calculate timeline start time for this clip (for snap indicator positioning)
      let timelineStartTime = clip.start ?? 0;
      if (clip.start === undefined) {
        // Fallback: calculate cumulative time
        for (let i = 0; i < clipIndex; i++) {
          const prevClip = sortedTimeline[i];
          const prevLibraryClip = library.find(lc => lc.id === prevClip.libraryClipId);
          if (prevLibraryClip) {
            timelineStartTime += prevClip.trimEnd - prevClip.trimStart;
          }
        }
      }

      // Update trim drag position with automatic smart snapping
      trimDrag.handleTrimMove(
        clipRelativeMouseX,
        libraryClip.duration,
        e.clientX,
        e.clientY,
        clipStartX,
        true, // Always enable snapping
        '1sec', // Default to 1-second intervals
        libraryClip.metadata.framerate
      );

      // Update snap indicator position if snap is active
      if (trimDrag.isSnapped) {
        const snapTime = trimDrag.dragging?.edge === 'left' 
          ? (trimDrag.draggedInPoint ?? clip.trimStart)
          : (trimDrag.draggedOutPoint ?? clip.trimEnd);
        
        // Convert source time to timeline position
        // snapTime is source time, we need timeline position
        // Timeline position = clip.start + (snapTime - clip.trimStart) 
        // Then convert to pixels
        const clipTimelineStart = clip.start ?? timelineStartTime;
        const offsetInClip = snapTime - clip.trimStart;
        const timelinePosition = clipTimelineStart + offsetInClip;
        const snapPosition = timelinePosition * timelineZoom * 10;
        
        setSnapIndicatorPosition(snapPosition);
      } else {
        setSnapIndicatorPosition(null);
      }
    };

    const handleGlobalMouseUp = async () => {
      if (!trimDrag.dragging) return;

      const clipId = trimDrag.dragging.clipId;
      const clip = timeline.find(c => c.id === clipId);
      if (!clip) {
        console.error('[Timeline] Clip not found for trim commit:', clipId);
        trimDrag.handleTrimEnd();
        return;
      }

      const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
      if (!libraryClip) {
        console.error('[Timeline] Library clip not found for trim commit:', clip.libraryClipId);
        trimDrag.handleTrimEnd();
        return;
      }

      // Get final trim values (use dragged values if available, otherwise use fixed values, then clip's current value)
      // When dragging left: draggedInPoint changes, fixedOutPoint is the fixed right edge
      // When dragging right: draggedOutPoint changes, fixedInPoint is the fixed left edge
      const finalInPoint = trimDrag.draggedInPoint !== null 
        ? trimDrag.draggedInPoint 
        : (trimDrag.fixedInPoint !== null ? trimDrag.fixedInPoint : clip.trimStart);
      const finalOutPoint = trimDrag.draggedOutPoint !== null 
        ? trimDrag.draggedOutPoint 
        : (trimDrag.fixedOutPoint !== null ? trimDrag.fixedOutPoint : clip.trimEnd);

      try {
        // Call IPC handler to validate trim values
        const result = await window.electron.trim.trimClip(
          clipId,
          finalInPoint,
          finalOutPoint,
          libraryClip.duration
        );

        if (result.success && onTrimUpdate) {
          // Update App state via callback
          onTrimUpdate(clipId, result.inPoint, result.outPoint);
        }
      } catch (error) {
        console.error('[Timeline] Trim validation failed:', error);
        // Don't update state if validation fails
      } finally {
        // Always clear drag state
        trimDrag.handleTrimEnd();
        setHoveredEdge(null);
      }
    };

    // Attach global listeners
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [trimDrag.dragging, trimDrag.draggedInPoint, trimDrag.draggedOutPoint, timeline, library, sortedTimeline, timelineZoom, onTrimUpdate, trimDrag.handleTrimMove, trimDrag.handleTrimEnd]);

  // Handle Delete key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedClipId) {
        onDeleteClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip]);

  // Handle Clear All with confirmation
  const handleClearAllClick = () => {
    if (timeline.length === 0) return;
    
    const confirmed = window.confirm('Remove all clips from timeline?');
    if (confirmed) {
      onClearAll();
    }
  };

  return (
    <div className="flex-1 bg-[#1a1a1a] border-t border-[#333333] p-0 flex flex-col overflow-visible">
      {/* Header with Add Track, Split, Total, and Clear All buttons */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-[#333333] bg-[#1a1a1a] flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Add Track Button - moved to header */}
          {onCreateOverlayTrack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateOverlayTrack();
              }}
              className="flex items-center justify-center px-3 py-1.5 bg-[#333333] hover:bg-[#444444] text-[#ffffff] text-xs font-medium rounded border border-[#555555] transition-colors"
              title="Add new overlay track"
            >
              + Add Track
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TimelineSplitButton
              enabled={isPlayheadOverClip}
              onClick={onSplitClip || (() => console.log('Split clicked'))}
            />
          </div>
          <span className="text-sm font-medium text-white">
            Total: {formatDuration(totalDuration)}
          </span>
          <button
            className="bg-transparent text-[#cccccc] border border-[#444444] rounded px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors hover:bg-[#2a2a2a] hover:border-[#555555] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed disabled:border-[#333333]"
            onClick={handleClearAllClick}
            disabled={mainTrackClips.length === 0}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Time Ruler Row - spans full width with time counter in left column */}
      <div className="flex flex-shrink-0 border-b border-[#333333] relative z-10">
        {/* Left column: Time Display - matches sidebar width */}
        <div className="w-[120px] min-w-[120px] bg-[#1a1a1a] border-r border-[#333333] flex items-center justify-center h-[40px]">
          <span className="text-[10px] font-mono font-semibold text-white">
            {formatDuration(currentPlayheadPosition)}
          </span>
        </div>
        
        {/* Right column: Time Ruler */}
        <div 
          ref={rulerRef} 
          className="flex-1 relative overflow-x-auto overflow-y-hidden bg-[#1a1a1a] flex-shrink-0 z-10" 
          style={{ 
            height: '40px',
            overflowX: 'auto',
            overflowY: 'hidden',
          }}
          onScroll={(e) => {
            const scrollLeft = (e.target as HTMLElement).scrollLeft;
            // Sync timeline scroll with ruler scroll
            if (timelineContainerRef.current) {
              timelineContainerRef.current.scrollLeft = scrollLeft;
              onScrollChange(scrollLeft);
            }
          }}
        >
          <TimeRuler
            currentTime={currentPlayheadPosition}
            zoom={timelineZoom}
            totalDuration={totalDuration}
            timelineWidth={timelineContainerRef.current?.clientWidth || 800}
            scrollPosition={timelineScrollPosition}
            onSeek={(time) => {
              if (onPlayheadChange) {
                onPlayheadChange(time);
              }
            }}
          />
        </div>
      </div>

      {/* Two-column content wrapper */}
      <div className="flex flex-1 overflow-visible min-h-0">
        {/* Left column: Track controls */}
        <div 
          ref={sidebarRef}
          className="w-[120px] min-w-[120px] bg-[#1a1a1a] border-r border-[#333333] flex flex-col overflow-y-auto overflow-x-visible flex-shrink-0 relative outline-none" 
          tabIndex={-1}
        >
          {/* Render each track - no spacer, starts immediately */}
          {allTracks.length === 0 ? (
            <div className="flex flex-col h-[80px] border-b border-[#333333] outline-none" tabIndex={-1}>
              <div className="flex items-center justify-start px-3 h-full outline-none border-none gap-1" tabIndex={-1}>
                <span className="text-[#ffffff] text-[12px] font-semibold uppercase tracking-wider outline-none border-none">Main</span>
              </div>
            </div>
          ) : (
            allTracks.map((track, trackIndex) => {
              const trackLabel = track.role === 'main' 
                ? 'Main' 
                : `Overlay ${allTracks.slice(0, trackIndex).filter(t => t.role === 'overlay').length + 1}`;
            
              const isActive = activeTrackId === track.id;
            
              return (
                <div 
                  key={track.id}
                  className={`flex flex-col h-[80px] border-b border-[#333333] outline-none cursor-pointer transition-colors ${
                    isActive ? 'bg-[#2a4a6a] hover:bg-[#2a5a7a]' : 'hover:bg-[#252525]'
                  }`}
                  tabIndex={-1}
                  onClick={() => onSelectTrack?.(track.id)}
                  title={isActive ? 'Active track (clips added here)' : 'Click to select track'}
                >
                  <div className="flex items-center justify-between px-3 h-full outline-none border-none gap-1" tabIndex={-1}>
                    <span 
                      className={`text-[12px] font-semibold uppercase tracking-wider outline-none border-none ${
                        isActive ? 'text-[#66ccff]' : 'text-[#ffffff]'
                      }`}
                      title={track.isMagnetic ? 'Magnetic track (gapless, ripple edits)' : 'Freeform track (gaps allowed)'}
                    >
                      {trackLabel}
                    </span>
                    {isActive && (
                      <span className="text-[#66ccff] text-xs font-bold" title="Active track">●</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column: Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          {/* Timeline container with clips - clips content at top, playhead extends upward */}
          <div
            ref={timelineContainerRef}
            className={`flex-1 overflow-x-auto overflow-y-auto bg-[#2a2a2a] relative cursor-default ${isDraggingFromLibrary ? 'border-2 border-dashed border-[#0066cc] bg-[rgba(0,102,204,0.1)]' : ''}`}
            style={{
              minHeight: `${allTracks.length * 80}px`, // Ensure container is tall enough for all tracks
              zIndex: 1, // Below ruler
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleTimelineClick}
            onScroll={handleScroll}
          >
            {/* Playhead - positioned relative to timeline container so it can extend upward */}
            <Playhead
              position={currentPlayheadPosition}
              zoom={timelineZoom}
              timelineHeight={allTracks.length * 80}
              onDrag={handlePlayheadDragChange}
              onDragEnd={handlePlayheadDragEnd}
              onClick={(position) => {
                // When playhead is clicked (not dragged), activate preview and seek to that position
                // This ensures the video player displays the frame at that timestamp
                // Force a seek by temporarily changing position by a significant amount to trigger user interaction detection
                if (onPlayheadChange) {
                  console.log('[Timeline] Playhead clicked, activating preview at:', position);
                  // Temporarily set to a slightly different value (0.2s is enough to trigger user interaction detection)
                  // This ensures VideoPlayer detects it as a user interaction and activates preview
                  const epsilon = 0.15; // Enough to trigger user interaction (> 0.1s threshold)
                  onPlayheadChange(position + epsilon);
                  // Reset to actual position after a small delay to ensure VideoPlayer processes the change
                  setTimeout(() => {
                    onPlayheadChange(position);
                  }, 50); // Small delay to ensure VideoPlayer sees the intermediate change
                }
              }}
              totalDuration={totalDuration}
            />

            {/* Snap Indicator - positioned relative to timeline container */}
            <SnapIndicator
              position={snapIndicatorPosition || 0}
              visible={snapIndicatorPosition !== null}
              timelineHeight={allTracks.length * 80}
            />

            {/* Cut Line - positioned relative to timeline container */}
            <CutLine
              position={currentPlayheadPosition * timelineZoom * 10} // Convert time to pixels
              visible={false} // Disabled since playhead now shows red color when over clip
              timelineHeight={allTracks.length * 80}
            />

            {/* Clips container - render one row per track */}
            <div
              ref={clipsContainerRef}
              className="relative timeline-clips-container"
              style={{
                position: 'relative',
                minHeight: `${allTracks.length * 80}px`, // Tracks only, no ruler offset
                minWidth: `${totalDuration * timelineZoom * 10}px`, // 10 pixels per second at 100% zoom - width scales with zoom
                height: `${allTracks.length * 80}px`, // Exact height to match tracks
              }}
            >

              {/* Render each track's clips */}
              {allTracks.map((track, trackIndex) => {
                const trackClips = track.lanes[0]?.clips || [];
                const sortedTrackClips = [...trackClips].sort((a, b) => {
                  // Sort by start time for overlay tracks, order for main track
                  if (track.role === 'main') {
                    return a.order - b.order;
                  }
                  return (a.start || 0) - (b.start || 0);
                });
                
                return (
                  <div
                    key={track.id}
                    className="relative border-b border-[#444444] bg-[#2a2a2a]"
                    style={{
                      position: 'absolute',
                      top: `${trackIndex * 80}px`, // Start at track index * 80px (no ruler offset)
                      left: '0px',
                      width: '100%',
                      height: '80px',
                      zIndex: 1, // Ensure tracks are below playhead but above background
                    }}
                  >

                    {/* Drop zone before first clip (for library drag) - only on main track */}
                    {track.role === 'main' && isDraggingFromLibrary && libraryInsertIndex === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0px',
                    top: '20px',
                    width: '30px',
                    height: '80px',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-[#0066cc] z-[5]" />
                </div>
              )}

                    {/* Clip cards for this track */}
                    {sortedTrackClips.map((clip, clipIndex) => {
                const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
                if (!libraryClip) return null;

                // Check if this clip is being trimmed and calculate adjusted position
                const isThisClipTrimming = trimDrag.dragging?.clipId === clip.id;
                const isLeftHandleDragging = isThisClipTrimming && trimDrag.dragging?.edge === 'left';
                // Check if this clip's trim handle is hovered
                const isThisClipHovered = hoveredEdge?.clipId === clip.id;
                // Raise z-index if trimming or hovered to prevent other clips from blocking trim handles
                const shouldRaiseZIndex = isThisClipTrimming || isThisClipHovered;
                
                // Calculate base clip position
                let clipPosition: number;
                if (track.role === 'main') {
                  // Main track: use cumulative widths (magnetic, gapless)
                  clipPosition = calculateClipPosition(clipIndex, sortedTrackClips, library, timelineZoom);
                } else {
                  // Overlay track: use start time (freeform, absolute positioning)
                  clipPosition = (clip.start || 0) * timelineZoom * 10; // Convert time to pixels
                }
                
                // Calculate clip width with current (or dragged) trim values
                let displayTrimStart = clip.trimStart;
                let displayTrimEnd = clip.trimEnd;
                
                if (isThisClipTrimming) {
                  displayTrimStart = trimDrag.draggedInPoint ?? trimDrag.fixedInPoint ?? clip.trimStart;
                  displayTrimEnd = trimDrag.draggedOutPoint ?? trimDrag.fixedOutPoint ?? clip.trimEnd;
                }
                
                // Calculate width with displayed trim values
                const displayClip = { ...clip, trimStart: displayTrimStart, trimEnd: displayTrimEnd };
                const clipWidth = applyClipWidthConstraints(calculateClipWidth(displayClip, libraryClip, timelineZoom));
                
                // If dragging left handle, adjust position to keep right edge fixed
                // Right edge position = originalPosition + originalWidth
                // To keep right edge fixed: newPosition = rightEdgePosition - newWidth
                if (isLeftHandleDragging && trimDrag.dragging && trimDrag.dragging.initialClipWidth > 0) {
                  const originalWidth = trimDrag.dragging.initialClipWidth;
                  const rightEdgePosition = trimDrag.dragging.initialClipStartX + originalWidth;
                  clipPosition = rightEdgePosition - clipWidth;
                }

                return (
                  <React.Fragment key={clip.id}>
                    {/* Drop zone before this clip (for reordering or library drag) */}
                    {((isReordering && draggedClipIndex !== null && draggedClipIndex !== clipIndex) ||
                      (isDraggingFromLibrary && libraryInsertIndex === clipIndex && track.role === 'main')) && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${clipPosition - 15}px`,
                          top: '0px',
                          width: '30px',
                          height: '80px',
                          zIndex: 20,
                          pointerEvents: isDraggingFromLibrary ? 'none' : 'auto',
                        }}
                        onDragOver={(e) => {
                          if (isReordering) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            setDragOverIndex(clipIndex);
                            e.dataTransfer.setData('application/timeline-hover-index', String(clipIndex));
                          }
                        }}
                      >
                        {(isDraggingFromLibrary && libraryInsertIndex === clipIndex && track.role === 'main') && (
                          <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-[#0066cc] z-[5]" />
                        )}
                      </div>
                    )}
                    
                    {/* The clip card */}
                      <div
                        style={{
                          position: 'absolute',
                          left: `${clipPosition}px`,
                          top: '0px', // Align with top of track row
                          height: '80px', // Match track row height exactly
                          pointerEvents: 'auto', // Ensure wrapper doesn't block interactions
                          zIndex: shouldRaiseZIndex ? 100 : 1, // Raise when trimming/hovered to prevent blocking
                        }}
                      onDragOver={(e) => {
                        if (isReordering && track.role === 'main') {
                          handleReorderDragOver(e, clipIndex);
                        }
                      }}
                    >
                      {dragOverIndex === clipIndex && isReordering && draggedClipIndex !== clipIndex && track.role === 'main' && (
                        <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-[#0066cc] z-[5]" />
                      )}
                      <TimelineClipCard
                        clip={clip}
                        libraryClip={libraryClip}
                        zoom={timelineZoom}
                        isSelected={selectedClipId === clip.id}
                        onClick={() => handleSelectClip(clip.id)}
                        onDragStart={handleClipDragStart}
                        onDelete={() => onDeleteClip(clip.id)}
                        clipIndex={clipIndex}
                        onTrimStart={handleTrimStart}
                        onEdgeHoverChange={handleEdgeHoverChange}
                        hoveredEdge={hoveredEdge?.clipId === clip.id ? hoveredEdge.edge : null}
                        isTrimming={trimDrag.dragging?.clipId === clip.id}
                        draggedInPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.draggedInPoint : null}
                        draggedOutPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.draggedOutPoint : null}
                        fixedInPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.fixedInPoint : null}
                        fixedOutPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.fixedOutPoint : null}
                        leftHandleAtMinimum={trimDrag.dragging?.clipId === clip.id && trimDrag.dragging?.edge === 'left' && trimDrag.isAtMinimum}
                        rightHandleAtMinimum={trimDrag.dragging?.clipId === clip.id && trimDrag.dragging?.edge === 'right' && trimDrag.isAtMinimum}
                      />
                    </div>

                    {/* Drop zone after the last clip (for reordering or library drag) */}
                    {clipIndex === sortedTrackClips.length - 1 && (
                      <>
                        {/* Reordering drop zone */}
                        {isReordering && draggedClipIndex !== null && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${clipPosition + clipWidth - 15}px`,
                              top: '0px',
                              width: '30px',
                              height: '80px',
                              zIndex: 20,
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverIndex(sortedTrackClips.length);
                              e.dataTransfer.setData('application/timeline-hover-index', String(sortedTrackClips.length));
                            }}
                          />
                        )}
                        {/* Library drag drop zone (at end) */}
                        {isDraggingFromLibrary && libraryInsertIndex === sortedTrackClips.length && track.role === 'main' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: `${clipPosition + clipWidth + 5}px`,
                              top: '0px',
                              width: '30px',
                              height: '80px',
                              zIndex: 20,
                              pointerEvents: 'none',
                            }}
                          >
                            <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-[#0066cc] z-[5]" />
                          </div>
                        )}
                      </>
                    )}
                  </React.Fragment>
                );
              })}

                    {/* Drop zone at end when timeline is empty or for library drag at end - only show on main track */}
                    {track.role === 'main' && mainTrackClips.length === 0 && isDraggingFromLibrary && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0px',
                    top: '0px',
                    width: '30px',
                    height: '80px',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  <div className="absolute left-[-1px] top-0 bottom-0 w-0.5 bg-[#0066cc] z-[5]" />
                </div>
              )}

                    {/* Empty state - only show on main track */}
                    {track.role === 'main' && mainTrackClips.length === 0 && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-[#999999] text-sm">Drag clips from Library to timeline</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Trim Tooltip */}
      {trimDrag.dragging && trimDrag.tooltipVisible && (() => {
        const clip = mainTrackClips.find(c => c.id === trimDrag.dragging!.clipId);
        if (!clip) return null;

        const originalDuration = clip.trimEnd - clip.trimStart;
        const newInPoint = trimDrag.draggedInPoint ?? clip.trimStart;
        const newOutPoint = trimDrag.draggedOutPoint ?? clip.trimEnd;
        const newDuration = newOutPoint - newInPoint;
        
        // Determine if expanding (trimStart decreased or trimEnd increased)
        const isExpanding = (trimDrag.draggedInPoint !== null && trimDrag.draggedInPoint < clip.trimStart) ||
                           (trimDrag.draggedOutPoint !== null && trimDrag.draggedOutPoint > clip.trimEnd);

        const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
        const framerate = libraryClip?.metadata.framerate || 30;

        return (
          <TrimTooltip
            originalDuration={originalDuration}
            newDuration={newDuration}
            position={trimDrag.tooltipPosition}
            visible={trimDrag.tooltipVisible}
            isExpanding={isExpanding}
            isAtMinimum={trimDrag.isAtMinimum}
            isBelowMinimum={trimDrag.isBelowMinimum}
            framerate={framerate}
            currentTrimStart={trimDrag.draggedInPoint ?? trimDrag.fixedInPoint ?? clip.trimStart}
            currentTrimEnd={trimDrag.draggedOutPoint ?? trimDrag.fixedOutPoint ?? clip.trimEnd}
          />
        );
      })()}
    </div>
  );
};

export default Timeline;

