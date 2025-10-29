# PRD: Screen Recording

**Feature**: Screen Recording

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Pete

**Target Release**: Phase 5A

**Links**: [PR Brief], [TODO], [Designs], [Tracking Issue]

**PR Number**: #11

---

## 1. Summary

Content creators need to record their screen with audio capture directly within ollo to create tutorials and presentations without external tools. This feature enables one-app workflow for screen-based content creation by integrating Electron's desktopCapturer API with WebRTC audio capture.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Users currently need separate screen recording software, creating workflow friction and requiring multiple applications for content creation.
- **Why now?** MVP is complete with core video editing functionality, ready for content creation features that expand the app's value proposition.
- **Goals (ordered, measurable):**
  - [ ] G1 — Enable screen recording with audio in <30 seconds setup time
  - [ ] G2 — Recorded video automatically added to Library with playable thumbnail
  - [ ] G3 — Support both macOS and Windows with best-effort compatibility

---

## 3. Non-Goals / Out of Scope

- [ ] Not doing live streaming (recording only, not real-time broadcast)
- [ ] Not doing advanced screen capture options (basic screen/window selection only)
- [ ] Not doing real-time editing during recording (record first, edit later)
- [ ] Not doing screen recording with external audio sources (microphone only)
- [ ] Not doing recording quality settings (use native resolution)

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: Screen recording setup in <30 seconds, 1-click stop recording, recorded video appears in Library
- **System**: Recording at native resolution without frame drops, audio/video sync maintained
- **Quality**: 0 crashes during recording, handles window closure gracefully, permission denied handled elegantly

---

## 5. Users & Stories

- As a content creator, I want to record my screen with audio so that I can create tutorials without leaving ollo
- As an educator, I want to record presentations so that I can create engaging video content for students
- As a developer, I want to record software demos so that I can showcase features to stakeholders
- As a support agent, I want to record bug reproductions so that I can document issues for developers

---

## 6. Experience Specification (UX)

- **Entry points and flows**: "Record Screen" button in main toolbar → Screen selection dialog → Start recording → Stop recording → Auto-add to Library
- **Visual behavior**: 
  - Red recording indicator with timer in toolbar
  - Live preview during screen selection
  - Recording button changes to "Stop Recording" when active
- **Loading/disabled/error states**: 
  - Permission dialogs for microphone access
  - "No screens available" error message
  - "Recording in progress" disabled state for other actions
- **Performance**: Recording at native resolution without frame drops, <5 second startup time

---

## 7. Functional Requirements (Must/Should)

- **MUST**: Electron desktopCapturer API integration for screen/window selection
- **MUST**: WebRTC audio/video capture with synchronization
- **MUST**: Auto-save recording to temp location with proper cleanup
- **MUST**: Microphone permission handling with graceful fallback
- **MUST**: Cross-platform compatibility (macOS primary, Windows secondary)
- **SHOULD**: Live preview during screen selection
- **SHOULD**: Recording indicator with timer display
- **SHOULD**: Rename recording before adding to Library

**Acceptance gates per requirement:**
- [Gate] When user clicks "Record Screen" → dialog opens within 2 seconds
- [Gate] When user selects screen → recording starts within 3 seconds
- [Gate] When user stops recording → video saved and added to Library within 5 seconds
- [Gate] When microphone permission denied → screen-only recording allowed with clear message
- [Gate] When window closed during recording → video still saves to temp location

---

## 8. Data Model

```typescript
interface RecordingState {
  isRecording: boolean;
  recordingStartTime: number;
  selectedScreenId: string;
  audioEnabled: boolean;
  tempFilePath: string;
  duration: number;
}

interface ScreenInfo {
  id: string;
  name: string;
  thumbnail: string;
  isPrimary: boolean;
}

interface ScreenCaptureOptions {
  screenId: string;
  audio: boolean;
  video: boolean;
  audioSource?: string;
  videoConstraints: {
    width: number;
    height: number;
    frameRate: number;
  };
}

interface RecordingResult {
  filePath: string;
  duration: number;
  resolution: string;
  audioTrack: boolean;
}
```

