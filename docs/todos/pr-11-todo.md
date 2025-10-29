# PR-11 TODO — Screen Recording

**Branch**: `feat/pr-11-screen-recording`  
**Source PRD**: `docs/prds/pr-11-prd.md`  
**Owner (Agent)**: Cody

---

## 0. Clarifying Questions & Assumptions

- Questions: 
  - Should we support recording specific windows or just full screens?
  - What's the maximum recording duration before we need to split files?
  - Should we compress recordings in real-time or post-process?
- Assumptions (confirm in PR if needed):
  - desktopCapturer API will be available on both macOS and Windows
  - WebRTC audio/video capture will maintain sync during recording
  - Users will have microphone permissions or we'll handle denial gracefully

---

## 1. Setup

- [ ] Create branch `feat/pr-11-screen-recording` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-11-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context
- [ ] Confirm environment and Electron dev server work
- [ ] Install any additional dependencies for screen capture

---

## 2. Service Layer

Implement deterministic Electron IPC handlers and screen recording service from PRD.

- [ ] Create `src/main/services/screenRecordingService.ts` with FFmpeg integration
  - Test Gate: Core recording logic with desktopCapturer API
- [ ] Create `src/main/ipc-handlers/recording.ts` with all IPC handlers
  - Test Gate: Returns list of available screens with thumbnails
- [ ] Implement `startScreenRecording(options)` in recording.ts
  - Test Gate: Starts recording with valid screen ID, handles invalid options
- [ ] Implement `stopScreenRecording()` in recording.ts
  - Test Gate: Stops recording and returns file path
- [ ] Implement `getRecordingStatus()` in recording.ts
  - Test Gate: Returns current recording state
- [ ] Implement `requestMicrophonePermission()` in recording.ts
  - Test Gate: Requests permission, returns boolean result
- [ ] Implement `cancelScreenRecording()` in recording.ts
  - Test Gate: Cancels recording and cleans up temp files
- [ ] Add validation logic for screen capture options
  - Test Gate: Edge cases handled correctly (invalid screen ID, no permission)
- [ ] Integrate with existing `ffmpeg-service.ts`
  - Test Gate: FFmpeg conversion works for recorded videos

---

## 3. Data Model & File Operations

- [ ] Define `RecordingState` interface in `src/types/recording.ts`
- [ ] Define `ScreenInfo` interface in `src/types/recording.ts`
- [ ] Define `ScreenCaptureOptions` interface in `src/types/recording.ts`
- [ ] Define `RecordingResult` interface in `src/types/recording.ts`
- [ ] Define session state types in `src/types/session.ts`
- [ ] Update project state schema to include recording state
- [ ] Add validation rules for screen capture options
  - Test Gate: Reads/writes succeed with rules applied
- [ ] Implement temp file management for recordings
  - Test Gate: Temp files created and cleaned up correctly
- [ ] Add SAR normalization for export compatibility
  - Test Gate: Prevents concat filter errors during export

---

## 4. UI Components

Create/modify React components per PRD Section 10.

- [ ] Create `RecordScreenDialog.tsx` component
  - Test Gate: React component renders; zero console errors
- [ ] Create `RecordingIndicator.tsx` component
  - Test Gate: Shows red dot and timer when recording
- [ ] Create `RecordScreenButton.tsx` component
  - Test Gate: Start/stop buttons work correctly
- [ ] Create `ScreenRecordingTest.tsx` component
  - Test Gate: Test component for development and debugging
- [ ] Create `useScreenRecorder.ts` hook
  - Test Gate: Hook manages recording state correctly
- [ ] Wire up state management (useState, useEffect, etc.)
  - Test Gate: Interaction updates state correctly
- [ ] Add loading/error/empty states
  - Test Gate: All states render correctly (no screens, permission denied, recording)
- [ ] Integrate with `MainLayout.tsx` for stopping state management
  - Test Gate: Recording state properly managed in main layout

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [ ] Electron IPC integration for screen capture
  - Test Gate: IPC calls work from renderer to main process
- [ ] WebRTC audio/video capture integration
  - Test Gate: Audio and video captured simultaneously
- [ ] FFmpeg integration for thumbnail generation and conversion
  - Test Gate: Thumbnails generated for recorded videos
- [ ] Auto-save functionality for recording state
  - Test Gate: Recording state saves and restores correctly
- [ ] File system operations for temp recording storage
  - Test Gate: Temp files created, saved, and cleaned up correctly
- [ ] Library integration for recorded videos
  - Test Gate: Recorded videos automatically added to Library
- [ ] Export integration with SAR normalization
  - Test Gate: Prevents concat filter errors during video export
- [ ] MainLayout integration with stopping state management
  - Test Gate: Recording state properly integrated with main UI

---

## 6. Manual Testing

Follow manual testing protocol from `prd-v1.md`.

- [ ] Manual validation with real screen recordings
  - Test Gate: Screen recording works with actual desktop content
  
- [ ] Performance verification
  - Test Gate: Recording starts within 5 seconds, no frame drops
  
- [ ] Cross-platform testing
  - Test Gate: Works on macOS (primary) and Windows (secondary)
  
- [ ] Edge case testing
  - Test Gate: Permission denied, no screens available, window closed during recording
  - Test Gate: Large recordings, interrupted recordings handled gracefully
  
- [ ] Definition of done checklist
  - Test Gate: All items from prd-v1.md and .cursorrules verified

---

## 7. Performance

Verify targets from `prd-v1.md`.

- [ ] Recording startup < 5 seconds
  - Test Gate: Screen selection to recording start measured
- [ ] Recording at native resolution without frame drops
  - Test Gate: 1080p recording verified without performance issues
- [ ] UI remains responsive during recording
  - Test Gate: Other app functions work while recording
- [ ] Memory usage stable during recording
  - Test Gate: Memory monitored during extended recording

---

## 8. Acceptance Gates

Check every gate from PRD Section 12:
- [ ] User clicks "Record Screen" → dialog opens within 2 seconds
- [ ] User selects screen → recording starts within 3 seconds
- [ ] User stops recording → video saved and added to Library within 5 seconds
- [ ] Microphone permission denied → screen-only recording allowed with clear message
- [ ] Window closed during recording → video still saves to temp location
- [ ] Complete recording workflow in <60 seconds
- [ ] All edge cases handled gracefully without crashes
- [ ] Recorded video plays correctly in Library
- [ ] Performance targets met consistently

---

## 9. Documentation & PR

- [ ] Add inline code comments for complex logic (WebRTC, desktopCapturer, FFmpeg)
- [ ] Update README with screen recording feature
- [ ] Update project documentation with screen recording details
- [ ] Create PR description (use format from agents/cody-agent-template.md)
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handlers implemented in main process (recording.ts)
- [ ] Screen recording service implemented with FFmpeg integration
- [ ] React components implemented with state management
- [ ] MainLayout integration with stopping state management
- [ ] Video processing integration tested with FFmpeg
- [ ] SAR normalization for export compatibility
- [ ] Manual testing complete with real screen recordings
- [ ] Performance targets met (see prd-v1.md)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated
- [ ] Cross-platform testing completed (macOS + Windows)
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- Focus on macOS primary, Windows secondary support
- Test with real screen content, not just test patterns
- Ensure audio/video sync is maintained throughout recording
