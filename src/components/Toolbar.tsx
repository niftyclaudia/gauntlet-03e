/**
 * Toolbar Component
 * 
 * Icon toolbar below menu bar (OpenShot style)
 */

import React from 'react';

interface ToolbarProps {
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddFiles?: () => void;
  onExport?: () => void;
  onRecord?: () => void;
  onPlayPause?: () => void;
  isPlaying?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onUndo,
  onRedo,
  onAddFiles,
  onExport,
  onRecord,
  onPlayPause,
  isPlaying,
}) => {
  return (
    <div className="flex items-center h-10 bg-[#2a2a2a] border-b border-[#333333] px-3 gap-2">
      {/* New Project */}
      <button
        onClick={onNewProject}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="New Project"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Open Project */}
      <button
        onClick={onOpenProject}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Open Project"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 7V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V3.33333C2 2.97971 2.14048 2.64057 2.39052 2.39052C2.64057 2.14048 2.97971 2 3.33333 2H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 2L14 4L8 10H6V8L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Save Project */}
      <button
        onClick={onSaveProject}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Save Project"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 2H10L13 5V13.3333C13 13.6869 12.8595 14.0261 12.6095 14.2761C12.3594 14.5262 12.0203 14.6667 11.6667 14.6667H4.33333C3.97971 14.6667 3.64057 14.5262 3.39052 14.2761C3.14048 14.0261 3 13.6869 3 13.3333V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 2V8H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="w-px h-6 bg-[#444444] mx-1" />

      {/* Undo */}
      <button
        onClick={onUndo}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Undo"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 6C2 4.93913 2.42143 3.92172 3.17157 3.17157C3.92172 2.42143 4.93913 2 6 2H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 2L2 6L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Redo"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 6C14 4.93913 13.5786 3.92172 12.8284 3.17157C12.0783 2.42143 11.0609 2 10 2H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 2L14 6L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className="w-px h-6 bg-[#444444] mx-1" />

      {/* Play/Pause */}
      <button
        onClick={onPlayPause}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4H10V12H6V4Z" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 4L12 8L6 12V4Z" fill="currentColor"/>
          </svg>
        )}
      </button>

      <div className="w-px h-6 bg-[#444444] mx-1" />

      {/* Add Files */}
      <button
        onClick={onAddFiles}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Add Files"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Share/Export */}
      <button
        onClick={onExport}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Share/Export Video"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 2V10M8 2L5 5M8 2L11 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Record */}
      <button
        onClick={onRecord}
        className="w-8 h-8 flex items-center justify-center hover:bg-[#3a3a3a] rounded transition-colors"
        title="Record"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="6" fill="#ff4444" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </button>
    </div>
  );
};

export default Toolbar;

