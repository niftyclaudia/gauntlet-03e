/**
 * Record Screen Button Component
 * 
 * Toolbar button to open the screen recording dialog
 */

import React from 'react';

interface RecordScreenButtonProps {
  /** Callback when button is clicked */
  onOpenDialog: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
}

const RecordScreenButton: React.FC<RecordScreenButtonProps> = ({ onOpenDialog, disabled = false }) => {
  return (
    <button
      className="record-screen-button"
      onClick={onOpenDialog}
      disabled={disabled}
      title="Record Screen"
    >
      <span className="record-screen-icon">●</span>
      <span className="record-screen-label">Record Screen</span>
    </button>
  );
};

export default RecordScreenButton;
