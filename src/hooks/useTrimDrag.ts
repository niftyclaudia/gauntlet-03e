/**
 * Custom hook for managing trim drag state
 * 
 * Centralizes trim drag state management at Timeline level.
 * Manages dragged trim values, tooltip position, and drag state.
 */

import { useState, useCallback } from 'react';
import { validateTrimStart, validateTrimEnd } from '../utils/trimCalculations';

/** Minimum clip duration in seconds (must match trimCalculations.ts) */
const MIN_CLIP_DURATION = 1.0;

export interface TrimDragState {
  /** Clip ID being trimmed */
  clipId: string;
  /** Which edge is being dragged ('left' or 'right') */
  edge: 'left' | 'right';
  /** Initial trim start value (at drag start) */
  initialInPoint: number;
  /** Initial trim end value (at drag start) */
  initialOutPoint: number;
  /** Initial mouse X position (for calculating delta) */
  initialMouseX: number;
  /** Initial clip start X position (in pixels) */
  initialClipStartX: number;
  /** Initial clip width (in pixels) - used to calculate right edge position */
  initialClipWidth: number;
  /** Timeline start time for this clip (cumulative time before clip) */
  timelineStartTime: number;
}

export interface UseTrimDragReturn {
  /** Current drag state (null if not dragging) */
  dragging: TrimDragState | null;
  /** Dragged inPoint value (null if not dragging or dragging right handle) */
  draggedInPoint: number | null;
  /** Dragged outPoint value (null if not dragging or dragging left handle) */
  draggedOutPoint: number | null;
  /** Fixed inPoint value (initial value when dragging right handle) */
  fixedInPoint: number | null;
  /** Fixed outPoint value (initial value when dragging left handle) */
  fixedOutPoint: number | null;
  /** Tooltip position {x, y} in pixels */
  tooltipPosition: { x: number; y: number };
  /** Whether tooltip should be visible */
  tooltipVisible: boolean;
  /** Whether the current trim is at minimum duration constraint */
  isAtMinimum: boolean;
  /** Whether the current trim violates minimum duration constraint */
  isBelowMinimum: boolean;
  /** Start trim drag operation */
  handleTrimStart: (
    clipId: string,
    edge: 'left' | 'right',
    initialInPoint: number,
    initialOutPoint: number,
    clipStartX: number,
    mouseX: number,
    mouseY: number,
    timelineStartTime: number,
    initialClipWidth?: number
  ) => void;
  /** Update trim drag position */
  handleTrimMove: (
    mouseX: number,
    clipDuration: number,
    mouseXScreen?: number,
    mouseYScreen?: number,
    currentClipStartX?: number
  ) => void;
  /** End trim drag operation */
  handleTrimEnd: () => void;
}

/**
 * Hook for managing trim drag state at Timeline level
 * 
 * @param zoom - Timeline zoom level (for pixel-to-time conversion)
 * @returns Trim drag state and handlers
 */
