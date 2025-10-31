/**
 * useUndoRedo Hook
 * 
 * Hook for keyboard-based undo/redo (Cmd+Z/Cmd+Shift+Z)
 * Based on PR #17 architecture
 */

import { useEffect } from 'react';
import { useTimelineStore } from '../stores/timelineStore';

export function useUndoRedo(): void {
  const undo = useTimelineStore(state => state.undo);
  const redo = useTimelineStore(state => state.redo);
  const canUndo = useTimelineStore(state => state.canUndo);
  const canRedo = useTimelineStore(state => state.canRedo);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z (undo) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
        }
      }

      // Check for Cmd+Shift+Z (redo) or Ctrl+Shift+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }

      // Also handle Cmd+Y (redo) on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) {
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo, canUndo, canRedo]);
}

