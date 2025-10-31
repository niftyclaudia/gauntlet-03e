/**
 * Multitrack Preview Player Component
 *
 * Displays video preview with support for multiple tracks:
 * - Main track: Full-screen video with audio
 * - Overlay tracks: Picture-in-picture (PIP) with audio
 *
 * Handles synchronized playback across all tracks with audio mixing.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoClip, TimelineClip } from '../types/video';
import { TimelineDoc } from '../types/timeline';
import PlayerControls from './PlayerControls';
import ExportProgressBar from './ExportProgressBar';
import ExportDialog from './ExportDialog';
import AdvancedExportDialog from './AdvancedExportDialog';
import { useExport } from '../hooks/useExport';
import {
  calculateSequence,
  calculateSequenceDuration,
  findCurrentClipInSequence,
  getLocalTimeInClip,
} from '../utils/sequenceCalculations';

interface MultitrackPreviewPlayerProps {
  /** Timeline document with multitrack structure */
  timelineDoc: TimelineDoc;
  /** Array of library clips */
  library: VideoClip[];
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Callback when playhead position changes */
  onPlayheadChange: (position: number) => void;
  /** Whether video is playing */
  isPlaying: boolean;
  /** Callback when playback state changes */
  onPlayingChange: (playing: boolean) => void;
  /** Callback to get project state for auto-save before export */
  onBeforeExport?: () => Promise<any>;
  /** Callback to expose export handler for external use (e.g., toolbar) */
  onExportHandlerReady?: (handler: () => void) => void;
  /** Callback to expose play/pause handler for external use (e.g., toolbar) */
  onPlayPauseHandlerReady?: (handler: () => void) => void;
}

interface TrackVideoState {
  trackId: string;
  currentClip: TimelineClip | null;
  libraryClip: VideoClip | null;
  isLoading: boolean;
  error: string | null;
}

