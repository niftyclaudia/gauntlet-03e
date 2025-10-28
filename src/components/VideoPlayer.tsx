/**
 * Video Player / Preview Panel Component
 * 
 * Displays video preview in center panel (~40% width).
 * Handles video playback, seeking, sequence preview, and playhead synchronization.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VideoClip, TimelineClip, SequenceItem } from '../types/video';
import PlayerControls from './PlayerControls';
import SequencePreviewButton from './SequencePreviewButton';
import {
  calculateSequence,
  calculateSequenceDuration,
  findCurrentClipInSequence,
  getLocalTimeInClip,
} from '../utils/sequenceCalculations';

interface VideoPlayerProps {
  /** Selected clip ID (from library or timeline) */
  selectedClipId: string | null;
  /** Array of library clips */
  library: VideoClip[];
  /** Array of timeline clips */
  timeline: TimelineClip[];
  /** Current playhead position in seconds */
  currentPlayheadPosition: number;
  /** Callback when playhead position changes */
  onPlayheadChange: (position: number) => void;
  /** Whether video is playing (from App state) */
  isPlaying: boolean;
  /** Callback when playback state changes */
  onPlayingChange: (playing: boolean) => void;
  /** Callback when clip selection should change (for timeline clicks) */
  onSelectClip?: (clipId: string | null) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  selectedClipId,
  library,
  timeline,
  currentPlayheadPosition,
  onPlayheadChange,
  isPlaying,
  onPlayingChange,
  onSelectClip,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerState, setPlayerState] = useState<{
    currentVideo: VideoClip | null;
    currentTimelineClip: TimelineClip | null;
    duration: number;
    currentTime: number;
    playbackMode: 'library' | 'timeline' | 'sequence';
    isLoading: boolean;
    error: string | null;
  }>({
    currentVideo: null,
    currentTimelineClip: null,
    duration: 0,
    currentTime: 0,
    playbackMode: 'library',
    isLoading: false,
    error: null,
  });

  const [sequence, setSequence] = useState<SequenceItem[]>([]);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState<number>(-1);
  const [sequenceTime, setSequenceTime] = useState<number>(0); // Track sequence time during playback
  const isSequenceModeRef = useRef(false);
  const isExternalSeekRef = useRef(false); // Track if seek is from external source (timeline drag/click)
  const lastPlayheadPositionRef = useRef(0); // Track last playhead position for detecting user seeks
  const lastPlayheadUpdateTimeRef = useRef(0); // Throttle playhead updates (timestamp)
  const sequenceStartTimeRef = useRef(0); // Track when sequence started (for calculating elapsed time)
  const lastPlayheadChangeTimeRef = useRef(0); // Track timing of playhead changes for detecting drag
  const isUserDraggingRef = useRef(false); // Track if user is actively dragging playhead
  const isPlayingRef = useRef(isPlaying); // Keep ref in sync for keyboard handler
  const playerStateRef = useRef(playerState); // Keep ref in sync for keyboard handler
  const currentPlayheadPositionRef = useRef(currentPlayheadPosition); // Keep ref in sync for keyboard handler
  const sequenceRef = useRef(sequence); // Keep ref in sync for keyboard handler
  const currentSequenceIndexRef = useRef(currentSequenceIndex); // Keep ref in sync for keyboard handler

  /**
   * Calculate sequence from timeline whenever timeline changes
   */
  useEffect(() => {
    if (timeline.length > 0) {
      const newSequence = calculateSequence(timeline, library);
      setSequence(newSequence);
    } else {
      setSequence([]);
    }
  }, [timeline, library]);

  /**
   * Load video from library clip
   */
  const loadLibraryClip = useCallback((clip: VideoClip) => {
    console.log('[VideoPlayer] Loading library clip:', clip.filename, clip.path);

    // Update state first - this will trigger a re-render and create the video element
    setPlayerState(prev => ({
      ...prev,
      currentVideo: clip,
      currentTimelineClip: null,
      isLoading: true,
      error: null,
      playbackMode: 'library',
    }));

    // Stop sequence preview if active
    if (isSequenceModeRef.current) {
      onPlayingChange(false);
    }
    
    isSequenceModeRef.current = false;
    setCurrentSequenceIndex(-1);
    setSequenceTime(0);
  }, [onPlayingChange]);

  /**
   * Load video from timeline clip (with trim points)
   */
  const loadTimelineClip = useCallback((timelineClip: TimelineClip, clip: VideoClip) => {
    console.log('[VideoPlayer] Loading timeline clip:', clip.filename, clip.path);

    // Update state first - this will trigger a re-render and create the video element
    setPlayerState(prev => ({
      ...prev,
      currentVideo: clip,
      currentTimelineClip: timelineClip,
      isLoading: true,
      error: null,
      playbackMode: 'timeline',
      duration: timelineClip.trimEnd - timelineClip.trimStart,
    }));

    // Stop sequence preview if active
    if (isSequenceModeRef.current) {
      onPlayingChange(false);
    }
    
    isSequenceModeRef.current = false;
    setCurrentSequenceIndex(-1);
    setSequenceTime(0);
  }, [onPlayingChange]);

  /**
   * Handle clip selection change
   */
  useEffect(() => {
    if (!selectedClipId) {
      // Clear player
      setPlayerState(prev => ({
        ...prev,
        currentVideo: null,
        currentTimelineClip: null,
        duration: 0,
        currentTime: 0,
        error: null,
      }));
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      return;
    }

    // Check if it's a timeline clip
    const timelineClip = timeline.find(tc => tc.id === selectedClipId);
    if (timelineClip) {
      const libraryClip = library.find(lc => lc.id === timelineClip.libraryClipId);
      if (libraryClip) {
        loadTimelineClip(timelineClip, libraryClip);
        return;
      }
    }

    // Otherwise, it's a library clip
    const libraryClip = library.find(lc => lc.id === selectedClipId);
    if (libraryClip) {
      console.log('[VideoPlayer] Found library clip:', libraryClip.filename, libraryClip.id);
      loadLibraryClip(libraryClip);
    } else {
      console.warn('[VideoPlayer] Library clip not found for ID:', selectedClipId);
      console.log('[VideoPlayer] Available library clips:', library.map(lc => ({ id: lc.id, filename: lc.filename })));
    }
  }, [selectedClipId, library, timeline, loadLibraryClip, loadTimelineClip]);

  /**
   * Effect to load video source when currentVideo changes
   * This runs after the video element is rendered
   */
  useEffect(() => {
    if (!playerState.currentVideo) {
      return;
    }

    // Use requestAnimationFrame to ensure DOM is updated
    const frameId = requestAnimationFrame(() => {
      // Try to get ref, with retry mechanism
      const tryLoadVideo = (attempt = 0) => {
        if (!videoRef.current) {
          if (attempt < 10) {
            // Retry up to 10 times (100ms total)
            setTimeout(() => tryLoadVideo(attempt + 1), 10);
            return;
          }
          console.error('[VideoPlayer] Video ref not available after retries');
          setPlayerState(prev => ({
            ...prev,
            error: 'Failed to initialize video player',
            isLoading: false,
          }));
          return;
        }

        const clip = playerState.currentVideo!;
        const isTimelineClip = playerState.currentTimelineClip !== null;
        const isSequence = isSequenceModeRef.current;

        // Don't stop sequence preview if we're loading for sequence mode
        if (isSequence) {
          // In sequence mode, calculate the correct local time
          const currentSequenceItem = sequence[currentSequenceIndex >= 0 ? currentSequenceIndex : 0];
          if (currentSequenceItem) {
            const localTime = getLocalTimeInClip(currentSequenceItem, sequenceTime);
            const clampedLocalTime = Math.max(
              currentSequenceItem.clip.trimStart,
              Math.min(localTime, currentSequenceItem.clip.trimEnd)
            );

            const encodedPath = encodeURI(clip.path).replace(/#/g, '%23');
            const videoSrc = clip.path.startsWith('/') 
              ? `file://${encodedPath}`
              : `file:///${encodedPath}`;
            
            // Only reload if the video source is different or if seeking is needed
            const currentSrc = videoRef.current.src || '';
            const currentTime = videoRef.current.currentTime || 0;
            const needsReload = !currentSrc.includes(encodeURI(clip.path)) || 
                               Math.abs(currentTime - clampedLocalTime) > 0.5;
            
            if (needsReload) {
              console.log('[VideoPlayer] Loading sequence clip:', clip.filename, 'at time:', clampedLocalTime);
              videoRef.current.src = videoSrc;
              videoRef.current.currentTime = clampedLocalTime;
              videoRef.current.load();

              // Wait for metadata, then start playing if sequence was playing
              const handleCanPlay = () => {
                if (isSequenceModeRef.current && isPlaying && videoRef.current) {
                  console.log('[VideoPlayer] Sequence clip ready, starting playback');
                  videoRef.current.play().catch(err => {
                    // AbortError is expected when video is loading, filter it out
                    if (err.name !== 'AbortError') {
                      console.error('[VideoPlayer] Sequence play error:', err);
                    }
                  });
                  // Mark as not loading once playing
                  setPlayerState(prev => ({ ...prev, isLoading: false }));
                }
                videoRef.current?.removeEventListener('canplay', handleCanPlay);
              };
              videoRef.current.addEventListener('canplay', handleCanPlay);
              
              // Also try playing immediately if metadata is already loaded
              if (videoRef.current.readyState >= 2 && isSequenceModeRef.current && isPlaying) {
                videoRef.current.play().catch(err => {
                  // AbortError is expected when video is loading, filter it out
                  if (err.name !== 'AbortError') {
                    console.error('[VideoPlayer] Sequence play error (immediate):', err);
                  }
                });
                setPlayerState(prev => ({ ...prev, isLoading: false }));
              }
            } else {
              // Same video, just seek if needed (smoother transition)
              if (Math.abs(currentTime - clampedLocalTime) > 0.1) {
                videoRef.current.currentTime = clampedLocalTime;
              }
              
              // Ensure video is playing if it should be
              if (isSequenceModeRef.current && isPlaying && videoRef.current.paused) {
                videoRef.current.play().catch(err => {
                  // AbortError is expected when video is loading, filter it out
                  if (err.name !== 'AbortError') {
                    console.error('[VideoPlayer] Sequence play error (resume):', err);
                  }
                });
              }
              
              // Mark as not loading since we didn't reload
              setPlayerState(prev => ({ ...prev, isLoading: false }));
            }
          }
          return;
        }

        // Stop sequence preview if active (switching to non-sequence mode)
        if (isSequenceModeRef.current) {
          if (videoRef.current) {
            videoRef.current.pause();
          }
          onPlayingChange(false);
          isSequenceModeRef.current = false;
          setCurrentSequenceIndex(-1);
          setSequenceTime(0);
        }

        // Load video using file:// protocol (macOS needs proper encoding)
        const encodedPath = encodeURI(clip.path).replace(/#/g, '%23');
        const videoSrc = clip.path.startsWith('/') 
          ? `file://${encodedPath}` // Already absolute, just add file://
          : `file:///${encodedPath}`; // Add root slash
        
        // Check if video source is already loaded to avoid unnecessary reloads
        const currentSrc = videoRef.current.src || '';
        const needsReload = !currentSrc.includes(encodeURI(clip.path));
        
        // Calculate target time for timeline clips
        let targetVideoTime = 0;
        if (isTimelineClip && playerState.currentTimelineClip) {
          // If we have a sequence time (from clicking on timeline), calculate the correct local time
          if (sequenceTime > 0 && sequence.length > 0 && currentSequenceIndex >= 0) {
            const currentSequenceItem = sequence[currentSequenceIndex];
            if (currentSequenceItem && currentSequenceItem.clip.id === playerState.currentTimelineClip.id) {
              // This clip matches the sequence item, use sequence time to calculate local time
              targetVideoTime = getLocalTimeInClip(currentSequenceItem, sequenceTime);
              targetVideoTime = Math.max(
                currentSequenceItem.clip.trimStart,
                Math.min(targetVideoTime, currentSequenceItem.clip.trimEnd)
              );
            } else {
              // Fallback to trimStart
              targetVideoTime = playerState.currentTimelineClip.trimStart;
            }
          } else {
            // Use trimStart as default
            targetVideoTime = playerState.currentTimelineClip.trimStart;
          }
        }
        
        if (needsReload) {
          console.log('[VideoPlayer] Setting video src:', videoSrc, 'at time:', targetVideoTime);
          videoRef.current.src = videoSrc;
          videoRef.current.currentTime = targetVideoTime;
          
          // Force load only if we changed the source
          videoRef.current.load();
          
          // Mark loading as complete once metadata is loaded
          const handleCanPlayOnce = () => {
            setPlayerState(prev => ({ ...prev, isLoading: false }));
            videoRef.current?.removeEventListener('canplay', handleCanPlayOnce);
          };
          videoRef.current.addEventListener('canplay', handleCanPlayOnce);
          
          // Also check if already ready
          if (videoRef.current.readyState >= 2) {
            setPlayerState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          // Video already loaded, just update time if needed (e.g., after timeline click seek)
          const currentTime = videoRef.current.currentTime || 0;
          // Only seek if difference is significant (avoid micro-adjustments)
          if (Math.abs(currentTime - targetVideoTime) > 0.1) {
            console.log('[VideoPlayer] Seeking to time:', targetVideoTime);
            videoRef.current.currentTime = targetVideoTime;
            setPlayerState(prev => ({ ...prev, isLoading: false }));
          } else {
            // No seek needed, just mark as not loading
            setPlayerState(prev => ({ ...prev, isLoading: false }));
          }
        }
      };

      tryLoadVideo();
    });

    return () => cancelAnimationFrame(frameId);
  }, [playerState.currentVideo, playerState.currentTimelineClip, onPlayingChange, sequence, currentSequenceIndex, sequenceTime]); // Removed isPlaying to prevent reload on play/pause toggle

  /**
   * Track if we just restored from autosave (so we can seek to restored position)
   */
  const wasRestoredRef = useRef(false);
  
  /**
   * Mark that we're restoring (called from App after restore)
   * This is a workaround - we detect restore by checking if playhead jumps significantly
   * on initial load (more than 10 seconds from 0 would indicate a restore)
   */
  useEffect(() => {
    // If playhead is > 10 seconds and we haven't tracked a restore yet, likely a restore
    if (currentPlayheadPosition > 10 && !wasRestoredRef.current && lastPlayheadPositionRef.current === 0) {
      console.log('[VideoPlayer] Detected potential restore, playhead at:', currentPlayheadPosition);
      wasRestoredRef.current = true;
    }
    // Reset restore flag after first significant change
    if (wasRestoredRef.current && lastPlayheadPositionRef.current > 0) {
      // After first sync, reset the flag (restore is done)
      setTimeout(() => {
        wasRestoredRef.current = false;
      }, 1000);
    }
  }, [currentPlayheadPosition]);

  /**
   * Sync video currentTime with external playhead changes (from timeline drag/click)
   * Handles both single clip and sequence preview modes
   */
  useEffect(() => {
    if (!videoRef.current) return;

    // Check if this is a significant seek (likely user interaction, not playback update)
    // Small changes (< 0.5s) are likely from playback, larger changes are user seeks  
    const previousPlayhead = lastPlayheadPositionRef.current;
    const playheadDelta = Math.abs(currentPlayheadPosition - previousPlayhead);
    const now = Date.now();
    const timeSinceLastChange = lastPlayheadChangeTimeRef.current > 0 ? now - lastPlayheadChangeTimeRef.current : 1000;
    
    // Detect user interaction:
    // 1. Large jump (> 0.5s) = click or large drag
    // 2. Rapid updates (< 150ms between changes) = dragging (even small changes during drag)
    // 3. Already detected as dragging = continue treating as drag
    const isUserSeek = playheadDelta > 0.5;
    const isDragging = isUserDraggingRef.current || (timeSinceLastChange < 150 && playheadDelta > 0.01); // Rapid small changes = dragging
    // Update dragging ref - if rapid changes, we're dragging
    isUserDraggingRef.current = timeSinceLastChange < 150 && playheadDelta > 0.01;
    // After 200ms of no changes, clear dragging flag
    if (timeSinceLastChange > 200) {
      isUserDraggingRef.current = false;
    }
    
    // Get current playback mode early (needed for calculations below)
    const currentMode = playerState.playbackMode;
    
    // When timeline has clips and there's any playhead change > 0.1s, treat as user interaction
    // Exception: Don't treat as user interaction if we're in sequence mode playing (automatic playback updates)
    // OR if the change is from video playback updating timeline playhead (handled separately)
    const isPlaybackUpdate = currentMode === 'timeline' && isPlaying && playheadDelta < 0.2;
    const isUserInteraction = isUserSeek || isDragging || 
                             (timeline.length > 0 && playheadDelta > 0.1 && 
                              !isSequenceModeRef.current && !isPlaybackUpdate);
    
    // Update timestamp for next check
    lastPlayheadChangeTimeRef.current = now;
    
    // If this is a restore (significant jump from 0), always seek
    const isRestoreSeek = wasRestoredRef.current && previousPlayhead === 0 && currentPlayheadPosition > 0;
    
    // IMPORTANT: When user clicks/drags timeline playhead, always show timeline preview
    // Even if a library clip is currently selected/playing, timeline interaction takes priority
    // This allows users to preview timeline position while library clip is selected
    if (timeline.length > 0 && isUserInteraction && currentPlayheadPosition >= 0) {
      // Calculate or get sequence to find which clip contains this position
      let seqToUse = sequence;
      if (seqToUse.length === 0) {
        seqToUse = calculateSequence(timeline, library);
        setSequence(seqToUse);
      }
      
      if (seqToUse.length > 0) {
        const clipIndex = findCurrentClipInSequence(seqToUse, currentPlayheadPosition);
        if (clipIndex >= 0 && clipIndex < seqToUse.length) {
          const targetItem = seqToUse[clipIndex];
          const localTime = getLocalTimeInClip(targetItem, currentPlayheadPosition);
          const clampedLocalTime = Math.max(
            targetItem.clip.trimStart,
            Math.min(localTime, targetItem.clip.trimEnd)
          );
          
          // Load the clip at this position for preview
          // Check if we need to switch clips (avoid unnecessary reloads during drag)
          const needsClipSwitch = !playerState.currentTimelineClip || 
                                  playerState.currentTimelineClip.id !== targetItem.clip.id;
          
          // If dragging within the same clip, just seek (optimized for smooth dragging)
          if (isDragging && !needsClipSwitch && videoRef.current && playerState.currentTimelineClip && 
              playerState.playbackMode === 'timeline') {
            // We're dragging within the same clip - just seek to the correct time
            isExternalSeekRef.current = true;
            videoRef.current.currentTime = clampedLocalTime;
            setPlayerState(prev => ({ ...prev, currentTime: currentPlayheadPosition }));
            setTimeout(() => {
              isExternalSeekRef.current = false;
            }, 50);
            lastPlayheadPositionRef.current = currentPlayheadPosition;
            return;
          }
          
          // If we get here, we need to switch clips (different clip or initial load)
          // OR we're coming from library mode and need to load timeline clip
          
          // Load the correct clip at this position
          console.log('[VideoPlayer] Timeline click/drag - loading clip', clipIndex, 'at time', clampedLocalTime, isDragging ? '(dragging)' : '(click)');
          setCurrentSequenceIndex(clipIndex);
          setSequenceTime(currentPlayheadPosition);
          setPlayerState(prev => ({
            ...prev,
            currentVideo: targetItem.libraryClip,
            currentTimelineClip: targetItem.clip,
            playbackMode: 'timeline',
            duration: targetItem.endTime - targetItem.startTime,
            currentTime: currentPlayheadPosition,
            isLoading: true,
          }));
          
          // Select the timeline clip so spacebar works correctly (deselects any library clip)
          if (onSelectClip && !isDragging) {
            // Only change selection on click, not during drag (avoid rapid state changes)
            onSelectClip(targetItem.clip.id);
          }
          
          // If playing (library clip was playing), pause it since we're now showing timeline preview
          if (isPlaying && !isExternalSeekRef.current && !isDragging) {
            // Don't pause during drag, only on initial click
            videoRef.current.pause();
            onPlayingChange(false);
            setPlayerState(prev => ({ ...prev, isPlaying: false }));
          }
          
          // Video source will be updated by the effect watching currentVideo
          lastPlayheadPositionRef.current = currentPlayheadPosition;
          return;
        }
      }
    }

    // If in library mode and user hasn't clicked timeline, ignore timeline playhead changes
    // Library clips are independent - don't sync timeline playhead to them during playback
    if (currentMode === 'library' && !isUserSeek) {
      // Library clips are independent - don't sync timeline playhead to them
      // Just update the ref so we don't trigger false positives later
      lastPlayheadPositionRef.current = currentPlayheadPosition;
      return;
    }

    // If it's a user seek (clicking on timeline) and we're playing, pause playback
    // Don't pause if this is from video playback (handled by handleTimeUpdate)
    // Only for timeline/sequence modes, not library mode (library mode handled above)
    if (isUserSeek && isPlaying && !isExternalSeekRef.current && currentMode !== 'library') {
      console.log('[VideoPlayer] User seek detected (delta:', playheadDelta.toFixed(2), 's), pausing playback at:', currentPlayheadPosition);
      videoRef.current.pause();
      onPlayingChange(false);
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    }

    // Handle sequence mode playhead changes
    if (isSequenceModeRef.current && sequence.length > 0) {
      // Find which clip corresponds to the new playhead position
      const newClipIndex = findCurrentClipInSequence(sequence, currentPlayheadPosition);
      
      if (newClipIndex >= 0 && newClipIndex < sequence.length) {
        const targetItem = sequence[newClipIndex];
        const localTime = getLocalTimeInClip(targetItem, currentPlayheadPosition);
        const clampedLocalTime = Math.max(
          targetItem.clip.trimStart,
          Math.min(localTime, targetItem.clip.trimEnd)
        );

        // Check if we need to switch clips
        if (newClipIndex !== currentSequenceIndex) {
          console.log('[VideoPlayer] Sequence seek - switching to clip', newClipIndex, 'at time', clampedLocalTime);
          
          setCurrentSequenceIndex(newClipIndex);
          setSequenceTime(currentPlayheadPosition);
          setPlayerState(prev => ({
            ...prev,
            currentVideo: targetItem.libraryClip,
            currentTimelineClip: targetItem.clip,
            duration: targetItem.endTime - targetItem.startTime,
            currentTime: currentPlayheadPosition,
            isLoading: true,
          }));
          
          // Video source will be updated by the effect watching currentVideo
          // Don't auto-resume - user clicked to seek, let them press spacebar to resume
        } else {
          // Same clip, just seek
          const currentItem = sequence[currentSequenceIndex];
          if (currentItem && videoRef.current) {
            const currentVideoTime = videoRef.current.currentTime || 0;
            const diff = Math.abs(clampedLocalTime - currentVideoTime);
            
            if (diff > 0.1) {
              console.log('[VideoPlayer] Sequence seek - same clip, seeking to', clampedLocalTime);
              isExternalSeekRef.current = true;
              videoRef.current.currentTime = clampedLocalTime;
              setSequenceTime(currentPlayheadPosition);
              
              // Don't auto-resume - user clicked to seek, let them press spacebar to resume
              
              setTimeout(() => {
                isExternalSeekRef.current = false;
              }, 100);
            }
          }
        }
      }
      // Update last playhead position after handling sequence mode
      lastPlayheadPositionRef.current = currentPlayheadPosition;
      return;
    }

    // Handle single clip mode (library or timeline clip)
    if (isSequenceModeRef.current) {
      lastPlayheadPositionRef.current = currentPlayheadPosition;
      return;
    }

    // Library mode with no user seek already handled at top (non-user seeks ignored)
    // From here on, we only handle timeline/sequence modes or user seeks

    // Only sync for timeline clips (not library clips) that are already loaded
    // BUT only if user hasn't interacted (if user interacted, we already handled it above)
    // This handles playback updates during timeline clip playback (not user seeks)
    if (!isUserInteraction && currentMode === 'timeline' && playerState.currentTimelineClip) {
      // This is a playback update, not user interaction
      // Check if the difference is significant (avoid micro-adjustments)
      const trimStart = playerState.currentTimelineClip.trimStart;
      const expectedVideoTime = trimStart + currentPlayheadPosition;
      const videoTime = videoRef.current.currentTime || 0;
      const diff = Math.abs(expectedVideoTime - videoTime);

      // Only sync if difference is > 0.1 seconds and it's not from external seek
      if (diff > 0.1 && !isExternalSeekRef.current) {
        const clampedTime = Math.max(trimStart, Math.min(expectedVideoTime, playerState.currentTimelineClip.trimEnd));
        
        console.log('[VideoPlayer] Syncing playhead to video (playback update):', {
          playheadPosition: currentPlayheadPosition,
          videoTime: clampedTime,
          previousPlayhead: previousPlayhead
        });
        
        isExternalSeekRef.current = true;
        videoRef.current.currentTime = clampedTime;
        
        // Reset flag after a short delay
        setTimeout(() => {
          isExternalSeekRef.current = false;
        }, 100);
      }
    }
    
    // Update last playhead position after handling single clip mode
    lastPlayheadPositionRef.current = currentPlayheadPosition;
  }, [currentPlayheadPosition, playerState, isPlaying, sequence, currentSequenceIndex, timeline, library, onPlayheadChange, onSelectClip]);

  /**
   * Handle video metadata loaded
   */
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;

    const duration = videoRef.current.duration || 0;
    console.log('[VideoPlayer] Video metadata loaded, duration:', duration);

    setPlayerState(prev => {
      let finalDuration = duration;

      // For sequence mode, duration is total sequence duration
      if (isSequenceModeRef.current) {
        finalDuration = calculateSequenceDuration(sequence);
      } 
      // For timeline clips, duration is trimmed duration
      else if (prev.currentTimelineClip) {
        finalDuration = prev.currentTimelineClip.trimEnd - prev.currentTimelineClip.trimStart;
      }

      // If this is a restore and we have a playhead position to restore to, seek to it
      // This ensures video seeks to restored position after metadata loads
      if (wasRestoredRef.current && currentPlayheadPosition > 0) {
        console.log('[VideoPlayer] Metadata loaded during restore, seeking to:', currentPlayheadPosition);
        // Seek will be handled by the useEffect watching currentPlayheadPosition
        // But we can also do it here immediately since metadata is ready
        if (prev.currentTimelineClip) {
          const trimStart = prev.currentTimelineClip.trimStart;
          const videoTime = trimStart + currentPlayheadPosition;
          const clampedTime = Math.max(trimStart, Math.min(videoTime, prev.currentTimelineClip.trimEnd));
          videoRef.current.currentTime = clampedTime;
        }
      }

      return {
        ...prev,
        duration: finalDuration,
        isLoading: false,
        // Don't reset currentTime to 0 if in sequence mode or if restoring
        currentTime: isSequenceModeRef.current ? sequenceTime : (wasRestoredRef.current ? currentPlayheadPosition : 0),
      };
    });
  };

  /**
   * Sync playhead position with video's actual currentTime
   * Called when pausing to ensure playhead matches where video actually stopped
   * Uses refs to get latest state values
   */
  const syncPlayheadOnPause = () => {
    if (!videoRef.current) return;

    const videoCurrentTime = videoRef.current.currentTime || 0;
    const currentSequence = sequenceRef.current;
    const currentSeqIndex = currentSequenceIndexRef.current;
    const currentPlayerState = playerStateRef.current;

    // For sequence mode, convert video time to sequence time
    if (isSequenceModeRef.current && currentSequence.length > 0 && currentSeqIndex >= 0) {
      const currentSequenceItem = currentSequence[currentSeqIndex];
      if (currentSequenceItem) {
        const timeWithinClip = videoCurrentTime - currentSequenceItem.clip.trimStart;
        const newSequenceTime = currentSequenceItem.startTime + timeWithinClip;
        setSequenceTime(newSequenceTime);
        onPlayheadChange(newSequenceTime);
        return;
      }
    }

    // For single timeline clip, convert to timeline time
    if (currentPlayerState.currentTimelineClip && !isSequenceModeRef.current) {
      const clip = currentPlayerState.currentTimelineClip;
      const timelineTime = videoCurrentTime - clip.trimStart;
      onPlayheadChange(Math.max(0, timelineTime));
      return;
    }

    // For library clips, don't update timeline playhead (they're independent)
  };

  /**
   * Handle video time update (during playback)
   */
  const handleTimeUpdate = () => {
    if (!videoRef.current || isExternalSeekRef.current) return;

    const videoCurrentTime = videoRef.current.currentTime || 0;
    let displayTime = videoCurrentTime;

    // For sequence mode, handle clip transitions and time tracking FIRST
    // This must run before the single clip trim-end check to prevent premature pausing
    if (isSequenceModeRef.current && sequence.length > 0 && currentSequenceIndex >= 0) {
      // Calculate sequence time based on current clip and video position
      const currentSequenceItem = sequence[currentSequenceIndex];
      if (currentSequenceItem) {
        // Calculate how much time has elapsed within the trimmed clip
        // videoCurrentTime is the actual time in the source video file
        // We need to see if we've passed the trimEnd point
        if (videoCurrentTime >= currentSequenceItem.clip.trimEnd) {
          // Current clip ended, transition to next
          const nextIndex = currentSequenceIndex + 1;
          if (nextIndex < sequence.length) {
            const nextItem = sequence[nextIndex];
            console.log('[VideoPlayer] Sequence transition: clip', currentSequenceIndex, '->', nextIndex);
            
            // Pause current video before switching to prevent flashing
            if (videoRef.current) {
              videoRef.current.pause();
            }
            
            setCurrentSequenceIndex(nextIndex);
            setSequenceTime(nextItem.startTime);
            setPlayerState(prev => ({
              ...prev,
              currentVideo: nextItem.libraryClip,
              currentTimelineClip: nextItem.clip,
              duration: nextItem.endTime - nextItem.startTime,
              isLoading: true,
            }));
            
            // Update playhead immediately
            onPlayheadChange(nextItem.startTime);
            
            // Video source will be updated by the effect watching currentVideo
            // Playback will continue automatically (handled in canplay event)
            return; // Skip rest of time update handling
          } else {
            // Sequence ended - sync playhead to final position before pausing
            const finalSequenceTime = currentSequenceItem.endTime;
            console.log('[VideoPlayer] Sequence ended at:', finalSequenceTime);
            if (videoRef.current) {
              videoRef.current.pause();
            }
            // Sync playhead to end of sequence
            setSequenceTime(finalSequenceTime);
            onPlayheadChange(finalSequenceTime);
            onPlayingChange(false);
            setPlayerState(prev => ({ ...prev, isPlaying: false }));
            isSequenceModeRef.current = false;
            setCurrentSequenceIndex(-1);
            return; // Skip rest of time update handling
          }
        }
        
        // Still within current clip - update sequence time
        const timeWithinClip = videoCurrentTime - currentSequenceItem.clip.trimStart;
        const newSequenceTime = currentSequenceItem.startTime + timeWithinClip;
        setSequenceTime(newSequenceTime);
        
        // Update playhead to reflect sequence time
        onPlayheadChange(newSequenceTime);
        
        displayTime = newSequenceTime;
        
        // Throttle playhead updates (max 60fps)
        const now = Date.now();
        if (now - lastPlayheadUpdateTimeRef.current > 16) {
          lastPlayheadUpdateTimeRef.current = now;
        }

        setPlayerState(prev => ({
          ...prev,
          currentTime: displayTime,
        }));
        
        return; // Skip single clip handling when in sequence mode
      }
    }

    // For single timeline clips (not in sequence mode), convert to time within trim range
    if (playerState.currentTimelineClip && !isSequenceModeRef.current) {
      const clip = playerState.currentTimelineClip;
      displayTime = videoCurrentTime - clip.trimStart;

      // Check if we've reached trim end (only for single clip playback, not sequence)
      if (videoCurrentTime >= clip.trimEnd) {
        videoRef.current.pause();
        videoRef.current.currentTime = clip.trimEnd;
        // Sync playhead to end of clip
        const timelineTime = clip.trimEnd - clip.trimStart;
        onPlayheadChange(timelineTime);
        onPlayingChange(false);
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
      }
    }

    // For library clips (not in sequence or timeline mode), use video time directly
    // BUT don't update timeline playhead - library clip playback is independent
    if (!isSequenceModeRef.current && !playerState.currentTimelineClip) {
      displayTime = videoCurrentTime;
      // Do NOT call onPlayheadChange for library clips - they're independent of timeline
      // Only update internal state for display in PlayerControls
    } else {
      // For timeline clips (single or sequence), update timeline playhead
      // Throttle playhead updates (max 60fps)
      const now = Date.now();
      if (now - lastPlayheadUpdateTimeRef.current > 16) {
        onPlayheadChange(displayTime);
        lastPlayheadUpdateTimeRef.current = now;
      }
    }

    setPlayerState(prev => ({
      ...prev,
      currentTime: displayTime,
    }));
  };

  /**
   * Handle video ended
   */
  const handleEnded = () => {
    // In sequence mode, transitions are handled by handleTimeUpdate
    // The ended event might fire briefly during transitions, so ignore it
    if (isSequenceModeRef.current) {
      return;
    }

    // For single clips, stop playback and reset to start
    onPlayingChange(false);
    setPlayerState(prev => ({ ...prev, isPlaying: false }));

    if (videoRef.current && playerState.currentTimelineClip) {
      videoRef.current.currentTime = playerState.currentTimelineClip.trimStart;
    } else if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  /**
   * Handle video error
   */
  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    console.error('[VideoPlayer] Video error:', video.error);
    
    let errorMessage = 'Could not load video';
    if (video.error) {
      if (video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        errorMessage = 'Video format not supported';
      } else if (video.error.code === MediaError.MEDIA_ERR_NETWORK) {
        errorMessage = 'Network error loading video';
      } else if (video.error.code === MediaError.MEDIA_ERR_DECODE) {
        errorMessage = 'Error decoding video';
      } else if (video.error.code === MediaError.MEDIA_ERR_ABORTED) {
        errorMessage = 'Video loading aborted';
      }
    }
    
    setPlayerState(prev => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
    }));
    onPlayingChange(false);
  };

  /**
   * Handle video load start
   */
  const handleLoadStart = () => {
    setPlayerState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
  };

  /**
   * Toggle play/pause
   */
  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      // Sync playhead position to match where video actually stopped
      syncPlayheadOnPause();
      onPlayingChange(false);
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
    } else {
      videoRef.current.play().catch(err => {
        // AbortError is expected when video is loading, filter it out
        if (err.name !== 'AbortError') {
          console.error('[VideoPlayer] Play error:', err);
          setPlayerState(prev => ({
            ...prev,
            error: 'Failed to play video',
          }));
        }
      });
      onPlayingChange(true);
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  /**
   * Seek to time
   */
  const handleSeek = (time: number) => {
    if (!videoRef.current) return;

    const clampedTime = Math.max(0, Math.min(time, playerState.duration));

    if (playerState.currentTimelineClip) {
      // For timeline clips, convert to video time
      const videoTime = playerState.currentTimelineClip.trimStart + clampedTime;
      const finalTime = Math.max(
        playerState.currentTimelineClip.trimStart,
        Math.min(videoTime, playerState.currentTimelineClip.trimEnd)
      );
      videoRef.current.currentTime = finalTime;
      onPlayheadChange(clampedTime);
    } else {
      // For library clips, seek directly but DON'T update timeline playhead
      // Library clips are independent - timeline playhead should not move when seeking library clip
      videoRef.current.currentTime = clampedTime;
      // Do NOT call onPlayheadChange for library clips - they're independent
    }

    setPlayerState(prev => ({
      ...prev,
      currentTime: clampedTime,
    }));
  };

  /**
   * Start sequence preview
   */
  const handleSequencePreview = useCallback(() => {
    // Recalculate sequence if empty (may happen if ref is stale)
    let seqToUse = sequence;
    if (seqToUse.length === 0 && timeline.length > 0) {
      console.log('[VideoPlayer] Sequence empty, recalculating from timeline');
      seqToUse = calculateSequence(timeline, library);
      // Update sequence state for future use
      setSequence(seqToUse);
    }
    
    if (seqToUse.length === 0) {
      console.warn('[VideoPlayer] Cannot preview sequence - timeline is empty or clips missing library references');
      return;
    }

    // Use recalculated sequence
    const finalSequence = seqToUse;
    
    // Start from current playhead position (or beginning if at 0)
    const startSequenceTime = Math.max(0, currentPlayheadPosition);
    
    // Find which clip corresponds to the current playhead position
    let startClipIndex = findCurrentClipInSequence(finalSequence, startSequenceTime);
    if (startClipIndex < 0) {
      startClipIndex = 0; // Default to first clip if not found
    }

    const startItem = finalSequence[startClipIndex];

    isSequenceModeRef.current = true;
    setCurrentSequenceIndex(startClipIndex);
    setSequenceTime(startSequenceTime);

    console.log('[VideoPlayer] Starting sequence preview from time:', startSequenceTime, 'clip index:', startClipIndex);

    // Set state first to trigger video element render
    setPlayerState(prev => ({
      ...prev,
      currentVideo: startItem.libraryClip,
      currentTimelineClip: startItem.clip,
      playbackMode: 'sequence',
      duration: calculateSequenceDuration(finalSequence),
      currentTime: startSequenceTime,
      isLoading: true,
      error: null,
    }));

    // Will auto-play when video loads (handled in canplay event)
    onPlayingChange(true);
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
  }, [sequence, currentPlayheadPosition, onPlayingChange, library, timeline]);

  /**
   * Keyboard shortcuts (Spacebar for play/pause)
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input is focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        
        // Use refs to get latest state without stale closures
        const currentIsPlaying = isPlayingRef.current;
        const currentPlayerState = playerStateRef.current;
        
        console.log('[VideoPlayer] Spacebar pressed, isPlaying:', currentIsPlaying, 'hasVideo:', !!videoRef.current, 'currentVideo:', !!currentPlayerState.currentVideo, 'timelineLength:', timeline.length);
        
        if (currentIsPlaying) {
          // If playing, we need videoRef to pause
          if (!videoRef.current) {
            console.log('[VideoPlayer] No video element available for pause');
            return;
          }
          console.log('[VideoPlayer] Pausing via spacebar at playhead:', currentPlayheadPositionRef.current);
          // Pause first, then sync playhead to actual video position
          videoRef.current.pause();
          // Sync playhead position to match where video actually stopped
          syncPlayheadOnPause();
          onPlayingChange(false);
          setPlayerState(prev => ({ ...prev, isPlaying: false }));
          // Keep sequence mode active so playhead position is preserved
          // User can resume from where they paused
        } else {
          // Check if we're in library mode (library clip selected, not timeline clip)
          const isLibraryMode = currentPlayerState.currentVideo && 
                                !currentPlayerState.currentTimelineClip && 
                                !isSequenceModeRef.current;
          
          // PRIORITY 0: If a timeline clip is currently loaded (user clicked on playhead), start sequence preview
          // This takes highest priority - if user clicked on timeline, they want to play from there
          if (currentPlayerState.currentTimelineClip && timeline.length > 0 && !isSequenceModeRef.current) {
            const currentSequence = sequenceRef.current;
            let seqToUse = currentSequence;
            if (seqToUse.length === 0) {
              seqToUse = calculateSequence(timeline, library);
            }
            
            if (seqToUse.length > 0) {
              console.log('[VideoPlayer] Starting sequence preview via spacebar (timeline clip loaded from playhead click)');
              handleSequencePreview();
              return;
            }
          }
          
          // PRIORITY 1: If we have timeline clips but sequence mode is not active, start sequence preview
          // This is the default behavior: timeline clips ready → spacebar starts sequence
          // Only if we're NOT in library mode (library mode takes priority)
          const currentSequence = sequenceRef.current;
          console.log('[VideoPlayer] Debug - timeline:', timeline.length, 'sequence:', currentSequence.length, 'isSequenceMode:', isSequenceModeRef.current, 'isLibraryMode:', isLibraryMode);
          
          // If timeline has clips, try to start sequence preview (even if sequence ref is stale)
          // Calculate sequence on-the-fly if needed
          if (timeline.length > 0 && !isSequenceModeRef.current && !isLibraryMode) {
            // Ensure sequence is calculated (may be empty due to stale ref)
            let seqToUse = currentSequence;
            if (seqToUse.length === 0) {
              // Calculate sequence synchronously for this check
              seqToUse = calculateSequence(timeline, library);
            }
            
            if (seqToUse.length > 0) {
              console.log('[VideoPlayer] Starting sequence preview via spacebar (timeline has clips, no library clip selected)');
              handleSequencePreview();
              return;
            } else {
              console.log('[VideoPlayer] Cannot start sequence - timeline clips missing library references');
            }
          }
          
          // PRIORITY 2: If we're in library mode, just play/pause the library clip, don't start sequence
          if (isLibraryMode) {
            // Need videoRef to play
            if (!videoRef.current) {
              console.log('[VideoPlayer] No video element available for library clip playback');
              return;
            }
            console.log('[VideoPlayer] Playing library clip via spacebar from beginning');
            // Library clip should always start from beginning, not timeline position
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(err => {
              // AbortError is expected when video is loading, filter it out
              if (err.name !== 'AbortError') {
                console.error('[VideoPlayer] Play error:', err);
              }
            });
            onPlayingChange(true);
            setPlayerState(prev => ({ ...prev, isPlaying: true, currentTime: 0 }));
            return;
          }
          
          // PRIORITY 3: For all other cases, need videoRef
          // If we reach here and no video element, cannot proceed
          if (!videoRef.current) {
            console.log('[VideoPlayer] No video element available, cannot play');
            return;
          }
          
          // If sequence mode is active but paused, resume from current playhead
          if (isSequenceModeRef.current && sequenceRef.current.length > 0) {
            const playheadPos = currentPlayheadPositionRef.current;
            const currentSequence = sequenceRef.current;
            const clipIndex = findCurrentClipInSequence(currentSequence, playheadPos);
            if (clipIndex >= 0 && clipIndex < currentSequence.length) {
              const targetItem = currentSequence[clipIndex];
              const localTime = getLocalTimeInClip(targetItem, playheadPos);
              const clampedLocalTime = Math.max(
                targetItem.clip.trimStart,
                Math.min(localTime, targetItem.clip.trimEnd)
              );
              
              // Switch to correct clip if needed
              if (clipIndex !== currentSequenceIndexRef.current) {
                setCurrentSequenceIndex(clipIndex);
                setSequenceTime(playheadPos);
                setPlayerState(prev => ({
                  ...prev,
                  currentVideo: targetItem.libraryClip,
                  currentTimelineClip: targetItem.clip,
                  isLoading: true,
                }));
              }
              
              // Seek to correct position and resume playback
              videoRef.current.currentTime = clampedLocalTime;
              setSequenceTime(playheadPos);
              onPlayheadChange(playheadPos);
              videoRef.current.play().catch(err => {
                // AbortError is expected when video is loading, filter it out
                if (err.name !== 'AbortError') {
                  console.error('[VideoPlayer] Resume play error:', err);
                }
              });
              onPlayingChange(true);
              setPlayerState(prev => ({ ...prev, isPlaying: true }));
              return;
            }
          }
          
          // Only allow play/pause if we have a video loaded (for single clip playback)
          if (!currentPlayerState.currentVideo) {
            console.log('[VideoPlayer] No video loaded, ignoring spacebar');
            return;
          }
          
          console.log('[VideoPlayer] Playing via spacebar at playhead:', currentPlayheadPositionRef.current);
          
          // Sync video position with playhead before playing
          const playheadPos = currentPlayheadPositionRef.current;
          
          if (isSequenceModeRef.current && sequenceRef.current.length > 0) {
            // In sequence mode, find which clip corresponds to playhead and seek to it
            const currentSequence = sequenceRef.current;
            const clipIndex = findCurrentClipInSequence(currentSequence, playheadPos);
            if (clipIndex >= 0 && clipIndex < currentSequence.length) {
              const targetItem = currentSequence[clipIndex];
              const localTime = getLocalTimeInClip(targetItem, playheadPos);
              const clampedLocalTime = Math.max(
                targetItem.clip.trimStart,
                Math.min(localTime, targetItem.clip.trimEnd)
              );
              
              // Switch to correct clip if needed
              if (clipIndex !== currentSequenceIndexRef.current) {
                setCurrentSequenceIndex(clipIndex);
                setSequenceTime(playheadPos);
                setPlayerState(prev => ({
                  ...prev,
                  currentVideo: targetItem.libraryClip,
                  currentTimelineClip: targetItem.clip,
                  isLoading: true,
                }));
              }
              
              // Seek to correct position
              videoRef.current.currentTime = clampedLocalTime;
              setSequenceTime(playheadPos);
              onPlayheadChange(playheadPos);
            }
          } else if (currentPlayerState.currentTimelineClip) {
            // Single timeline clip - convert playhead to video time
            const clip = currentPlayerState.currentTimelineClip;
            const videoTime = clip.trimStart + playheadPos;
            const clampedTime = Math.max(clip.trimStart, Math.min(videoTime, clip.trimEnd));
            videoRef.current.currentTime = clampedTime;
            onPlayheadChange(playheadPos);
          } else if (currentPlayerState.currentVideo) {
            // Library clip - playhead is directly the video time
            videoRef.current.currentTime = Math.max(0, Math.min(playheadPos, videoRef.current.duration || Infinity));
            onPlayheadChange(playheadPos);
          }
          
          // Start playback
          videoRef.current.play().catch(err => {
            // AbortError is expected when video is loading, filter it out
            if (err.name !== 'AbortError') {
              console.error('[VideoPlayer] Play error:', err);
              setPlayerState(prev => ({
                ...prev,
                error: 'Failed to play video',
              }));
            }
          });
          onPlayingChange(true);
          setPlayerState(prev => ({ ...prev, isPlaying: true }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to catch early
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onPlayingChange, timeline, handleSequencePreview]); // Include timeline and handleSequencePreview

  /**
   * Keep refs in sync with state for keyboard handler
   */
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playerStateRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    currentPlayheadPositionRef.current = currentPlayheadPosition;
  }, [currentPlayheadPosition]);

  useEffect(() => {
    sequenceRef.current = sequence;
  }, [sequence]);

  useEffect(() => {
    currentSequenceIndexRef.current = currentSequenceIndex;
  }, [currentSequenceIndex]);

  /**
   * Sync isPlaying state with video element
   * Waits for video to be ready before playing to avoid AbortError
   */
  useEffect(() => {
    if (!videoRef.current) return;

    if (isPlaying && videoRef.current.paused) {
      // Check if video has enough data loaded before playing
      // readyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
      if (videoRef.current.readyState >= 2) {
        // Video has metadata and current data, safe to play
        videoRef.current.play().catch(err => {
          // AbortError is expected when video is loading, filter it out
          if (err.name !== 'AbortError') {
            console.error('[VideoPlayer] Play error:', err);
          }
        });
      } else {
        // Video not ready yet, wait for canplay event
        const handleCanPlay = () => {
          if (videoRef.current && isPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.error('[VideoPlayer] Play error (after canplay):', err);
              }
            });
          }
          videoRef.current?.removeEventListener('canplay', handleCanPlay);
        };
        videoRef.current.addEventListener('canplay', handleCanPlay);
        
        // Cleanup listener if component unmounts or isPlaying changes
        return () => {
          videoRef.current?.removeEventListener('canplay', handleCanPlay);
        };
      }
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  return (
    <div className="preview-panel">
      {/* Sequence Preview Button */}
      <div className="sequence-preview-container">
        <SequencePreviewButton
          isEmpty={timeline.length === 0}
          onClick={handleSequencePreview}
        />
      </div>

      {/* Video container with 16:9 aspect ratio */}
      <div className="video-container">
        {playerState.error ? (
          <div className="video-error">
            <p>{playerState.error}</p>
          </div>
        ) : !playerState.currentVideo ? (
          <div className="video-empty">
            <div className="video-icon">▶</div>
            <p>No clip selected</p>
          </div>
        ) : (
          <>
            {/* Always render video element when currentVideo exists (so ref is available) */}
            <video
              ref={videoRef}
              className="video-element"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onError={handleError}
              onLoadStart={handleLoadStart}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                opacity: playerState.isLoading ? 0 : 1,
              }}
            />
            {/* Show loading overlay when loading */}
            {playerState.isLoading && (
              <div className="video-loading-overlay">
                <div className="spinner"></div>
                <p>Loading video...</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Player Controls */}
      <PlayerControls
        isPlaying={isPlaying}
        currentTime={playerState.currentTime}
        duration={playerState.duration}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        disabled={!playerState.currentVideo}
      />
    </div>
  );
};

export default VideoPlayer;
