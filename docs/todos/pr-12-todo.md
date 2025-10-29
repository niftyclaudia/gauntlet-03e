# PR-12 TODO — Webcam Recording

**Branch**: `feat/webcam-recording`  
**Source PRD**: `docs/prds/pr-12-prd.md`  
**Owner (Agent)**: Pete

---

## 0. Pre-Implementation

- [x] Read PRD `docs/prds/pr-12-prd.md` thoroughly
- [x] Read `.cursorrules` for patterns and requirements
- [x] Read `prd-v1.md` for project context
- [x] **CRITICAL: Validate technology choices**:
  - [x] Confirm WebRTC `getUserMedia()` API works in Electron renderer for camera access
  - [x] Confirm `MediaRecorder` API supports recording to Blob in Electron
  - [x] Test FFmpeg can encode WebM/MP4 Blobs to H.264+AAC MP4
  - [x] Verify 30fps preview is achievable without frame drops
  - [x] Document chosen approach: WebRTC in renderer + FFmpeg in main process
- [x] Identify test gates from PRD (AC-1 through AC-12)

---

## 1. Service Layer (Electron IPC)

Implement deterministic backend handlers in Electron main process.

### 1.1 IPC Handler: `encode-webcam-recording`

- [x] Create `src/main/ipc-handlers/webcam.ts`
- [x] Implement `encode-webcam-recording` handler:
  - **Input**: `{ recordedBlob: Buffer, outputPath: string, mimeType: string, videoDimensions: { width: number, height: number } }`
  - **Output**: `{ filePath: string, duration: number, width: number, height: number, thumbnailPath?: string }`
  - **Logic**:
    1. Write Blob buffer to temp input file (`.webm` or `.mp4`)
    2. Construct FFmpeg command: `-i input -c:v libx264 -preset medium -crf 23 -r 30 -c:a aac -b:a 128k output.mp4`
    3. Execute FFmpeg via `child_process.spawn()`
    4. Extract first frame as thumbnail JPEG: `ffmpeg -i input -ss 0 -vframes 1 thumbnail.jpg`
    5. Probe output file for duration/dimensions using `ffprobe`
    6. Return result object
  - **Error handling**: Invalid blob, disk full, FFmpeg crash (return error object)
- [x] Test: Valid WebRTC Blob → successful MP4 encoding
- [x] Test: Invalid blob → error returned gracefully
- [x] Test: Disk full → cleanup partial files, return error

### 1.2 IPC Handlers: Permission Checks (Optional)

- [x] Implement `check-camera-permission` handler (returns `true` - permission check happens in renderer)
- [x] Implement `check-microphone-permission` handler (returns `true` - permission check happens in renderer)

### 1.3 Register Handlers

- [x] Export `registerWebcamHandlers(ipcMain)` from `src/main/ipc-handlers/webcam.ts`
- [x] Call `registerWebcamHandlers(ipcMain)` in `src/main/main.ts` on app startup
- [x] Test: IPC handlers registered and callable from renderer

---

## 2. React Components & State

### 2.1 Component: `WebcamRecordingModal.tsx`

- [x] Create `src/components/WebcamRecordingModal.tsx`
- [x] **Props**: `{ isOpen: boolean; onClose: () => void; onRecordingComplete: (filePath: string) => void; }`
- [x] **State**:
  ```typescript
  interface RecordingSession {
    status: 'idle' | 'preview' | 'recording' | 'saving' | 'error';
    mediaStream?: MediaStream;
    mediaRecorder?: MediaRecorder;
    recordedChunks: Blob[];
    startTime: number;
    elapsedSeconds: number;
    errorMessage?: string;
    selectedCameraId?: string;
  }
  ```
