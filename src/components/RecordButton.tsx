/**
 * Unified Record Button Component
 * 
 * Single button that opens a modal to choose between screen recording and webcam recording
 */

import React from 'react';

interface RecordButtonProps {
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
}

const RecordButton: React.FC<RecordButtonProps> = ({ onClick, disabled = false }) => {
  return (
    <button
      className="bg-[#ff4444] text-white border-none rounded-md px-4 py-2 text-sm font-medium cursor-pointer flex items-center gap-2 transition-colors hover:bg-[#e03e3e] disabled:bg-[#666666] disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
      title="Record Video"
    >
      <span className="text-xs">●</span>
      <span>Record</span>
    </button>
  );
};

export default RecordButton;