const MultitrackPreviewPlayer: React.FC<MultitrackPreviewPlayerProps> = ({
  timelineDoc,
  library,
  currentPlayheadPosition,
  onPlayheadChange,
  isPlaying,
  onPlayingChange,
  onBeforeExport,
  onExportHandlerReady,
  onPlayPauseHandlerReady,
}) => {
  // Video refs for each track
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const overlayVideoRef = useRef<HTMLVideoElement>(null);

  // Track video states
  const [mainTrackState, setMainTrackState] = useState<TrackVideoState>({
    trackId: '',
    currentClip: null,
    libraryClip: null,
    isLoading: false,
    error: null,
  });

  const [overlayTrackState, setOverlayTrackState] = useState<TrackVideoState>({
    trackId: '',
    currentClip: null,
    libraryClip: null,
    isLoading: false,
    error: null,
  });

  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const isExternalSeekRef = useRef(false);
  const lastPlayheadPositionRef = useRef(0);
  const lastPlayheadUpdateTimeRef = useRef(0);

  // Export hook
  const exportHook = useExport();
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAdvancedExportDialog, setShowAdvancedExportDialog] = useState(false);
  const wasExportingRef = useRef(false);

  /**
   * Calculate sequences for all tracks
   */
  const calculateAllSequences = useCallback(() => {
    const sequences: { trackId: string; clips: TimelineClip[] }[] = [];

    timelineDoc.tracks.forEach(track => {
      track.lanes.forEach(lane => {
        if (lane.clips.length > 0) {
          sequences.push({
            trackId: track.id,
            clips: lane.clips.sort((a, b) => {
              if (track.role === 'main') {
                return a.order - b.order;
              }
              return (a.start || 0) - (b.start || 0);
            }),
          });
        }
      });
    });

    return sequences;
  }, [timelineDoc]);

  /**
   * Find which clip is active at the current playhead position for a given track
   */
  const findActiveClipForTrack = useCallback((trackClips: TimelineClip[], playheadPos: number, trackRole: 'main' | 'overlay') => {
    if (trackRole === 'main') {
      // For main track, calculate cumulative time (gapless)
      let cumulativeTime = 0;
      for (const clip of trackClips) {
        const clipDuration = clip.trimEnd - clip.trimStart;
        if (playheadPos >= cumulativeTime && playheadPos < cumulativeTime + clipDuration) {
          return {
            clip,
            localTime: clip.trimStart + (playheadPos - cumulativeTime),
          };
        }
        cumulativeTime += clipDuration;
      }
    } else {
      // For overlay tracks, use absolute start times
      for (const clip of trackClips) {
        if (clip.start !== undefined) {
          const clipDuration = clip.trimEnd - clip.trimStart;
          const clipEnd = clip.start + clipDuration;
          if (playheadPos >= clip.start && playheadPos < clipEnd) {
            return {
              clip,
              localTime: clip.trimStart + (playheadPos - clip.start),
            };
          }
        }
      }
    }
    return null;
  }, []);

  /**
   * Update video states based on playhead position
   */
  useEffect(() => {
    const sequences = calculateAllSequences();

    // Find main track
    const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
    if (mainTrack && mainTrack.lanes[0]) {
      const mainClips = mainTrack.lanes[0].clips.sort((a, b) => a.order - b.order);
      const activeMain = findActiveClipForTrack(mainClips, currentPlayheadPosition, 'main');

      if (activeMain) {
        const libraryClip = library.find(lc => lc.id === activeMain.clip.libraryClipId);
        if (libraryClip) {
          setMainTrackState(prev => {
            // Only update if clip changed
            if (prev.currentClip?.id !== activeMain.clip.id) {
              return {
                trackId: mainTrack.id,
                currentClip: activeMain.clip,
                libraryClip,
                isLoading: true,
                error: null,
              };
            }
            return prev;
          });
        }
      } else {
        // No active clip at this position
        setMainTrackState({
          trackId: mainTrack.id,
          currentClip: null,
          libraryClip: null,
          isLoading: false,
          error: null,
        });
      }
    }

    // Find overlay tracks (use first overlay track for now)
    const overlayTrack = timelineDoc.tracks.find(t => t.role === 'overlay');
    if (overlayTrack && overlayTrack.lanes[0]) {
      const overlayClips = overlayTrack.lanes[0].clips.sort((a, b) => (a.start || 0) - (b.start || 0));
      const activeOverlay = findActiveClipForTrack(overlayClips, currentPlayheadPosition, 'overlay');

      if (activeOverlay) {
        const libraryClip = library.find(lc => lc.id === activeOverlay.clip.libraryClipId);
        if (libraryClip) {
          setOverlayTrackState(prev => {
            // Only update if clip changed
            if (prev.currentClip?.id !== activeOverlay.clip.id) {
              return {
                trackId: overlayTrack.id,
                currentClip: activeOverlay.clip,
                libraryClip,
                isLoading: true,
                error: null,
              };
            }
            return prev;
          });
        }
      } else {
        // No active clip at this position
        setOverlayTrackState({
          trackId: overlayTrack.id,
          currentClip: null,
          libraryClip: null,
          isLoading: false,
          error: null,
        });
      }
    }
  }, [currentPlayheadPosition, timelineDoc, library, findActiveClipForTrack, calculateAllSequences]);

  /**
   * Load and sync video for main track
   */
  useEffect(() => {
    if (!mainVideoRef.current || !mainTrackState.libraryClip || !mainTrackState.currentClip) {
      return;
    }

    const video = mainVideoRef.current;
    const clip = mainTrackState.currentClip;

    // Calculate local time in source video
    let cumulativeTime = 0;
    const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
    if (mainTrack && mainTrack.lanes[0]) {
      const mainClips = mainTrack.lanes[0].clips.sort((a, b) => a.order - b.order);
      for (const c of mainClips) {
        const clipDuration = c.trimEnd - c.trimStart;
        if (c.id === clip.id) {
          const localTime = clip.trimStart + (currentPlayheadPosition - cumulativeTime);
          const clampedTime = Math.max(clip.trimStart, Math.min(localTime, clip.trimEnd));

          // Seek to correct time
          if (Math.abs(video.currentTime - clampedTime) > 0.1) {
            video.currentTime = clampedTime;
          }
          break;
        }
        cumulativeTime += clipDuration;
      }
    }

    setMainTrackState(prev => ({ ...prev, isLoading: false }));
  }, [mainTrackState.libraryClip, mainTrackState.currentClip, currentPlayheadPosition, timelineDoc]);

  /**
   * Load and sync video for overlay track
   */
  useEffect(() => {
    if (!overlayVideoRef.current || !overlayTrackState.libraryClip || !overlayTrackState.currentClip) {
      return;
    }

    const video = overlayVideoRef.current;
    const clip = overlayTrackState.currentClip;

    // Calculate local time in source video (overlay uses absolute start times)
    if (clip.start !== undefined) {
      const localTime = clip.trimStart + (currentPlayheadPosition - clip.start);
      const clampedTime = Math.max(clip.trimStart, Math.min(localTime, clip.trimEnd));

      // Seek to correct time
      if (Math.abs(video.currentTime - clampedTime) > 0.1) {
        video.currentTime = clampedTime;
      }
    }

    setOverlayTrackState(prev => ({ ...prev, isLoading: false }));
  }, [overlayTrackState.libraryClip, overlayTrackState.currentClip, currentPlayheadPosition]);

  /**
   * Sync play/pause state across all video elements
   */
  useEffect(() => {
    const mainVideo = mainVideoRef.current;
    const overlayVideo = overlayVideoRef.current;

    if (isPlaying) {
      // Play both videos
      if (mainVideo && mainTrackState.currentClip && mainVideo.paused) {
        mainVideo.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[MultitrackPlayer] Main video play error:', err);
          }
        });
      }
      if (overlayVideo && overlayTrackState.currentClip && overlayVideo.paused) {
        overlayVideo.play().catch(err => {
          if (err.name !== 'AbortError') {
            console.error('[MultitrackPlayer] Overlay video play error:', err);
          }
        });
      }
    } else {
      // Pause both videos
      if (mainVideo && !mainVideo.paused) {
        mainVideo.pause();
      }
      if (overlayVideo && !overlayVideo.paused) {
        overlayVideo.pause();
      }
    }
  }, [isPlaying, mainTrackState.currentClip, overlayTrackState.currentClip]);

  /**
   * Handle time update from main video
   */
  const handleTimeUpdate = useCallback(() => {
    if (!mainVideoRef.current || isExternalSeekRef.current) return;

    const videoCurrentTime = mainVideoRef.current.currentTime || 0;

    // Calculate playhead position based on main track video time
    const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
    if (mainTrack && mainTrack.lanes[0] && mainTrackState.currentClip) {
      const mainClips = mainTrack.lanes[0].clips.sort((a, b) => a.order - b.order);
      let cumulativeTime = 0;

      for (const clip of mainClips) {
        const clipDuration = clip.trimEnd - clip.trimStart;
        if (clip.id === mainTrackState.currentClip.id) {
          const timeWithinClip = videoCurrentTime - clip.trimStart;
          const newPlayheadPos = cumulativeTime + timeWithinClip;

          // Update playhead
          const now = Date.now();
          if (now - lastPlayheadUpdateTimeRef.current > 16) {
            onPlayheadChange(newPlayheadPos);
            setCurrentTime(newPlayheadPos);
            lastPlayheadUpdateTimeRef.current = now;
          }
          break;
        }
        cumulativeTime += clipDuration;
      }
    }
  }, [mainTrackState.currentClip, timelineDoc, onPlayheadChange]);

  /**
   * Calculate total duration
   */
  useEffect(() => {
    const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
    if (mainTrack && mainTrack.lanes[0]) {
      const totalDur = mainTrack.lanes[0].clips.reduce((sum, clip) => {
        return sum + (clip.trimEnd - clip.trimStart);
      }, 0);
      setDuration(totalDur);
    }
  }, [timelineDoc]);

  /**
   * Handle sequence preview (play from beginning)
   */
  const handleSequencePreview = useCallback(() => {
    onPlayheadChange(0);
    onPlayingChange(true);
  }, [onPlayheadChange, onPlayingChange]);

  /**
   * Handle seek
   */
  const handleSeek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    isExternalSeekRef.current = true;
    onPlayheadChange(clampedTime);

    setTimeout(() => {
      isExternalSeekRef.current = false;
    }, 100);
  }, [duration, onPlayheadChange]);

  /**
   * Handle play/pause
   * Starts sequence preview when timeline has clips, otherwise just toggles playback
   */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      onPlayingChange(false);
    } else {
      // If paused and timeline has clips, start sequence preview (same as Preview Sequence button)
      const hasMainClips = (timelineDoc.tracks.find(t => t.role === 'main')?.lanes[0]?.clips.length ?? 0) > 0;
      if (hasMainClips && currentPlayheadPosition === 0) {
        // Start sequence preview from beginning
        handleSequencePreview();
      } else {
        // Resume current playback
        onPlayingChange(true);
      }
    }
  }, [isPlaying, onPlayingChange, timelineDoc, currentPlayheadPosition, handleSequencePreview]);

  /**
   * Handle export
   */
  const handleExportClick = useCallback(() => {
    const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
    if (!mainTrack || mainTrack.lanes[0].clips.length === 0) {
      console.log('[MultitrackPlayer] Cannot export: no clips');
      return;
    }

    if (exportHook.isExporting) {
      console.log('[MultitrackPlayer] Export already in progress');
      return;
    }

    setShowAdvancedExportDialog(true);
  }, [timelineDoc, exportHook.isExporting]);

  /**
   * Expose export handler to parent component (for Toolbar)
   */
  useEffect(() => {
    if (onExportHandlerReady) {
      onExportHandlerReady(handleExportClick);
    }
  }, [onExportHandlerReady, handleExportClick]);

  /**
   * Expose play/pause handler to parent component (for Toolbar)
   */
  useEffect(() => {
    if (onPlayPauseHandlerReady) {
      onPlayPauseHandlerReady(handlePlayPause);
    }
  }, [onPlayPauseHandlerReady, handlePlayPause]);

  const handleAdvancedExportStart = useCallback(async (advancedSettings: any) => {
    try {
      let projectState = undefined;
      if (onBeforeExport) {
        try {
          projectState = await onBeforeExport();
        } catch (error) {
          console.error('[MultitrackPlayer] Failed to get project state:', error);
        }
      }

      // Extract main track clips for export (legacy compatibility)
      // Pass timelineDoc to support overlay tracks in export
      const mainTrack = timelineDoc.tracks.find(t => t.role === 'main');
      const mainClips = mainTrack?.lanes[0]?.clips || [];
      const overlayTracks = timelineDoc.tracks.filter(t => t.role === 'overlay');
      
      console.log('[MultitrackPlayer] Starting export with:', {
        mainClips: mainClips.length,
        overlayTracks: overlayTracks.length,
        overlayClips: overlayTracks.reduce((sum, t) => sum + (t.lanes[0]?.clips.length || 0), 0),
        timelineDocTracks: timelineDoc.tracks.length,
        hasTimelineDoc: !!timelineDoc
      });

      await exportHook.startExport(mainClips, library, projectState, advancedSettings, timelineDoc);
      setShowAdvancedExportDialog(false);
    } catch (error) {
      console.error('[MultitrackPlayer] Export failed:', error);
    }
  }, [timelineDoc, library, exportHook, onBeforeExport]);

  const handleAdvancedExportCancel = useCallback(() => {
    if (exportHook.isExporting) {
      exportHook.reset();
    }
    setShowAdvancedExportDialog(false);
  }, [exportHook]);

  useEffect(() => {
    const exportJustCompleted = wasExportingRef.current && !exportHook.isExporting &&
                                (exportHook.outputPath || exportHook.error);

    if (exportJustCompleted && !showExportDialog) {
      setShowExportDialog(true);
    }

    wasExportingRef.current = exportHook.isExporting;
  }, [exportHook.isExporting, exportHook.outputPath, exportHook.error, showExportDialog]);

  const handleRevealInFinder = useCallback(async () => {
    if (exportHook.outputPath) {
      try {
        await window.electron.revealInFinder(exportHook.outputPath);
      } catch (error) {
        console.error('[MultitrackPlayer] Failed to reveal in Finder:', error);
      }
    }
  }, [exportHook.outputPath]);

  const handleExportDialogClose = useCallback(() => {
    setShowExportDialog(false);
    exportHook.reset();
  }, [exportHook]);

  const hasMainClips = (timelineDoc.tracks.find(t => t.role === 'main')?.lanes[0]?.clips.length ?? 0) > 0;

  return (
    <div className="flex-1 bg-[#1a1a1a] p-4 flex flex-col gap-4 min-w-0 relative max-h-full">
      {/* Export Progress Bar */}
      <ExportProgressBar
        progress={exportHook.progress}
        isExporting={exportHook.isExporting}
        error={exportHook.error}
      />

      {/* Video container with multitrack support */}
      <div className="flex-1 relative flex items-center justify-center bg-black rounded-lg min-h-0">
        <div className="w-full h-0 pb-[56.25%] relative">
          {!hasMainClips ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#666666]">
              <div className="text-[64px] opacity-50">▶</div>
              <p className="text-sm">No clips on timeline</p>
            </div>
          ) : (
            <>
              {/* Main track video (full screen) */}
              {mainTrackState.libraryClip && (
                <video
                  key={`main-${mainTrackState.currentClip?.id || 'empty'}`}
                  ref={mainVideoRef}
                  className="absolute inset-0 w-full h-full object-contain"
                  src={mainTrackState.libraryClip.path.startsWith('/')
                    ? `file://${encodeURI(mainTrackState.libraryClip.path).replace(/#/g, '%23')}`
                    : `file:///${encodeURI(mainTrackState.libraryClip.path).replace(/#/g, '%23')}`}
                  onTimeUpdate={handleTimeUpdate}
                  style={{
                    opacity: mainTrackState.isLoading ? 0 : 1,
                  }}
                />
              )}

              {/* Overlay track video (PIP) */}
              {overlayTrackState.libraryClip && (
                <video
                  key={`overlay-${overlayTrackState.currentClip?.id || 'empty'}`}
                  ref={overlayVideoRef}
                  className="absolute bottom-4 right-4 w-1/4 h-1/4 object-contain rounded-lg border-2 border-white shadow-lg"
                  src={overlayTrackState.libraryClip.path.startsWith('/')
                    ? `file://${encodeURI(overlayTrackState.libraryClip.path).replace(/#/g, '%23')}`
                    : `file:///${encodeURI(overlayTrackState.libraryClip.path).replace(/#/g, '%23')}`}
                  style={{
                    opacity: overlayTrackState.isLoading ? 0 : 1,
                    zIndex: 10,
                  }}
                />
              )}

              {/* Loading overlay */}
              {(mainTrackState.isLoading || overlayTrackState.isLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(26,26,26,0.8)] text-[#999999] z-20">
                  <div className="w-8 h-8 border-[3px] border-[#333333] border-t-[#0066cc] rounded-full animate-spin"></div>
                  <p className="text-sm">Loading videos...</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Player Controls */}
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        disabled={!hasMainClips}
      />

      {/* Export Dialogs */}
      <AdvancedExportDialog
        isOpen={showAdvancedExportDialog}
        clips={timelineDoc.tracks.find(t => t.role === 'main')?.lanes[0]?.clips || []}
        libraryClips={library}
        exportProgress={exportHook.progress}
        isExporting={exportHook.isExporting}
        exportError={exportHook.error}
        onClose={handleAdvancedExportCancel}
        onStartExport={handleAdvancedExportStart}
        onCancelExport={handleAdvancedExportCancel}
      />

      <ExportDialog
        isOpen={showExportDialog}
        success={exportHook.outputPath !== null}
        filePath={exportHook.outputPath}
        error={exportHook.error}
        onClose={handleExportDialogClose}
        onReveal={handleRevealInFinder}
      />
    </div>
  );
};

export default MultitrackPreviewPlayer;
