/**
 * Sequence Preview Button Component
 * 
 * Button to start sequence preview (plays all timeline clips in order)
 */

import React from 'react';

interface SequencePreviewButtonProps {
  /** Whether timeline is empty */
  isEmpty: boolean;
  /** Callback when button is clicked */
  onClick: () => void;
}

const SequencePreviewButton: React.FC<SequencePreviewButtonProps> = ({
  isEmpty,
  onClick,
}) => {
  return (
    <button
      className="sequence-preview-button"
      onClick={onClick}
      disabled={isEmpty}
      aria-label="Preview sequence"
    >
      Preview Sequence
    </button>
  );
};

export default SequencePreviewButton;

