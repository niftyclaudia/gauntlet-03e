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
      className="record-button"
      onClick={onClick}
      disabled={disabled}
      title="Record Video"
    >
      <span className="record-icon">●</span>
      <span className="record-label">Record</span>
    </button>
  );
};

export default RecordButton;