**Validation rules:**
- Screen ID must be valid from desktopCapturer
- Audio enabled requires microphone permission
- Video constraints must match selected screen resolution
- Temp file path must be writable and unique

---

## 9. API / Service Contracts

Specify concrete Electron IPC handlers and service architecture:

```typescript
// Screen recording IPC handlers (via recording.ts)
window.electron.getAvailableScreens(): Promise<ScreenInfo[]>
window.electron.startScreenRecording(options: ScreenCaptureOptions): Promise<void>
window.electron.stopScreenRecording(): Promise<RecordingResult>
window.electron.getRecordingStatus(): Promise<RecordingState>
window.electron.requestMicrophonePermission(): Promise<boolean>
window.electron.cancelScreenRecording(): Promise<void>

// Screen recording service (screenRecordingService.ts)
- Screen capture using Electron's desktopCapturer API
- FFmpeg conversion for video processing
- Temp file management and cleanup
- Audio/video synchronization
```

**Service Architecture:**
- `src/main/services/screenRecordingService.ts` — Core recording logic with FFmpeg
- `src/main/ipc-handlers/recording.ts` — IPC handlers for recording operations
- `src/main/services/ffmpeg-service.ts` — Existing FFmpeg service integration

**Pre/post-conditions:**
- `getAvailableScreens()`: Must be called before recording, returns list of available screens
- `startScreenRecording()`: Requires valid screen ID, starts recording immediately
- `stopScreenRecording()`: Must be called after start, returns recording result
- `getRecordingStatus()`: Can be called anytime, returns current recording state

**Error handling:**
- Permission denied → return false, show user message
- Screen unavailable → return error, allow retry
- Recording failed → cleanup temp files, show error
- FFmpeg conversion errors → handle gracefully with user feedback

---

## 10. UI Components to Create/Modify

- `src/components/RecordScreenDialog.tsx` — Screen/window selection dialog with thumbnails
- `src/components/RecordingIndicator.tsx` — Red dot + timer display in toolbar
- `src/components/RecordScreenButton.tsx` — Start/stop recording button
- `src/components/ScreenRecordingTest.tsx` — Test component for development
- `src/hooks/useScreenRecorder.ts` — Recording state management and IPC calls
- `src/main/services/screenRecordingService.ts` — Core recording logic with FFmpeg
- `src/main/ipc-handlers/recording.ts` — IPC handlers for recording operations
- `src/types/recording.ts` — TypeScript interfaces for recording
- `src/types/session.ts` — Session state management types
- `src/components/MainLayout.tsx` — Integration with stopping state management

---

## 11. Integration Points

- **Electron IPC integration**: desktopCapturer API, WebRTC, file system operations
- **Screen recording service**: Core recording logic with FFmpeg conversion
- **Local file system**: Temp recording storage, Library integration
- **State management**: React hooks for recording state, Library state updates, stopping state
- **FFmpeg integration**: Video processing for thumbnail generation, metadata extraction, and conversion
- **Export integration**: Normalize SAR to prevent concat filter errors
- **MainLayout integration**: Recording state management and UI updates
- **Cross-platform compatibility**: macOS primary (desktopCapturer), Windows secondary (best-effort)

---

## 12. Test Plan & Acceptance Gates

Define BEFORE implementation. Use checkboxes.

**Happy Path:**
- [ ] User clicks "Record Screen" → dialog opens with available screens
- [ ] User selects screen → recording starts with indicator
- [ ] User stops recording → video saved to temp location
- [ ] Video automatically added to Library with thumbnail
- [ ] Gate: Complete recording workflow in <60 seconds

**Edge Cases:**
- [ ] No screens available → error message displayed
- [ ] Microphone permission denied → screen-only recording allowed
- [ ] Window closed during recording → video still saves
- [ ] Recording interrupted by system → cleanup temp files
- [ ] Gate: All edge cases handled gracefully without crashes

**Video Processing:**
- [ ] FFmpeg processes recorded video correctly
- [ ] Audio/video sync maintained throughout recording
- [ ] Thumbnail generation works for recorded video
- [ ] SAR normalization prevents concat filter errors
- [ ] Gate: Recorded video plays correctly in Library