export function useTrimDrag(zoom: number): UseTrimDragReturn {
  const [dragging, setDragging] = useState<TrimDragState | null>(null);
  const [draggedInPoint, setDraggedInPoint] = useState<number | null>(null);
  const [draggedOutPoint, setDraggedOutPoint] = useState<number | null>(null);
  const [fixedInPoint, setFixedInPoint] = useState<number | null>(null);
  const [fixedOutPoint, setFixedOutPoint] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [isAtMinimum, setIsAtMinimum] = useState<boolean>(false);
  const [isBelowMinimum, setIsBelowMinimum] = useState<boolean>(false);

  /**
   * Start trim drag operation
   */
  const handleTrimStart = useCallback((
    clipId: string,
    edge: 'left' | 'right',
    initialInPoint: number,
    initialOutPoint: number,
    clipStartX: number,
    mouseX: number,
    mouseY: number,
    timelineStartTime: number,
    initialClipWidth?: number
  ) => {
    setDragging({
      clipId,
      edge,
      initialInPoint,
      initialOutPoint,
      initialMouseX: mouseX,
      initialClipStartX: clipStartX,
      initialClipWidth: initialClipWidth ?? 0,
      timelineStartTime,
    });

    // Set initial dragged values based on which edge is being dragged
    if (edge === 'left') {
      // Dragging left handle: left edge is being dragged, right edge stays fixed
      setDraggedInPoint(initialInPoint);
      setDraggedOutPoint(null);
      setFixedOutPoint(initialOutPoint); // Right edge is fixed at initial value
      setFixedInPoint(null);
    } else {
      // Dragging right handle: right edge is being dragged, left edge stays fixed
      setDraggedInPoint(null);
      setDraggedOutPoint(initialOutPoint);
      setFixedInPoint(initialInPoint); // Left edge is fixed at initial value
      setFixedOutPoint(null);
    }

    // Set tooltip position
    setTooltipPosition({ x: mouseX, y: mouseY });
    setTooltipVisible(true);
  }, []);

  /**
   * Update trim drag position during mouse move
   */
  const handleTrimMove = useCallback((
    mouseX: number,
    clipDuration: number,
    mouseXScreen?: number,
    mouseYScreen?: number
  ) => {
    if (!dragging) return;

    // Calculate mouse delta (relative to initial position)
    const mouseDelta = mouseX - dragging.initialMouseX;
    
    // Convert delta to time delta
    const pixelsPerSecond = 10 * zoom; // BASE_PIXELS_PER_SECOND * zoom
    const timeDelta = mouseDelta / pixelsPerSecond;

    let currentInPoint: number;
    let currentOutPoint: number;

    if (dragging.edge === 'left') {
      // Dragging left handle: update trimStart
      const newInPoint = dragging.initialInPoint + timeDelta;
      const validatedInPoint = validateTrimStart(
        newInPoint,
        dragging.initialOutPoint, // Use initial outPoint (not dragged)
        clipDuration
      );
      setDraggedInPoint(validatedInPoint);
      // Keep outPoint unchanged when dragging left handle (set to initial)
      setDraggedOutPoint(null);
      
      currentInPoint = validatedInPoint;
      currentOutPoint = dragging.initialOutPoint;
    } else {
      // Dragging right handle: update trimEnd
      const newOutPoint = dragging.initialOutPoint + timeDelta;
      const validatedOutPoint = validateTrimEnd(
        dragging.initialInPoint, // Use initial inPoint (not dragged)
        newOutPoint,
        clipDuration
      );
      setDraggedOutPoint(validatedOutPoint);
      // Keep inPoint unchanged when dragging right handle (set to null)
      setDraggedInPoint(null);
      
      currentInPoint = dragging.initialInPoint;
      currentOutPoint = validatedOutPoint;
    }

    // Check for constraint violations
    const currentDuration = currentOutPoint - currentInPoint;
    const isAtMin = Math.abs(currentDuration - MIN_CLIP_DURATION) < 0.01; // Within 0.01s of minimum
    const isBelowMin = currentDuration < MIN_CLIP_DURATION;
    
    setIsAtMinimum(isAtMin);
    setIsBelowMinimum(isBelowMin);

    // Update tooltip position to follow mouse cursor
    if (mouseXScreen !== undefined && mouseYScreen !== undefined) {
      setTooltipPosition({ x: mouseXScreen, y: mouseYScreen });
    }
  }, [dragging, zoom]);

  /**
   * End trim drag operation
   */
  const handleTrimEnd = useCallback(() => {
    setDragging(null);
    setDraggedInPoint(null);
    setDraggedOutPoint(null);
    setFixedInPoint(null);
    setFixedOutPoint(null);
    setTooltipVisible(false);
    setIsAtMinimum(false);
    setIsBelowMinimum(false);
  }, []);

  return {
    dragging,
    draggedInPoint,
    draggedOutPoint,
    fixedInPoint,
    fixedOutPoint,
    tooltipPosition,
    tooltipVisible,
    isAtMinimum,
    isBelowMinimum,
    handleTrimStart,
    handleTrimMove,
    handleTrimEnd,
  };
}