- [x] **Lifecycle**:
  - On open: Request camera + microphone via `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
  - On permission granted: Set `status: 'preview'`, attach stream to `<video>` element
  - On permission denied: Set `status: 'error'`, show retry option
  - On Start button: Initialize `MediaRecorder`, set `status: 'recording'`, start timer
  - On Stop button: Stop `MediaRecorder`, set `status: 'saving'`, encode recording
  - On encoding complete: Call `onRecordingComplete(filePath)`, set `status: 'idle'`, close modal
- [x] **Render**:
  - Video element (`<video autoPlay muted ref={videoRef} />`) for live preview
  - Start/Stop button (changes based on `status`)
  - Timer display (MM:SS format)
  - Error message (if `status: 'error'`)
  - "Saving..." spinner (if `status: 'saving'`)
- [x] **MediaRecorder Setup**:
  - Use `new MediaRecorder(mediaStream, { mimeType: 'video/webm;codecs=vp8,opus' })`
  - Collect chunks via `mediaRecorder.ondataavailable = (e) => { chunks.push(e.data) }`
  - On stop: Combine chunks into single Blob
- [x] **Encoding Call**:
  - Convert Blob to Buffer: `const buffer = await blob.arrayBuffer()`
  - Call IPC: `const result = await ipcRenderer.invoke('encode-webcam-recording', { recordedBlob: buffer, outputPath: tempPath, mimeType, videoDimensions })`
  - Handle result: Call `onRecordingComplete(result.filePath)` or show error
- [x] Test: Modal opens, preview shows camera feed
- [x] Test: Start → timer runs → Stop → encoding → modal closes
- [x] Test: Permission denied → error message → retry → success
- [x] Test: Camera already in use → error shown

### 2.2 Component: `WebcamRecordButton.tsx`

- [x] Create `src/components/WebcamRecordButton.tsx`
- [x] **Props**: `{ onClick: () => void; disabled?: boolean }`
- [x] **Render**: Button with red camera icon + "Record Webcam" label
- [x] Test: Button renders, click triggers modal open

### 2.3 Multi-Camera Support (Optional - REQ-6)

- [x] In `WebcamRecordingModal.tsx`:
  - On mount: Call `navigator.mediaDevices.enumerateDevices()` to list cameras
  - Filter devices: `devices.filter(d => d.kind === 'videoinput')`
  - If multiple cameras: Show dropdown selector
  - On camera select: Re-request `getUserMedia` with `{ deviceId: { exact: selectedId } }`
- [x] Test: Multiple cameras → dropdown shows → selection changes preview
- [x] Test: Single camera → no dropdown shown

### 2.4 Timer Implementation

- [x] Implement timer using `setInterval()`:
  ```typescript
  useEffect(() => {
    if (status === 'recording') {
      const interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);
  ```
- [x] Format as MM:SS: `const minutes = Math.floor(elapsed / 60); const seconds = elapsed % 60;`
- [x] Test: Timer starts at 00:00, increments correctly during recording

---

## 3. Data Model & Types

### 3.1 TypeScript Interfaces

- [x] Define `RecordingSession` interface (already defined in 2.1)
- [x] Define `CameraDevice` interface:
  ```typescript
  interface CameraDevice {
    deviceId: string;
    label: string;
    kind: 'videoinput';
  }
  ```
- [x] Define `EncodedRecording` interface (return type from IPC):
  ```typescript
  interface EncodedRecording {
    filePath: string;
    duration: number;
    width: number;
    height: number;
    thumbnailPath?: string;
  }
  ```

### 3.2 File Storage

- [x] Recording files persist in `app.getPath('userData')/recordings/Webcam_*.mp4` (NOT temp!)
- [x] Cleanup strategy: Delete recordings >7 days old on startup; temp input files (`*-input.*`) after 1 hour

---

## 4. Integration

### 4.1 Wire Components → IPC

- [x] In `WebcamRecordingModal.tsx`:
  - Import `ipcRenderer` from Electron
  - Call `ipcRenderer.invoke('encode-webcam-recording', params)` after recording stops
  - Handle result: Call `onRecordingComplete(filePath)` or show error
- [x] Test: Recording → encoding → result returned → modal closes

### 4.2 Auto-Import to Library

- [x] Modify `src/components/Library.tsx`:
  - Add handler for `onRecordingComplete(filePath)`:
    1. Extract metadata from file (duration, dimensions) using `ffprobe` or IPC
    2. Generate clip name: `Webcam_YYYYMMDD_HHMMSS`
    3. Create `Clip` object
    4. Add to Library state
    5. Generate thumbnail (already done by encoding IPC)
    6. Display in Library panel
- [x] Test: Recording completes → clip appears in Library immediately
- [x] Test: Clip thumbnail shows first frame, duration correct

### 4.3 Add Button to Toolbar

- [x] Modify `src/components/MainLayout.tsx` (or Toolbar component):
  - Import `WebcamRecordButton`
  - Add button next to "Import" and "Record Screen" buttons
  - Wire button click to open `WebcamRecordingModal`
- [x] Test: Button visible in toolbar, click opens modal

### 4.4 FFmpeg Integration

- [x] Ensure FFmpeg binary available (via `ffmpeg-static` package)
- [x] Construct encoding command in `encode-webcam-recording` handler:
  ```bash
  ffmpeg -i input.webm \
    -c:v libx264 -preset medium -crf 23 -r 30 \
    -c:a aac -b:a 128k \
    output.mp4
  ```
- [x] Extract thumbnail:
  ```bash
  ffmpeg -i input.webm -ss 0 -vframes 1 thumbnail.jpg
  ```
- [x] Test: Command executes, MP4 file valid, thumbnail generated

### 4.5 Handle App Close During Recording

- [x] In main process (`src/main/main.ts`):
  - Listen for `before-quit` event
  - If recording active (check via IPC or global state flag):
    - Show dialog: "Recording in progress. Save or discard?"
    - If "Save": Complete encoding, save file, then quit
    - If "Discard": Delete temp file, quit immediately
- [x] Test: Close app during recording → prompt shown → "Save" completes recording
- [x] Test: Close app during recording → "Discard" deletes temp file

---

## 5. Manual Testing

### Happy Path Tests

- [x] **Test 1: Record 10-second video with audio**
  - Click "Record Webcam" → Grant permission → Live preview shows → Start → Record 10 sec → Stop
  - Verify: "Saving..." spinner → Modal closes → Clip in Library with name "Webcam_YYYYMMDD_HHMMSS"
  - Verify: Thumbnail shows recorded content, duration ~10 sec, audio synced (<100ms drift)

- [x] **Test 2: Multi-camera recording** (if multiple cameras available)
  - Click "Record Webcam" → Select second camera from dropdown → Preview changes → Record 5 sec
  - Verify: Recording uses selected camera (visually distinct)

- [x] **Test 3: Multiple back-to-back recordings**
  - Record video #1 (5 sec) → appears in Library
  - Record video #2 (5 sec) → appears in Library
  - Verify: Both clips exist, distinct filenames, both playable

### Edge Case Tests

- [x] **Test 4: Permission denied, then granted**
  - Click "Record Webcam" → Deny camera permission
  - Verify: Error message shown: "Camera permission required..."
  - Click "Retry" → Grant permission → Preview shown → Record 5 sec → Success

- [x] **Test 5: Camera in use by another app**
  - Open Facetime or second video app → Click "Record Webcam"
  - Verify: Error message: "Camera already in use. Close other apps and try again."
  - Close Facetime → Retry → Success

- [x] **Test 6: Very short recording (1 second)**
  - Start → Stop immediately (1 sec elapsed)
  - Verify: Encoding completes, clip imports, duration ~1 sec

- [x] **Test 7: Long recording (5 minutes)**
  - Record for 5 minutes continuously
  - Verify: File size ~250MB (reasonable for 5min 1080p)
  - Verify: Playback smooth, audio/video synced throughout
  - Verify: Memory stable during encoding (no leaks)

- [x] **Test 8: Microphone denied, camera granted**
  - Grant camera, Deny microphone
  - Verify: Modal shows option "Record camera only (no audio)?"
  - Click "Yes" → Record 5 sec
  - Verify: Clip imports, plays as video-only (no audio track)

- [x] **Test 9: App closed during recording**
  - Start recording → record 3 sec → Close app window
  - Verify: Prompt appears: "Recording in progress. Save or discard?"
  - Click "Save" → Recording completes, file saved, clip appears on relaunch

- [x] **Test 10: App closed during encoding**
  - Record 5 sec → Click Stop → encoding starts → Immediately close app
  - Verify: Partial file cleaned up on startup, no corrupt clips in Library

### Error Handling Tests

- [x] **Test 11: No camera connected**
  - Disconnect all cameras → Click "Record Webcam"
  - Verify: Error: "No camera found. Connect a webcam and try again."

- [x] **Test 12: Corrupted recorded data** (mock scenario)
  - Mock invalid Blob passed to IPC
  - Verify: Encoding fails gracefully with error message, no crash, user can retry

- [x] **Test 13: Disk full during encoding**
  - Fill disk to capacity → Record → Encode
  - Verify: Error: "Disk full. Clean up and try again."
  - Verify: Partial file cleaned up, no orphaned temp files

### Performance Tests

- [x] **Test 14: Live preview responsiveness**
  - Open modal with live preview
  - Verify: Preview runs at 30fps+ (no stutter/lag)

- [x] **Test 15: Audio/video sync**
  - Record video of clock/timer in frame + background music
  - Export clip
  - Verify: Audio sync within 100ms (audio not noticeably ahead/behind video)

- [x] **Test 16: Memory stability during long recording**
  - Record for 5 minutes → Monitor memory usage
  - Verify: Memory growth <100MB during recording; stable during encoding

### Cross-Platform Testing

- [x] Test on macOS (primary platform)
- [x] Test on Windows (best-effort)
- [x] Verify camera/mic permission dialogs appear correctly on both platforms
- [x] Verify FFmpeg encoding works on both platforms

---

## 6. Performance Requirements

- [x] Verify targets from PRD:
  - Preview 30fps minimum (live video)
  - Recording at native resolution (1080p typical)
  - Audio/video sync drift <100ms
  - File size ~50MB per minute at 1080p H.264
- [x] Test: Live preview frame rate (use DevTools Performance profiler)
- [x] Test: Audio sync (play back recording, verify <100ms drift)
- [x] Test: Memory usage during 5min recording (<1GB total app memory)

---

## 7. Definition of Done

- [x] All acceptance criteria from user story (AC-1 through AC-12) pass
- [x] All test gates from PRD Section 9 pass (happy path, edge cases, errors, performance)
- [x] `WebcamRecordingModal.tsx` implemented with full state management
- [x] `WebcamRecordButton.tsx` added to toolbar
- [x] IPC handlers (`encode-webcam-recording`, `check-camera-permission`, `check-microphone-permission`) implemented in `src/main/ipc-handlers/webcam.ts`
- [x] FFmpeg encoding command working (H.264 + AAC output)
- [x] Auto-import to Library functional (recorded clip appears immediately)
- [x] All happy path tests pass (Test 1-3)
- [x] All edge case tests pass (Test 4-10)
- [x] All error handling tests pass (Test 11-13)
- [x] Performance targets met: Preview 30fps+, audio sync <100ms, memory stable
- [x] Cross-platform tested: macOS + Windows (camera/mic access)
- [x] No crashes, no orphaned temp files
- [x] Code has comments for complex WebRTC logic
- [x] No console warnings or errors during recording/encoding

---

## 8. PR & Merge

⚠️ **CRITICAL**: DO NOT COMMIT UNTIL USER CONFIRMS ALL TEST GATES PASS

- [x] Create branch `feat/webcam-recording` from `develop`
- [x] User confirms all test gates pass ← WAIT FOR THIS
- [x] User says "ready to commit" or "looks good"
- [x] THEN: Commit changes with message:
  ```
  feat(recording): add webcam recording with live preview

  - Implement WebRTC camera + microphone capture
  - Add WebcamRecordingModal component with live preview
  - Add FFmpeg encoding to H.264+AAC MP4
  - Auto-import recorded clips to Library
  - Handle permission denials and camera-in-use errors
  - Support multi-camera selection
  - Add "Record Webcam" button to toolbar

  Refs: prds/pr-12-prd.md
  ```
- [x] THEN: Create PR to `develop` with:
  - **Title**: `feat(recording): PR-12 - Webcam Recording`
  - **Description**:
    - Link to PRD: `docs/prds/pr-12-prd.md`
    - Summary of changes (components, IPC handlers, FFmpeg integration)
    - Manual test results (all tests passed)
    - Screenshots/video of recording flow (optional)
- [x] Code reviewed
- [x] Merge to `develop`

---

## Notes

- **WebRTC in Renderer**: Camera access via `getUserMedia()` runs in Renderer process; encoding via FFmpeg runs in Main process
- **FFmpeg Binary**: Ensure `ffmpeg-static` package installed and binary path accessible
- **Recording Storage**: Files persist in `app.getPath('userData')/recordings/` (NOT temp!)
- **Audio Sync**: WebRTC MediaRecorder handles sync natively; verify <100ms drift in playback
- **Permission Flow**: Browser permission dialog blocks until user grants/denies; show "Requesting permission..." spinner
- **Cross-Platform**: WebRTC APIs work on macOS + Windows; test both platforms before merge
- **Blockers**: Document immediately if FFmpeg encoding fails or WebRTC API unavailable in Electron
- **Dependencies**: None (can build in parallel with other features). Depends only on MVP (existing Library, session state).

---

**Status**: ✅ COMPLETE - All tasks completed and tested  
**Next Step**: Ready for merge to develop branch