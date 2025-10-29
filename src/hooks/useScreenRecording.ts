/**
 * Hook for screen recording using MediaRecorder API
 */

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseScreenRecordingOptions {
  screenSourceId: string | null;
  audioEnabled: boolean;
  audioDeviceId?: string;
  outputPath: string | null;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
}

interface UseScreenRecordingReturn {
  isRecording: boolean;
  elapsedSeconds: number;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useScreenRecording({
  screenSourceId,
  audioEnabled,
  audioDeviceId = 'default',
  outputPath,
  onRecordingStart,
  onRecordingStop,
  onError,
}: UseScreenRecordingOptions): UseScreenRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanupStreams = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
  }, []);

  const getDesktopStream = useCallback(async (sourceId: string): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
        },
      } as any,
    });
    return stream;
  }, []);

  const startRecording = useCallback(async () => {
    if (!screenSourceId || !outputPath) {
      const err = !screenSourceId ? 'No screen source selected' : 'No output path specified';
      setError(err);
      onError?.(err);
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      const screenStream = await getDesktopStream(screenSourceId);
      screenStreamRef.current = screenStream;

      let combinedStream = screenStream;
      if (audioEnabled) {
        try {
          const audioConstraints: MediaStreamConstraints = {
            audio: audioDeviceId !== 'default' 
              ? { deviceId: { exact: audioDeviceId } }
              : true,
            video: false,
          };
          const audioStream = await navigator.mediaDevices.getUserMedia(audioConstraints);
          audioStreamRef.current = audioStream;

          audioStream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
        } catch (audioError) {
          console.warn('[useScreenRecording] Failed to get audio stream:', audioError);
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const arrayBuffer = await blob.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const fs = require('fs').promises;
          await fs.writeFile(outputPath, buffer);
          console.log(`[useScreenRecording] Recording saved to: ${outputPath}`);
          onRecordingStop?.();
        } catch (writeError) {
          const err = `Failed to write recording file: ${writeError}`;
          console.error('[useScreenRecording]', err);
          setError(err);
          onError?.(err);
        }
        cleanupStreams();
      };

      mediaRecorder.onerror = (event: any) => {
        const err = `MediaRecorder error: ${event.error?.message || 'Unknown error'}`;
        console.error('[useScreenRecording]', err);
        setError(err);
        onError?.(err);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimeRef.current = Date.now();

      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      onRecordingStart?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useScreenRecording] Failed to start recording:', err);
      setError(errorMessage);
      onError?.(errorMessage);
      cleanupStreams();
    }
  }, [screenSourceId, audioEnabled, audioDeviceId, outputPath, onRecordingStart, onRecordingStop, onError, cleanupStreams, getDesktopStream]);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
    cleanupStreams();
    chunksRef.current = [];
    setElapsedSeconds(0);
    setError(null);
  }, [isRecording, cleanupStreams]);

  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
      cleanupStreams();
    };
  }, [cleanupStreams]);

  return {
    isRecording,
    elapsedSeconds,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}