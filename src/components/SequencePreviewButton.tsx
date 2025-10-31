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
      className="bg-[#2a2a2a] text-white border border-[#444444] rounded-md px-4 py-2 text-sm font-medium cursor-pointer transition-colors hover:bg-[#3a3a3a] hover:border-[#555555] disabled:bg-[#333333] disabled:text-[#666666] disabled:cursor-not-allowed disabled:border-[#333333]"
      onClick={onClick}
      disabled={isEmpty}
      aria-label="Preview sequence"
    >
      Preview Sequence
    </button>
  );
};

export default SequencePreviewButton;

