/**
 * Root React component for ollo video editor
 * 
 * Implements three-panel layout:
 * - Library (left, 20% width): Video clip library
 * - Preview (center, ~40% width): Video player/preview
 * - Timeline (bottom, 30% height): Timeline editing interface
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import Library from './components/Library';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import TimelineZoomControls from './components/TimelineZoomControls';
import RecordScreenDialog from './components/RecordScreenDialog';
import RecordingIndicator from './components/RecordingIndicator';
import RecordingPermissionDialog from './components/RecordingPermissionDialog';
import WebcamRecordingModal from './components/WebcamRecordingModal';
import RecordingTypeModal from './components/RecordingTypeModal';
import PiPRecordingModal from './components/PiPRecordingModal';
import { VideoClip, TimelineClip } from './types/video';
import {
  addClipToTimelineMagnetic,
  reorderTimelineClipMagnetic,
  removeClipFromTimelineMagnetic,
  splitClipAtPlayheadMagnetic,
  trimClipMagnetic,
  migrateToMagneticTimeline,
  validateGaplessInvariant,
} from './utils/magneticTimelineOperations';
import { TimelineDoc, createEmptyTimelineDoc } from './types/timeline';
import { migrateToMultitrack, extractMainTrackClips, needsMultitrackMigration } from './utils/multitrackMigration';
import {
  addClipToMainTrackMagnetic,
  removeClipFromMainTrackMagnetic,
  reorderClipInMainTrackMagnetic,
  trimClipInMainTrackMagnetic,
  splitClipInMainTrackMagnetic,
} from './utils/multitrackMagneticOperations';
import { useAutoSave } from './hooks/useAutoSave';
import { useSessionRestore } from './hooks/useSessionRestore';
import { useFileImport } from './hooks/useFileImport';
import { serializeProjectState } from './utils/projectStateUtils';

// Simple UUID v4 generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  // Library state
  const [library, setLibrary] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);

  // File import hook (for toolbar)
  const { handleFileImport: importFiles } = useFileImport();

  // Timeline state
  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [timelineDoc, setTimelineDoc] = useState<TimelineDoc | undefined>(undefined);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);
  const [timelineScrollPosition, setTimelineScrollPosition] = useState<number>(0);
  const [currentPlayheadPosition, setCurrentPlayheadPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isExporting] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  
  // Initialize timelineDoc from timeline on mount (one-time migration)
  useEffect(() => {
    if (timeline.length > 0 && !timelineDoc) {
      const doc = migrateToMultitrack(timeline);
      setTimelineDoc(doc);
    } else if (timeline.length === 0 && timelineDoc && extractMainTrackClips(timelineDoc).length > 0) {
      // Clear timelineDoc if timeline becomes empty
      setTimelineDoc(createEmptyTimelineDoc());
    }
  }, []); // Only run on mount
  
  // Sync timeline array from timelineDoc main track (for backward compatibility)
  useEffect(() => {
    if (timelineDoc) {
      const mainTrackClips = extractMainTrackClips(timelineDoc);
      // Only update if arrays have different lengths or clip IDs (avoid unnecessary updates)
      const clipsChanged = 
        mainTrackClips.length !== timeline.length ||
        mainTrackClips.some((clip, i) => timeline[i]?.id !== clip.id) ||
        mainTrackClips.some((clip, i) => {
          const oldClip = timeline[i];
          return !oldClip || 
            oldClip.trimStart !== clip.trimStart || 
            oldClip.trimEnd !== clip.trimEnd ||
            oldClip.start !== clip.start;
        });
      
      if (clipsChanged) {
        setTimeline(mainTrackClips);
      }
    }
  }, [timelineDoc]); // Update when timelineDoc changes
  
  // Refs for click-outside detection
  const timelineRef = useRef<HTMLDivElement>(null);
  const selectedClipIdRef = useRef<string | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  
  // Split state

  // Recording state
  const [showRecordDialog, setShowRecordDialog] = useState<boolean>(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState<boolean>(false);
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState<number>(0);
  const [recordingAudioLevel] = useState<number>(0);
  const [isProcessingRecording, setIsProcessingRecording] = useState<boolean>(false);
  const [recordingScreenSourceId, setRecordingScreenSourceId] = useState<string | null>(null);
  const [recordingAudioEnabled, setRecordingAudioEnabled] = useState<boolean>(false);
  const [recordingAudioDeviceId, setRecordingAudioDeviceId] = useState<string | null>(null);
  const [recordingOutputPath, setRecordingOutputPath] = useState<string | null>(null);
  
  // Webcam recording state
  const [showWebcamModal, setShowWebcamModal] = useState<boolean>(false);
  
  // PiP recording state
  const [showPiPModal, setShowPiPModal] = useState<boolean>(false);
  
  // Unified recording modal state
  const [showRecordingTypeModal, setShowRecordingTypeModal] = useState<boolean>(false);
  

  /**
   * Handle completion of video import
   * Adds newly imported clips to library
   */
  const handleImportComplete = (newClips: VideoClip[]) => {
    setLibrary(prev => [...newClips, ...prev]); // Add new clips at top (most recent first)
    console.log(`[App] Imported ${newClips.length} clip(s). Library now has ${library.length + newClips.length} clips.`);
  };

  /**
   * Handle clip selection in Library
   * Will be used for preview in future PRs
   */
  const handleSelectClip = (clip: VideoClip) => {
    setSelectedClipId(clip.id);
    console.log(`[App] Selected clip: ${clip.filename}`);
  };

  /**
   * Handle adding clip from Library to Timeline (with ripple insert)
   */
  const handleAddClipToTimeline = (libraryClipId: string, insertionIndex?: number) => {
    setTimelineDoc(prevDoc => {
      const updatedDoc = addClipToMainTrackMagnetic(
        libraryClipId,
        prevDoc,
        timeline,
        library,
        insertionIndex,
        'ripple'
      );
      
      console.log(`[App] Added clip ${libraryClipId} to main track at index ${insertionIndex ?? timeline.length}`);
      return updatedDoc;
    });
  };

  /**
   * Handle reordering clip on timeline (with ripple move)
   */
  const handleReorderClip = (dragIndex: number, hoverIndex: number) => {
    setTimelineDoc(prevDoc => {
      const updatedDoc = reorderClipInMainTrackMagnetic(dragIndex, hoverIndex, prevDoc, timeline);
      console.log(`[App] Reordered clip from index ${dragIndex} to ${hoverIndex}`);
      return updatedDoc;
    });
  };

  /**
   * Handle clip selection on timeline
   */
  const handleTimelineSelectClip = useCallback((clipId: string | null) => {
    console.log(`[App] handleTimelineSelectClip called: clipId=${clipId}, current selectedClipId=${selectedClipId}, stack:`, new Error().stack);
    setSelectedClipId(clipId);
    if (clipId) {
      console.log(`[App] Selected timeline clip: ${clipId}`);
    } else {
      console.log(`[App] Deselected clip`);
    }
  }, [selectedClipId]);

  /**
   * Handle deleting clip from timeline (with ripple delete)
   */
  const handleDeleteClip = (clipId: string) => {
    setTimelineDoc(prevDoc => {
      const updatedDoc = removeClipFromMainTrackMagnetic(clipId, prevDoc, timeline);
      
      // Clear selection if deleted clip was selected
      if (selectedClipId === clipId) {
        setSelectedClipId(null);
      }
      console.log(`[App] Deleted clip ${clipId} from timeline`);
      return updatedDoc;
    });
  };

  /**
   * Handle deleting clip from library
   * Also removes the clip from timeline if it's being used there
   */
  const handleDeleteLibraryClip = (clipId: string) => {
    setLibrary(prev => {
      const newLibrary = prev.filter(clip => clip.id !== clipId);
      console.log(`[App] Deleted clip ${clipId} from library. Library now has ${newLibrary.length} clip(s).`);
      return newLibrary;
    });

    // Also remove from timeline if it's being used there
    setTimelineDoc(prevDoc => {
      const updatedDoc = removeClipFromMainTrackMagnetic(clipId, prevDoc, timeline);
      if (updatedDoc !== prevDoc) {
        console.log(`[App] Also removed clip ${clipId} from timeline`);
      }
      return updatedDoc;
    });

    // Clear selection if deleted clip was selected
    if (selectedClipId === clipId) {
      setSelectedClipId(null);
    }
  };

  /**
   * Handle clearing all clips from timeline
   * NOTE: This only clears the timeline, NOT the library
   */
  const handleClearAll = () => {
    setTimeline([]);
    setSelectedClipId(null);
    console.log(`[App] Cleared all clips from timeline`);
  };

  /**
   * Handle trim update with ripple behavior
   */
  const handleTrimUpdate = (clipId: string, trimStart: number, trimEnd: number) => {
    setTimelineDoc(prevDoc => {
      if (!prevDoc || prevDoc.tracks.length === 0) {
        // Fallback to timeline array if timelineDoc not initialized
        console.warn('[App] TimelineDoc not initialized, using timeline array for trim');
        const migrated = migrateToMultitrack(timeline);
        setTimelineDoc(migrated);
        // Retry with migrated doc
        return trimClipInMainTrackMagnetic(clipId, trimStart, trimEnd, migrated, timeline, library, 'ripple');
      }
      
      // Get current clips from main track - these are the source of truth
      const currentClips = extractMainTrackClips(prevDoc);
      const updatedDoc = trimClipInMainTrackMagnetic(
        clipId,
        trimStart,
        trimEnd,
        prevDoc,
        currentClips,
        library,
        'ripple'
      );
      console.log(`[App] Updated trim for clip ${clipId}: trimStart=${trimStart.toFixed(2)}s, trimEnd=${trimEnd.toFixed(2)}s`);
      return updatedDoc;
    });
  };

  /**
   * Handle splitting a clip at the current playhead position (with magnetic behavior)
   */
  const handleSplitClip = () => {
    const clipToSplit = getClipAtPlayhead();
    if (!clipToSplit) {
      console.warn('[App] Cannot split - no clip found at playhead position');
      return;
    }

    setTimelineDoc(prevDoc => {
      const updatedDoc = splitClipInMainTrackMagnetic(
        clipToSplit.id,
        currentPlayheadPosition,
        prevDoc,
        timeline,
        library
      );
      
      const mainTrackClips = extractMainTrackClips(updatedDoc);
      if (mainTrackClips.length > timeline.length) {
        console.log(`[App] Split clip ${clipToSplit.id} at ${currentPlayheadPosition.toFixed(2)}s`);
      }
      return updatedDoc;
    });
  };

  /**
   * Get the clip that the playhead is currently over (for splitting)
   * Uses time-based positioning when available (magnetic timeline)
   */
  const getClipAtPlayhead = (): TimelineClip | null => {
    // Sort timeline by order to ensure correct calculation
    const sortedTimeline = [...timeline].sort((a, b) => a.order - b.order);
    
    for (const clip of sortedTimeline) {
      const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
      if (!libraryClip) continue;
      
      // Use start property if available (magnetic timeline), otherwise calculate cumulative
      let clipStartTime: number;
      if (clip.start !== undefined) {
        clipStartTime = clip.start;
      } else {
        // Fallback: calculate cumulative time (backward compatibility)
        let currentTime = 0;
        for (const prevClip of sortedTimeline) {
          if (prevClip.id === clip.id) break;
          const prevLibraryClip = library.find(lc => lc.id === prevClip.libraryClipId);
          if (prevLibraryClip) {
            currentTime += prevClip.trimEnd - prevClip.trimStart;
          }
        }
        clipStartTime = currentTime;
      }
      
      const clipDuration = clip.trimEnd - clip.trimStart;
      const clipEndTime = clipStartTime + clipDuration;
      
      // Check if playhead is within this clip's timeline position
      if (currentPlayheadPosition >= clipStartTime && currentPlayheadPosition <= clipEndTime) {
        return clip;
      }
    }
    
    return null;
  };

  /**
   * Check if playhead is over a clip (for split button enable/disable)
   */
  const isPlayheadOverClip = (): boolean => {
    return getClipAtPlayhead() !== null;
  };

  /**
   * Handle restoring state from autosave
   * Called by useSessionRestore hook when user chooses to restore
   */
  const handleRestoreState = useCallback((restoredState: {
    library: VideoClip[];
    timeline: TimelineClip[];
    selectedClipId: string | null;
    currentPlayheadPosition: number;
    timelineZoom: number;
    timelineScrollPosition: number;
  }) => {
    console.log('[App] Restoring state from autosave:', {
      clips: restoredState.library.length,
      timeline: restoredState.timeline.length,
      playheadPosition: restoredState.currentPlayheadPosition,
      selectedClipId: restoredState.selectedClipId,
    });
    
    // Restore library and timeline first
    setLibrary(restoredState.library);
    setTimeline(restoredState.timeline);
    
    // Restore other state
    setTimelineZoom(restoredState.timelineZoom);
    setTimelineScrollPosition(restoredState.timelineScrollPosition);
    
    // Restore selected clip (this triggers video loading)
    setSelectedClipId(restoredState.selectedClipId);
    
    // Restore playhead position LAST (after clips are loaded)
    // Use setTimeout to ensure clips have time to load first
    setTimeout(() => {
      console.log('[App] Setting restored playhead position:', restoredState.currentPlayheadPosition);
      setCurrentPlayheadPosition(restoredState.currentPlayheadPosition);
    }, 100);
    
    console.log('[App] State restored from autosave');
  }, []);

  /**
   * Save project state before export starts
   * Called by export handler (PR-8) before starting export
   * Only saves if timeline has clips
   * Errors are handled silently (logged only)
   */
  const handleBeforeExport = useCallback(async () => {
    // Only save if timeline has clips
    if (timeline.length === 0) {
      return;
    }

    try {
      const savedState = serializeProjectState(
        library,
        timeline,
        selectedClipId,
        currentPlayheadPosition,
        timelineZoom,
        timelineScrollPosition
      );

      await window.electron.saveProject(savedState);
      console.log('[App] Project state saved before export');
    } catch (error) {
      // Log error but don't interrupt export
      console.error('[App] Failed to save project state before export:', error);
    }
  }, [library, timeline, selectedClipId, currentPlayheadPosition, timelineZoom, timelineScrollPosition]);

  /**
   * Handle auto-save completion - update timestamp in status bar
   */
  const handleAutoSaveComplete = useCallback(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    setLastSavedTime(timeString);
  }, []);

  // Auto-save hook: saves state every 30 seconds when timeline has clips
  useAutoSave({
    library,
    timeline,
    selectedClipId,
    currentPlayheadPosition,
    timelineZoom,
    timelineScrollPosition,
    isExporting,
    onSaveComplete: handleAutoSaveComplete,
  });

  // Session restore hook: checks for autosave file on mount and prompts to restore
  useSessionRestore({
    onRestore: handleRestoreState,
  });

  // Sync ref with selectedClipId
  useEffect(() => {
    selectedClipIdRef.current = selectedClipId;
  }, [selectedClipId]);

  // Handle clicks outside the Timeline to deselect clips
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const currentSelectedClipId = selectedClipIdRef.current;
      
      // Only deselect timeline clips (not library clips)
      const isTimelineClip = currentSelectedClipId && timeline.some(clip => clip.id === currentSelectedClipId);
      if (!isTimelineClip) {
        return;
      }

      const target = e.target as Node;
      
      // Check if click is outside timeline
      if (timelineRef.current && !timelineRef.current.contains(target)) {
        console.log('[App] Clicked outside timeline, deselecting clip');
        handleTimelineSelectClip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [timeline, handleTimelineSelectClip]);

  // Unified recording handlers
  const handleRecordClick = useCallback(() => {
    setShowRecordingTypeModal(true);
  }, []);

  // Handle toolbar add files
  const handleToolbarAddFiles = useCallback(async () => {
    try {
      const filePaths = await window.electron.selectFiles();
      if (filePaths.length > 0) {
        const importedClips = await importFiles(filePaths);
        if (importedClips.length > 0) {
          setLibrary(prev => [...importedClips, ...prev]);
          console.log(`[App] Imported ${importedClips.length} clip(s) via toolbar.`);
        }
      }
    } catch (err) {
      console.error('[App] File import error:', err);
    }
  }, [importFiles]);

  const handleSelectScreenRecording = useCallback(() => {
    setShowRecordingTypeModal(false);
    setShowRecordDialog(true);
  }, []);

  const handleSelectWebcamRecording = useCallback(() => {
    setShowRecordingTypeModal(false);
    setShowWebcamModal(true);
  }, []);

  const handleSelectPiPRecording = useCallback(() => {
    setShowRecordingTypeModal(false);
    setShowPiPModal(true);
  }, []);

  // Legacy handlers (kept for compatibility)
  const handleOpenRecordDialog = useCallback(() => {
    setShowRecordDialog(true);
  }, []);

  const handleOpenWebcamModal = useCallback(() => {
    setShowWebcamModal(true);
  }, []);

  const handleWebcamRecordingComplete = useCallback(async (filePath: string) => {
    try {
      // Add recorded clip to library
      const clipId = generateUUID();
      const metadata = await window.electron.getMetadata(filePath);
      const thumbnailPath = await window.electron.getThumbnail(filePath, clipId);
      
      const now = Date.now();
      const dateStr = new Date(now).toLocaleString();
      const newClip: VideoClip = {
        id: clipId,
        path: filePath,
        filename: `Webcam Recording - ${dateStr}.mp4`,
        duration: metadata.duration,
        thumbnail: thumbnailPath,
        metadata,
        importedAt: now,
        source: 'recording',
        recordedAt: now,
      };
      
      setLibrary(prev => [newClip, ...prev]);
      console.log('[App] Webcam recording added to library:', newClip.filename);
    } catch (err) {
      console.error('[App] Failed to add webcam recording to library:', err);
      alert('Failed to process webcam recording. File saved but not added to library.');
    }
  }, []);

  const handleStartRecording = useCallback(async (screenId: string, audioEnabled: boolean, audioDeviceId?: string) => {
    setShowRecordDialog(false);
    
    try {
      // Create recording session via IPC (this creates the session and temp file path)
      const result = await window.electron.recording.startRecording(screenId, audioEnabled);
      if (result.success && result.sessionId) {
        setRecordingSessionId(result.sessionId);
        setRecordingScreenSourceId(screenId);
        setRecordingAudioEnabled(audioEnabled);
        if (audioDeviceId) setRecordingAudioDeviceId(audioDeviceId);
        
        // Start MediaRecorder recording in renderer
        console.log('[App] Recording session created, starting MediaRecorder...');
        
        try {
          // Get screen stream using Electron's getUserMedia
          const screenStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenId,
              },
            } as MediaTrackConstraints,
          });

          // Get audio stream if enabled
          const combinedStream = screenStream;
          if (audioEnabled) {
            try {
              const audioConstraints: MediaStreamConstraints = {
                audio: audioDeviceId !== 'default' 
                  ? { deviceId: { exact: audioDeviceId } }
                  : true,
                video: false,
              };
              const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
              audioStream.getAudioTracks().forEach(track => {
                combinedStream.addTrack(track);
              });
            } catch (audioError) {
              console.warn('[App] Failed to get audio stream:', audioError);
              // Continue with video-only recording
            }
          }

          // Create MediaRecorder
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';

          const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            videoBitsPerSecond: 2500000,
          });

          const chunks: Blob[] = [];
          let isStopping = false; // Prevent double-stop
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            if (isStopping) {
              console.log('[App] MediaRecorder onstop already called, ignoring duplicate');
              return;
            }
            isStopping = true;

            console.log('[App] MediaRecorder onstop triggered');

            try {
              const blob = new Blob(chunks, { type: mimeType });
              const arrayBuffer = await blob.arrayBuffer();
              
              console.log(`[App] Recording stopped, writing ${arrayBuffer.byteLength} bytes...`);
              
              // Write to temp file via IPC (main process has access to Buffer)
              const writeResult = await window.electron.recording.writeRecordingFile(result.sessionId, arrayBuffer);
              
              if (!writeResult.success) {
                throw new Error(writeResult.error || 'Failed to write recording file');
              }
              
              console.log('[App] Recording file written, starting conversion...');
              
              // Now trigger the conversion via IPC
              const stopResult = await window.electron.recording.stopRecording(result.sessionId);
              if (stopResult.success) {
                console.log('[App] Recording converted successfully');
              } else {
                console.error('[App] Failed to convert recording:', stopResult.error);
                alert(`Failed to convert recording: ${stopResult.error}`);
              }
            } catch (writeError) {
              console.error('[App] Failed to write recording file:', writeError);
              alert(`Failed to save recording: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
            } finally {
              // Reset stopping flag
              (window as unknown as { isRecordingStopping: boolean }).isRecordingStopping = false;
            }
          };

          mediaRecorder.onerror = (event: Event) => {
            console.error('[App] MediaRecorder error:', event);
            alert(`Recording error: ${event instanceof ErrorEvent ? event.message : 'Unknown error'}`);
          };

          // Start recording
          mediaRecorder.start(100);
          console.log('[App] MediaRecorder started');
          
          // Store MediaRecorder reference and session info for stopping
          (window as unknown as { currentMediaRecorder: MediaRecorder; currentRecordingSessionId: string; isRecordingStopping: boolean }).currentMediaRecorder = mediaRecorder;
          (window as unknown as { currentMediaRecorder: MediaRecorder; currentRecordingSessionId: string; isRecordingStopping: boolean }).currentRecordingSessionId = result.sessionId;
          (window as unknown as { currentMediaRecorder: MediaRecorder; currentRecordingSessionId: string; isRecordingStopping: boolean }).isRecordingStopping = false;
          
        } catch (streamError) {
          console.error('[App] Failed to get media stream:', streamError);
          alert(`Failed to access screen: ${streamError instanceof Error ? streamError.message : 'Unknown error'}`);
        }
      } else {
        alert(`Failed to start recording: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('[App] Failed to start recording:', err);
      alert(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if (!recordingSessionId) {
      console.log('[App] No recording session to stop');
      return;
    }
    
    // Prevent double-stop
    if ((window as unknown as { isRecordingStopping: boolean }).isRecordingStopping) {
      console.log('[App] Recording stop already in progress');
      return;
    }
    (window as unknown as { isRecordingStopping: boolean }).isRecordingStopping = true;
    
    console.log('[App] Stopping recording...');
    
    // Stop MediaRecorder first
    const mediaRecorder = (window as unknown as { currentMediaRecorder: MediaRecorder }).currentMediaRecorder;
    if (mediaRecorder) {
      console.log('[App] MediaRecorder state:', mediaRecorder.state);
      
      if (mediaRecorder.state === 'recording') {
        console.log('[App] Stopping MediaRecorder...');
        try {
          mediaRecorder.stop();
          console.log('[App] MediaRecorder.stop() called');
        } catch (err) {
          console.error('[App] Error stopping MediaRecorder:', err);
          (window as unknown as { isRecordingStopping: boolean }).isRecordingStopping = false;
          return;
        }
      } else {
        console.log('[App] MediaRecorder not recording, state:', mediaRecorder.state);
        (window as unknown as { isRecordingStopping: boolean }).isRecordingStopping = false;
      }
    } else {
      console.log('[App] No MediaRecorder found');
      (window as unknown as { isRecordingStopping: boolean }).isRecordingStopping = false;
    }
    
    // Note: The conversion will be triggered by the MediaRecorder onstop handler
  }, [recordingSessionId]);

  // IPC event listeners for recording
  useEffect(() => {
    const cleanupElapsed = window.electron.recording.onElapsedTime((data) => {
      if (data.sessionId === recordingSessionId) {
        setRecordingElapsedSeconds(data.seconds);
      }
    });

    const cleanupComplete = window.electron.recording.onComplete(async (data) => {
      if (data.sessionId === recordingSessionId) {
        setIsProcessingRecording(false);
        
        // Add recorded clip to library
        try {
          const clipId = generateUUID();
          const metadata = await window.electron.getMetadata(data.filePath);
          const thumbnailPath = await window.electron.getThumbnail(data.filePath, clipId);
          
          const now = Date.now();
          const dateStr = new Date(now).toLocaleString();
          const newClip: VideoClip = {
            id: clipId,
            path: data.filePath,
            filename: `Screen Recording - ${dateStr}.mp4`,
            duration: data.duration,
            thumbnail: thumbnailPath,
            metadata,
            importedAt: now,
            source: 'recording',
            recordedAt: now,
          };
          
          setLibrary(prev => [newClip, ...prev]);
          setRecordingSessionId(null);
          setRecordingScreenSourceId(null);
          setRecordingOutputPath(null);
          alert('Recording saved to Library!');
        } catch (err) {
          console.error('[App] Failed to add recording to library:', err);
          alert('Failed to process recording. File saved but not added to library.');
        }
      }
    });

    const cleanupError = window.electron.recording.onError((data) => {
      if (data.sessionId === recordingSessionId) {
        alert(`Recording error: ${data.message}`);
        setRecordingSessionId(null);
        setIsProcessingRecording(false);
      }
    });

    return () => {
      cleanupElapsed();
      cleanupComplete();
      cleanupError();
    };
  }, [recordingSessionId]);

  return (
    <div className="flex flex-col w-full h-full bg-[#1a1a1a] text-white">
      {/* Menu Bar */}
      <MenuBar />
      
      {/* Toolbar */}
      <Toolbar 
        onAddFiles={handleToolbarAddFiles}
        onExport={() => {/* Handle export via VideoPlayer */}}
        onRecord={handleRecordClick}
      />
      
      {/* Auto-save status bar (below toolbar) */}
      {lastSavedTime && (
        <div className="h-[22px] bg-[#1a1a1a] text-white flex items-center justify-center text-xs z-[100] pointer-events-none border-b border-[#333333]">
          <span className="text-[#999999] font-normal">Auto saved: {lastSavedTime}</span>
        </div>
      )}
      {/* Top section: Library + VideoPlayer - constrained to 50% height */}
      <div className="flex overflow-hidden" style={{ height: lastSavedTime ? 'calc(50% - 22px)' : '50%', maxHeight: lastSavedTime ? 'calc(50vh - 22px)' : '50vh' }}>
        <Library 
          library={library}
          onImportComplete={handleImportComplete}
          onSelectClip={handleSelectClip}
          selectedClipId={selectedClipId}
          onDeleteClip={handleDeleteLibraryClip}
        />
        <VideoPlayer
          selectedClipId={selectedClipId}
          library={library}
          timeline={timeline}
          currentPlayheadPosition={currentPlayheadPosition}
          onPlayheadChange={setCurrentPlayheadPosition}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onSelectClip={handleTimelineSelectClip}
          onBeforeExport={handleBeforeExport}
          onRecordClick={handleRecordClick}
          isRecording={!!recordingSessionId}
          isProcessingRecording={isProcessingRecording}
        />
        {recordingSessionId && (
          <RecordingIndicator
            elapsedSeconds={recordingElapsedSeconds}
            audioLevel={recordingAudioLevel}
            audioEnabled={recordingAudioEnabled}
            onStop={handleStopRecording}
          />
        )}
      </div>
      
      
      {/* Recording Dialogs */}
      <RecordScreenDialog
        isOpen={showRecordDialog}
        onClose={() => setShowRecordDialog(false)}
        onStartRecording={handleStartRecording}
      />
      <RecordingPermissionDialog
        isOpen={showPermissionDialog}
        onContinueWithoutAudio={() => {
          setShowPermissionDialog(false);
          // Continue with video-only recording
        }}
        onCancel={() => {
          setShowPermissionDialog(false);
          setShowRecordDialog(true);
        }}
      />
      <WebcamRecordingModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onRecordingComplete={handleWebcamRecordingComplete}
      />
      <PiPRecordingModal
        isOpen={showPiPModal}
        onClose={() => setShowPiPModal(false)}
        onRecordingComplete={handleWebcamRecordingComplete}
      />
      <RecordingTypeModal
        isOpen={showRecordingTypeModal}
        onClose={() => setShowRecordingTypeModal(false)}
        onSelectScreenRecording={handleSelectScreenRecording}
        onSelectWebcamRecording={handleSelectWebcamRecording}
        onSelectPiPRecording={handleSelectPiPRecording}
      />
      
      {isProcessingRecording && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <p>Processing recording...</p>
        </div>
      )}
      {/* Timeline Section - takes remaining 50% of height */}
      <div ref={timelineRef} className="flex flex-col overflow-hidden" style={{ height: '50%' }}>
        <Timeline
          timeline={timeline}
          library={library}
          selectedClipId={selectedClipId}
          currentPlayheadPosition={currentPlayheadPosition}
          timelineZoom={timelineZoom}
          timelineScrollPosition={timelineScrollPosition}
          onAddClip={handleAddClipToTimeline}
          onReorderClip={handleReorderClip}
          onSelectClip={handleTimelineSelectClip}
          onDeleteClip={handleDeleteClip}
          onClearAll={handleClearAll}
          onZoomChange={setTimelineZoom}
          onScrollChange={setTimelineScrollPosition}
          onPlayheadChange={setCurrentPlayheadPosition}
          onTrimUpdate={handleTrimUpdate}
          onSplitClip={handleSplitClip}
          isPlayheadOverClip={isPlayheadOverClip()}
          timelineContainerRefCallback={(ref) => { timelineContainerRef.current = ref.current; }}
        />
        
        {/* Zoom Controls Bar - directly below timeline, no gap */}
        <div className="flex-shrink-0 px-4 py-2 border-t border-[#333333] bg-[#2a2a2a]">
          <TimelineZoomControls
            zoom={timelineZoom}
            onZoomChange={setTimelineZoom}
            timeline={timeline}
            library={library}
            timelineContainerRef={timelineContainerRef}
          />
        </div>
      </div>
    </div>
  );
};

export default App;

