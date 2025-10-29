/**
 * Library Panel Component
 * 
 * Displays imported video clips in the left panel (20% width).
 * Supports video import via drag-and-drop and file picker.
 */

import React, { useState, DragEvent } from 'react';
import { VideoClip } from '../types/video';
import LibraryClipCard from './LibraryClipCard';
import { useFileImport } from '../hooks/useFileImport';
import { useCountdown } from '../hooks/useCountdown';

interface LibraryProps {
  /** Array of imported clips */
  library: VideoClip[];
  /** Callback when new clips are imported */
  onImportComplete: (clips: VideoClip[]) => void;
  /** Callback when clip is selected */
  onSelectClip?: (clip: VideoClip) => void;
  /** Currently selected clip ID (for highlighting) */
  selectedClipId?: string | null;
  /** Callback when clip is deleted */
  onDeleteClip?: (clipId: string) => void;
}

const Library: React.FC<LibraryProps> = ({ library, onImportComplete, onSelectClip, selectedClipId, onDeleteClip }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { isImporting, importProgress, handleFileImport, error, warning, clearMessages } = useFileImport();
  
  // Countdown timers for auto-dismiss
  const errorCountdown = useCountdown(10, !!error);
  const warningCountdown = useCountdown(8, !!warning);

  /**
   * Handle file picker button click
   */
  const handleImportClick = async () => {
    try {
      const filePaths = await window.electron.selectFiles();
      if (filePaths.length > 0) {
        const importedClips = await handleFileImport(filePaths);
        if (importedClips.length > 0) {
          onImportComplete(importedClips);
        }
      }
    } catch (err) {
      console.error('[Library] File import error:', err);
    }
  };

  /**
   * Handle clip deletion with confirmation
   */
  const handleDeleteClip = (clipId: string) => {
    const clip = library.find(c => c.id === clipId);
    if (!clip) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${clip.filename}" from the library?\n\nThis will also remove it from the timeline if it's being used there.`
    );

    if (confirmed && onDeleteClip) {
      onDeleteClip(clipId);
    }
  };

  /**
   * Handle drag over event
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * Handle drag leave event
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * Handle drop event
   */
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    try {
      // Extract file paths from dropped files using Electron's webUtils
      const files = Array.from(e.dataTransfer.files);
      
      const filePaths: string[] = [];
      for (const file of files) {
        try {
          // Use Electron's webUtils.getPathForFile to get file path
          const filePath = window.electron.getPathForFile(file);
          if (filePath) {
            filePaths.push(filePath);
            console.log('[Library] Dropped file path:', filePath);
          }
        } catch (fileError) {
          console.error('[Library] Failed to get path for file:', file.name, fileError);
        }
      }

      console.log('[Library] Processing', filePaths.length, 'dropped file(s)');

      if (filePaths.length > 0) {
        const importedClips = await handleFileImport(filePaths);
        if (importedClips.length > 0) {
          onImportComplete(importedClips);
        }
      } else {
        console.error('[Library] No valid file paths found in drop');
      }
    } catch (error) {
      console.error('[Library] Drop error:', error);
    }
  };

  return (
    <div 
      className={`library-panel ${isDragging ? 'library-drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with import button */}
      <div className="library-header">
        <h2>Library ({library.length})</h2>
        <button 
          className="import-button"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Videos'}
        </button>
      </div>

      {/* Error/Warning messages */}
      {error && (
        <div className="toast toast-error" onClick={clearMessages}>
          <div className="toast-content">
            <span className="toast-message">{error}</span>
            <span className="toast-countdown">Auto-dismiss in {errorCountdown.countdown}s</span>
          </div>
        </div>
      )}
      {warning && (
        <div className="toast toast-warning" onClick={clearMessages}>
          <div className="toast-content">
            <span className="toast-message">{warning}</span>
            <span className="toast-countdown">Auto-dismiss in {warningCountdown.countdown}s</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isImporting && (
        <div className="library-loading">
          <div className="spinner"></div>
          <p>{importProgress}</p>
        </div>
      )}

      {/* Clip list or empty state */}
      <div className="library-content">
        {library.length === 0 && !isImporting ? (
          <div className="empty-state">
            <p>Drag & drop video files or click Import to get started</p>
          </div>
        ) : (
          <div className="library-clips-container">
            {library.map(clip => (
              <LibraryClipCard
                key={clip.id}
                clip={clip}
                onSelect={onSelectClip}
                isSelected={selectedClipId === clip.id}
                onDelete={handleDeleteClip}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;

