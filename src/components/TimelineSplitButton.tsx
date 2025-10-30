/**
 * Timeline Split Button Component
 * 
 * Button for splitting clips at the current playhead position.
 * Only enabled when playhead is over a clip.
 */

import React, { useEffect, useState } from 'react';

interface TimelineSplitButtonProps {
  /** Whether the button should be enabled */
  enabled: boolean;
  /** Callback when split button is clicked */
  onClick: () => void;
  /** CSS class name for styling */
  className?: string;
}

const TimelineSplitButton: React.FC<TimelineSplitButtonProps> = ({
  enabled,
  onClick,
  className = ''
}) => {
  const [isClicked, setIsClicked] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Handle click with visual feedback
  const handleClick = () => {
    if (!enabled) return;
    
    // Show click animation
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 150);
    
    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1000);
    
    // Call the actual split function
    onClick();
  };

  // Handle keyboard shortcut (Cmd/Ctrl+Shift+X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed = (e.metaKey || e.ctrlKey) && e.shiftKey;
      if (isModifierPressed && e.key === 'X' && enabled) {
        e.preventDefault();
        handleClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleClick]);

  return (
    <button
      className={`timeline-split-button ${enabled ? 'enabled' : 'disabled'} ${isClicked ? 'clicked' : ''} ${showSuccess ? 'success' : ''} ${className}`}
      onClick={handleClick}
      disabled={!enabled}
      title={enabled ? 'Split clip at playhead (Cmd/Ctrl+Shift+X)' : 'Position playhead over a clip to split'}
    >
      <span className="split-button-icon">
        {showSuccess ? '✓' : '✂️'}
      </span>
      <span className="split-button-text">
        {showSuccess ? 'Split!' : 'Split'}
      </span>
    </button>
  );
};

export default TimelineSplitButton;
