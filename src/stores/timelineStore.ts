/**
 * Zustand Timeline Store
 * 
 * Centralized timeline state management with proper immutability patterns
 * Based on PR #17 architecture
 */

import { create } from 'zustand';
import { TimelineDoc, createEmptyTimelineDoc, validateTimelineDoc } from '../types/timeline';
import { TimelineClip, VideoClip } from '../types/video';
import { BaseCommand } from '../utils/timeline/commands/BaseCommand';

export interface TimelineState {
  /** Timeline document (multitrack structure) */
  timelineDoc: TimelineDoc;
  /** Library clips (for reference) */
  library: VideoClip[];
  /** Currently selected clip ID */
  selectedClipId: string | null;
  /** Current playhead position in seconds */
  playheadPosition: number;
  /** Timeline zoom level (1.0 to 10.0) */
  zoom: number;
  /** Timeline horizontal scroll position in pixels */
  scrollPosition: number;
  /** Undo stack */
  undoStack: BaseCommand[];
  /** Redo stack */
  redoStack: BaseCommand[];
  /** Maximum undo history size */
  maxHistorySize: number;
}

export interface TimelineActions {
  /** Set timeline document */
  setTimelineDoc: (doc: TimelineDoc) => void;
  /** Set library clips */
  setLibrary: (library: VideoClip[]) => void;
  /** Execute a command (adds to undo stack) */
  executeCommand: (command: BaseCommand) => void;
  /** Undo last command */
  undo: () => void;
  /** Redo last undone command */
  redo: () => void;
  /** Select a clip */
  selectClip: (clipId: string | null) => void;
  /** Set playhead position */
  setPlayheadPosition: (position: number) => void;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Set scroll position */
  setScrollPosition: (position: number) => void;
  /** Clear undo/redo history */
  clearHistory: () => void;
  /** Check if undo is available */
  canUndo: () => boolean;
  /** Check if redo is available */
  canRedo: () => boolean;
}

export type TimelineStore = TimelineState & TimelineActions;

const initialState: TimelineState = {
  timelineDoc: createEmptyTimelineDoc(),
  library: [],
  selectedClipId: null,
  playheadPosition: 0,
  zoom: 1.0,
  scrollPosition: 0,
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...initialState,

  setTimelineDoc: (doc: TimelineDoc) => {
    // Validate timeline document
    const validation = validateTimelineDoc(doc);
    if (!validation.valid) {
      console.error('[TimelineStore] Invalid timeline document:', validation.errors);
      return;
    }
    
    set({ timelineDoc: doc });
  },

  setLibrary: (library: VideoClip[]) => {
    set({ library });
  },

  executeCommand: (command: BaseCommand) => {
    const state = get();
    
    try {
      // Execute command
      const newTimelineDoc = command.execute(state.timelineDoc, state.library);
      
      // Validate result
      const validation = validateTimelineDoc(newTimelineDoc);
      if (!validation.valid) {
        console.error('[TimelineStore] Command execution resulted in invalid timeline:', validation.errors);
        return;
      }
      
      // Update state
      set({
        timelineDoc: newTimelineDoc,
        undoStack: [...state.undoStack.slice(-state.maxHistorySize + 1), command],
        redoStack: [], // Clear redo stack when new command is executed
      });
    } catch (error) {
      console.error('[TimelineStore] Command execution failed:', error);
    }
  },

  undo: () => {
    const state = get();
    
    if (state.undoStack.length === 0) {
      return;
    }
    
    // Get last command
    const command = state.undoStack[state.undoStack.length - 1];
    
    try {
      // Undo command
      const newTimelineDoc = command.undo(state.timelineDoc, state.library);
      
      // Validate result
      const validation = validateTimelineDoc(newTimelineDoc);
      if (!validation.valid) {
        console.error('[TimelineStore] Undo resulted in invalid timeline:', validation.errors);
        return;
      }
      
      // Update state
      set({
        timelineDoc: newTimelineDoc,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, command],
      });
    } catch (error) {
      console.error('[TimelineStore] Undo failed:', error);
    }
  },

  redo: () => {
    const state = get();
    
    if (state.redoStack.length === 0) {
      return;
    }
    
    // Get last undone command
    const command = state.redoStack[state.redoStack.length - 1];
    
    try {
      // Re-execute command
      const newTimelineDoc = command.execute(state.timelineDoc, state.library);
      
      // Validate result
      const validation = validateTimelineDoc(newTimelineDoc);
      if (!validation.valid) {
        console.error('[TimelineStore] Redo resulted in invalid timeline:', validation.errors);
        return;
      }
      
      // Update state
      set({
        timelineDoc: newTimelineDoc,
        undoStack: [...state.undoStack, command],
        redoStack: state.redoStack.slice(0, -1),
      });
    } catch (error) {
      console.error('[TimelineStore] Redo failed:', error);
    }
  },

  selectClip: (clipId: string | null) => {
    set({ selectedClipId: clipId });
  },

  setPlayheadPosition: (position: number) => {
    set({ playheadPosition: Math.max(0, position) });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.1, Math.min(10.0, zoom)) });
  },

  setScrollPosition: (position: number) => {
    set({ scrollPosition: Math.max(0, position) });
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
    });
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  canRedo: () => {
    return get().redoStack.length > 0;
  },
}));