**Performance (see prd-v1.md):**
- [ ] Recording starts within 5 seconds
- [ ] Recording at native resolution without frame drops
- [ ] UI remains responsive during recording
- [ ] Gate: Performance targets met consistently

**Cross-Platform:**
- [ ] macOS: desktopCapturer API works correctly
- [ ] Windows: Basic screen recording functional
- [ ] Gate: Both platforms support core functionality

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [ ] Electron IPC handlers implemented in main process (recording.ts)
- [ ] Screen recording service implemented with FFmpeg integration
- [ ] React components with all states (recording, selection, error, stopping)
- [ ] Video processing verified with FFmpeg (thumbnail generation, conversion)
- [ ] Auto-save functionality tested (recording state persistence)
- [ ] MainLayout integration with stopping state management
- [ ] SAR normalization for export compatibility
- [ ] All acceptance gates pass (happy path, edge cases, performance)
- [ ] Cross-platform testing done (macOS primary, Windows secondary)
- [ ] Performance targets met (startup time, recording quality)
- [ ] Documentation updated (code comments, README)

---

## 14. Risks & Mitigations

- **Risk**: Permission denied for microphone → **Mitigation**: Graceful fallback to screen-only recording with clear user message
- **Risk**: Recording performance impact → **Mitigation**: Background processing, progress indicators, performance monitoring
- **Risk**: Cross-platform compatibility issues → **Mitigation**: Test on both platforms, fallback options for Windows
- **Risk**: File system errors during recording → **Mitigation**: Robust error handling, temp file cleanup, user notification
- **Risk**: Audio/video sync issues → **Mitigation**: Use WebRTC best practices, test with various audio sources

---

## 15. Rollout & Telemetry

- **Feature flag?** No (core feature, always enabled)
- **Metrics**: Recording start time, completion rate, error frequency, cross-platform usage
- **Manual validation steps**: 
  - Test recording on macOS with different screen configurations
  - Test permission handling scenarios
  - Verify Library integration works correctly

---

## 16. Open Questions

- Q1: Should we support recording specific windows or just full screens?
- Q2: What's the maximum recording duration before we need to split files?
- Q3: Should we compress recordings in real-time or post-process?

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Advanced screen capture options (region selection, multiple screens)
- [ ] Recording quality settings (resolution, bitrate)
- [ ] Live streaming capabilities
- [ ] External audio source support
- [ ] Recording with webcam overlay (separate feature)

---

## Preflight Questionnaire

Answer these to drive vertical slice and acceptance gates:

1. **Smallest end-to-end user outcome for this PR?** User can record their screen with audio and have it automatically appear in Library
2. **Primary user and critical action?** Content creator clicking "Record Screen" and successfully recording
3. **Must-have vs nice-to-have?** Must: Basic screen recording with audio. Nice: Live preview, rename option
4. **Video processing requirements?** FFmpeg for thumbnail generation, metadata extraction
5. **Performance constraints?** Recording startup <5s, native resolution without frame drops
6. **Error/edge cases to handle?** Permission denied, no screens available, window closed during recording
7. **Data model changes?** New RecordingState, ScreenInfo, ScreenCaptureOptions interfaces
8. **Electron IPC handlers required?** 6 handlers for screen selection, recording control, status
9. **UI entry points and states?** Toolbar button → dialog → recording indicator → Library integration
10. **File system implications?** Temp recording storage, Library integration, cleanup on errors
11. **Dependencies or blocking integrations?** Electron desktopCapturer API, WebRTC, FFmpeg
12. **Rollout strategy and metrics?** Always enabled, track recording success rate and performance
13. **What is explicitly out of scope?** Live streaming, advanced capture options, quality settings

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep Electron IPC handlers deterministic
- React components are thin wrappers around IPC calls
- Test video processing thoroughly with real screen recordings
- Reference `prd-v1.md` and `.cursorrules` throughout
- Focus on macOS primary, Windows secondary support
