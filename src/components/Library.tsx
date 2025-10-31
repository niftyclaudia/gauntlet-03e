/**
 * Library Panel Component
 * 
 * Displays imported video clips in the left panel (20% width).
 * Supports video import via drag-and-drop and file picker.
 */

import React, { useState, DragEvent, forwardRef } from 'react';
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

const Library = forwardRef<HTMLDivElement, LibraryProps>(({ library, onImportComplete, onSelectClip, selectedClipId, onDeleteClip }, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'audio' | 'image' | 'filter'>('all');
  const { isImporting, importProgress, handleFileImport, error, warning, clearMessages } = useFileImport();
  
  // Countdown timers for auto-dismiss
  const errorCountdown = useCountdown(10, !!error);
  const warningCountdown = useCountdown(8, !!warning);
  
  // Filter clips based on active tab
  const filteredLibrary = library.filter(clip => {
    if (activeTab === 'all') return true;
    if (activeTab === 'video') return clip.path.endsWith('.mp4') || clip.path.endsWith('.mov');
    // Add more filters as needed
    return true;
  });

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
      ref={ref}
      className={`w-[15%] min-w-[180px] bg-[#1a1a1a] border-r border-[#333333] flex flex-col transition-colors ${isDragging ? 'border-2 border-dashed border-[#0066cc] bg-[rgba(0,102,204,0.1)]' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#333333] bg-[#252525] flex-shrink-0">
        <h2 className="text-sm font-medium text-white">Project Files</h2>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Import button */}
        <button 
          className="w-full bg-[#0066cc] text-white border-none rounded-md px-3 py-2 text-sm font-medium cursor-pointer transition-colors hover:bg-[#0052a3] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed mb-3"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          {isImporting ? 'Importing...' : 'Import Videos'}
        </button>


        {/* Loading state */}
        {isImporting && (
          <div className="flex flex-col items-center justify-center p-6 gap-3">
            <div className="w-8 h-8 border-[3px] border-[#333333] border-t-[#0066cc] rounded-full animate-spin"></div>
            <p className="text-sm text-[#999999] text-center">{importProgress}</p>
          </div>
        )}

        {/* Clip list or empty state */}
        {!isImporting && filteredLibrary.length === 0 && (
          <div className="flex items-center justify-center h-full text-center">
            <p className="text-[#999999] text-sm leading-relaxed max-w-[300px]">Drag & drop video files or click Import to get started</p>
          </div>
        )}

        {!isImporting && filteredLibrary.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredLibrary.map(clip => (
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

      {/* Bottom tabs */}
      <div className="flex border-t border-[#333333] bg-[#1a1a1a] flex-shrink-0">
        <button className="px-3 py-2 text-xs font-medium text-white bg-[#2a2a2a]">Project Files</button>
        <button className="px-3 py-2 text-xs font-medium text-[#999999] hover:text-white hover:bg-[#252525]">Transitions</button>
        <button className="px-3 py-2 text-xs font-medium text-[#999999] hover:text-white hover:bg-[#252525]">Effects</button>
        <button className="px-3 py-2 text-xs font-medium text-[#999999] hover:text-white hover:bg-[#252525]">Emojis</button>
      </div>

      {/* Error/Warning messages */}
      {error && (
        <div className="fixed top-16 right-4 p-3 px-4 rounded-md text-sm font-medium max-w-[350px] cursor-pointer z-[1000] animate-[slideIn_0.3s_ease-out] bg-[#cc0000] text-white" onClick={clearMessages}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{error}</span>
            <span className="text-xs opacity-80 italic">Auto-dismiss in {errorCountdown.countdown}s</span>
          </div>
        </div>
      )}
      {warning && (
        <div className="fixed top-16 right-4 p-3 px-4 rounded-md text-sm font-medium max-w-[350px] cursor-pointer z-[1000] animate-[slideIn_0.3s_ease-out] bg-[#ffaa00] text-[#1a1a1a]" onClick={clearMessages}>
          <div className="flex flex-col gap-1">
            <span className="font-medium">{warning}</span>
            <span className="text-xs opacity-80 italic">Auto-dismiss in {warningCountdown.countdown}s</span>
          </div>
        </div>
      )}
    </div>
  );
});

Library.displayName = 'Library';

export default Library;

