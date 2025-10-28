/**
 * Library Panel Component
 * 
 * Displays imported video clips in the left panel (20% width).
 * For PR-1, shows empty state message.
 * Video import functionality will be added in PR-2.
 */

import React from 'react';

const Library: React.FC = () => {
  return (
    <div className="library-panel">
      <div className="empty-state">
        <p>Drag & drop video files or click Import to get started</p>
      </div>
    </div>
  );
};

export default Library;

