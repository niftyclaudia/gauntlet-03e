/**
 * Timeline Panel Component
 * 
 * Displays video clips on timeline for editing (bottom panel, 30% height).
 * For PR-1, shows empty state message.
 * Timeline editing functionality will be added in PR-3.
 */

import React from 'react';

const Timeline: React.FC = () => {
  return (
    <div className="timeline-panel">
      <div className="empty-state">
        <p>Drag video files here or click to import</p>
      </div>
    </div>
  );
};

export default Timeline;

