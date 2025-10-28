# PRD: Video Import & Library Management

**Feature**: Video Import & Library

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 2

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md)

---

## 1. Summary

Enable users to import video files (MP4/MOV) into ollo's Library panel via drag-and-drop or file picker, extract metadata with FFmpeg, generate thumbnails, and display clips with filename and duration for selection and preview.

---

## 2. Problem & Goals

**Problem**: Users have video files on their computer and need to import them into ollo before any editing workflow can begin. Without a functional import system and library management, users cannot access their video content for editing.

**Why now**: This is Phase 2 of the MVP, building on top of the application shell from PR-1. Video import is the critical first step in the user's editing workflow.

**Goals** (ordered, measurable):
  - [ ] G1 — User can import video files into Library via drag-and-drop from Finder within 2 seconds per file
  - [ ] G2 — User can import video files via file picker dialog with multiple selection support
  - [ ] G3 — Library displays all imported clips with thumbnails, filenames, and durations in a scrollable list
  - [ ] G4 — FFmpeg successfully extracts metadata (duration, resolution, framerate, codec) for all supported formats

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing timeline functionality (PR-3)
- [ ] Not implementing video playback yet (PR-4)
- [ ] Not implementing drag from Library to Timeline (PR-3)
- [ ] Not implementing clip deletion from Library (defer to future PR)
- [ ] Not supporting formats beyond MP4 and MOV (per prd-v1.md)
- [ ] Not implementing video recording or capture
- [ ] Not implementing file organization (folders, tags, search)
- [ ] Not implementing duplicate detection (same file can be imported multiple times per prd-v1.md)
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- File import completes within 2 seconds per file (metadata extraction + thumbnail generation)
- Library updates immediately when files are imported (no delay in UI)
- Thumbnail generates within 1 second per file
- Drag-and-drop provides visual feedback (hover state)
- Error messages shown for unsupported formats within 500ms

**System** (from prd-v1.md):
- App load time remains < 5 seconds with 10 imported clips
- Memory usage < 1GB with 10 clips in Library
- FFmpeg metadata extraction completes in < 2 seconds per file
- Thumbnail files stored in temp directory (~/Library/Application Support/ollo/thumbnails/)
- No UI blocking during import operations

**Quality**:
- 0 blocking bugs
- All video formats supported (MP4, MOV) import successfully
- Corrupted files handled gracefully with error message
- All acceptance gates pass
- Crash-free import >99.9%

---

## 5. Users & Stories

- As a video editor, I want to drag video files from Finder into ollo so that I can quickly import content for editing
- As a content creator, I want to see thumbnails of my videos in the Library so that I can visually identify clips
- As a new user, I want clear visual feedback when dragging files so that I know where to drop them
- As a user with many clips, I want to see duration and filename for each clip so that I can find the right content
- As a user importing files, I want to know immediately if a file format is unsupported so that I don't waste time

---

## 6. Experience Specification (UX)

**Entry Points**: Drag files from Finder to Library panel, or click "Import Videos" button

**Drag-and-Drop**: Library panel highlights with dashed border (#0066cc) on drag-over, shows loading spinner per file on drop, clip card appears when complete

**File Picker**: "Import Videos" button opens native macOS picker filtered to .mp4/.mov, multiple selection enabled

**Library Display**: Scrollable vertical list of clip cards with thumbnail (160x90px, 16:9), filename (truncated), duration (MM:SS, overlaid on thumbnail)

**States**:
- Empty: "Drag & drop video files or click Import to get started"
- Loading: Spinner + "Importing [filename]..." + progress ("1 of 3...")
- Error: Toast notifications (red for unsupported/corrupted/4GB+, yellow for 1GB+)

**Performance** (from prd-v1.md): Metadata <2s, thumbnail <1s, scrolling 60fps, UI non-blocking

---

## 7. Functional Requirements (Must/Should)

### MUST Requirements:

**M1: Drag-and-Drop Import**
- MUST accept video files dragged into Library panel or app window
- MUST filter to only process .mp4 and .mov files
- MUST provide visual feedback (dashed border highlight) when dragging over drop zone
- MUST support multiple files dropped simultaneously
- MUST show loading state per file during import
- [Gate] When user drags MP4 file over app → Library panel highlights with dashed border
- [Gate] When user drags .txt file over app → no highlight shown (file type filtered)
- [Gate] When user drops 3 MP4 files → all 3 files import and appear in Library
- [Gate] When user drops file → loading spinner shows with filename

**M2: File Picker Import**
- MUST provide "Import Videos" button in Library panel
- MUST open native macOS file picker (NSOpenPanel via Electron dialog)
- MUST filter file picker to show only .mp4 and .mov files
- MUST enable multiple file selection in picker
- MUST process selected files same as drag-and-drop
- [Gate] When user clicks "Import Videos" → native file picker opens
- [Gate] When viewing file picker → only MP4 and MOV files visible
- [Gate] When user selects 2 files and clicks Open → both files import

**M3: FFmpeg Metadata Extraction**
- MUST extract duration (in seconds) from video file
- MUST extract resolution (width, height in pixels)
- MUST extract framerate (fps)
- MUST extract video codec name
- MUST complete extraction in < 2 seconds per file for typical 1080p video
- MUST handle extraction errors gracefully (show error, don't crash)
- [Gate] When importing 1080p H.264 MP4 → metadata extracted in < 2 seconds
- [Gate] When viewing imported clip → duration shows correct MM:SS format
- [Gate] When inspecting metadata → resolution, framerate, codec are correct
- [Gate] When importing corrupted file → error message shown, app remains stable

**M4: Thumbnail Generation**
- MUST extract first frame (at 0.1 seconds) as JPEG thumbnail
- MUST store thumbnail in temp directory: ~/Library/Application Support/ollo/thumbnails/
- MUST generate 16:9 aspect ratio thumbnail at 320x180px resolution
- MUST complete generation in < 1 second per file
- MUST use UUID filename for thumbnail to avoid conflicts
- [Gate] When file imports → thumbnail appears in Library within 1 second
- [Gate] When viewing thumbnail → image is first frame of video
- [Gate] When checking file system → thumbnail stored in correct directory
- [Gate] When importing multiple files → no thumbnail filename conflicts

**M5: Library Display**
- MUST display clips in scrollable vertical list
- MUST show thumbnail, filename, duration for each clip
- MUST truncate long filenames with ellipsis
- MUST format duration as MM:SS (e.g., "02:45" for 2 minutes 45 seconds)
- MUST overlay duration on bottom-right of thumbnail with dark semi-transparent background
- MUST show empty state when no clips imported
- MUST store file paths (not embedded video data) in app state
- [Gate] When Library has 10 clips → scrolling is smooth at 60fps
- [Gate] When viewing clip card → thumbnail, filename, duration all visible
- [Gate] When filename is long → text truncates with ellipsis, doesn't wrap
- [Gate] When duration is 125 seconds → displays as "02:05"

**M6: File Validation**
- MUST validate file extension (.mp4 or .mov only)
- MUST check file size and warn if 1GB+ (but allow import)
- MUST block files 4GB+ with error message
- MUST validate file is readable by FFmpeg before adding to Library
- MUST show appropriate error messages for each validation failure
- [Gate] When user imports .avi file → error toast shows "Unsupported format"
- [Gate] When user imports 1.5GB MP4 → yellow warning toast, import proceeds
- [Gate] When user imports 5GB MP4 → red error toast, import blocked
- [Gate] When user imports corrupted MP4 → error toast shows, app doesn't crash

### SHOULD Requirements:

**S1: Import Progress**
- SHOULD show progress indicator for batch imports ("Importing 2 of 5...")
- SHOULD show specific message for slow imports ("Processing large file...")
- SHOULD fade in clip cards with smooth animation (200ms)

**S2: Visual Polish**
- SHOULD use hover state on "Import Videos" button
- SHOULD show file count in empty state ("Library (0 clips)")
- SHOULD sort clips by import order (most recent at top)

---

## 8. Data Model

### Video Clip Structure

```typescript
// Main data structure for imported clips
interface VideoClip {
  id: string; // UUID v4
  path: string; // Absolute file path (e.g., "/Users/username/Videos/clip.mp4")
  filename: string; // Display name (e.g., "clip.mp4")
  duration: number; // Total duration in seconds (e.g., 125.5)
  thumbnail: string; // Path to thumbnail file (e.g., "~/Library/.../uuid.jpg")
  metadata: VideoMetadata;
  importedAt: number; // Timestamp (Date.now())
}

interface VideoMetadata {
  width: number; // Horizontal resolution (e.g., 1920)
  height: number; // Vertical resolution (e.g., 1080)
  framerate: number; // Frames per second (e.g., 30)
  codec: string; // Video codec (e.g., "h264", "hevc")
}

// App state updated to include library
interface AppState {
  library: VideoClip[]; // Array of imported clips
  timeline: TimelineClip[]; // Empty for this PR
  selectedClipId: string | null; // ID of selected clip (for future preview)
  currentPlayheadPosition: number; // 0 for this PR
  isExporting: boolean; // false for this PR
  exportProgress: number; // 0 for this PR
  timelineZoom: number; // 1.0 for this PR
  timelineScrollPosition: number; // 0 for this PR
}
```

**Validation Rules**:
- `id` must be unique UUID v4
- `path` must be absolute file system path that exists
- `filename` must not be empty string
- `duration` must be positive number > 0
- `thumbnail` path must exist in file system
- `metadata.width` and `metadata.height` must be positive integers
- `metadata.framerate` must be positive number > 0
- `metadata.codec` must be non-empty string
- `importedAt` must be valid Unix timestamp

**File Operations**:
- Store file paths only (linked files, not embedded)
- Thumbnails stored in: `~/Library/Application Support/ollo/thumbnails/`
- Thumbnail naming: `{uuid}.jpg` (matches clip.id)
- Clean up thumbnails on app quit (defer to future PR)

---

## 9. API / Service Contracts

### Electron IPC Handlers

```typescript
// src/preload/index.ts
interface ElectronAPI {
  selectFiles: () => Promise<string[]>;
  // Opens file picker, returns selected paths (empty array if cancelled)
  // Implementation: dialog.showOpenDialog() with filters: ['mp4', 'mov']
  
  getMetadata: (filePath: string) => Promise<VideoMetadata>;
  // Extracts duration, resolution, framerate, codec via FFmpeg (< 2s)
  // Throws if file unreadable/corrupted or FFmpeg fails
  
  getThumbnail: (filePath: string, clipId: string) => Promise<string>;
  // Generates 320x180px JPEG from frame at 0.1s (< 1s)
  // Returns path: ~/Library/Application Support/ollo/thumbnails/{clipId}.jpg
  // Throws if FFmpeg fails or directory not writable
}
```

---

## 10. UI Components to Create/Modify

### New Files to Create:

**Main Process**:
- `src/main/ipcHandlers.ts` — Electron IPC handlers for file selection, metadata, thumbnails
- `src/main/ffmpeg.ts` — FFmpeg wrapper functions for metadata extraction and thumbnail generation
- `src/main/fileSystem.ts` — File system utilities for path validation, temp directory setup

**Renderer Process**:
- `src/components/LibraryClipCard.tsx` — Individual clip card component (thumbnail, filename, duration)
- `src/hooks/useFileImport.ts` — Custom hook for drag-and-drop and file picker logic
- `src/utils/formatDuration.ts` — Utility to format seconds to MM:SS string
- `src/types/video.ts` — TypeScript interfaces for VideoClip, VideoMetadata

### Files to Modify:

**From PR-1**:
- `src/components/Library.tsx` — Add import button, drag-and-drop zone, clip list rendering
- `src/App.tsx` — Add library state management (useState for VideoClip array)
- `src/preload.ts` — Add IPC method definitions to contextBridge
- `src/renderer/types/electron.d.ts` — Add TypeScript definitions for new IPC methods

---

## 11. Integration Points

**Electron IPC Integration**:
- Renderer process calls `window.electron.selectFiles()` → Main process opens file dialog
- Renderer process calls `window.electron.getMetadata(path)` → Main process runs FFmpeg
- Renderer process calls `window.electron.getThumbnail(path, id)` → Main process generates thumbnail
- All IPC calls are async (Promise-based)

**FFmpeg Integration**:
- Use `ffmpeg-static` npm package for bundled binary
- Main process spawns FFmpeg child processes
- Parse stderr output for metadata (duration, resolution, framerate, codec)
- Use `-i` flag for metadata extraction
- Use `-ss 00:00:00.1 -vframes 1 -vf scale=320:180` for thumbnail generation

**File System**:
- Read file paths provided by user
- Validate file exists and is readable
- Create temp directory if doesn't exist: `~/Library/Application Support/ollo/thumbnails/`
- Write thumbnail JPEG files to temp directory
- Store absolute paths in app state (don't embed video data)

**State Management** (React):
- Use `useState<VideoClip[]>` for library array
- Add new clips to array when import completes
- Update empty state conditional rendering based on array length
- No persistence yet (auto-save comes in PR-5)

**Cross-Platform**:
- macOS primary target (use Cocoa file dialogs)
- File paths use forward slashes (compatible with macOS)
- Temp directory uses macOS convention (`~/Library/Application Support/`)
- Windows support deferred (out of scope for MVP)

---

## 12. Test Plan & Acceptance Gates

### Happy Path

- [ ] **Drag-and-Drop Import** (single MP4 file)
  - Gate: Library highlights with dashed border while dragging
  - Gate: Clip card appears within 3 seconds with correct thumbnail, filename, duration (MM:SS format)

- [ ] **Multiple File Import** (3 MP4s via drag-and-drop)
  - Gate: Progress shows "Importing 1 of 3...", "2 of 3...", "3 of 3..."
  - Gate: All 3 clip cards appear, sorted by import order

- [ ] **File Picker Import**
  - Gate: "Import Videos" button opens native picker filtered to .mp4/.mov
  - Gate: Multi-select works, all selected files import successfully

- [ ] **Metadata & Thumbnails** (1080p H.264 MP4)
  - Gate: Metadata extracted in < 2 seconds, thumbnail in < 1 second
  - Gate: Duration formatted correctly (e.g., "02:15" for 135s), thumbnail shows first frame

### Edge Cases

- [ ] **Unsupported Format** (.avi file)
  - Gate: Error toast "Unsupported format", no clip added, app stable

- [ ] **Large File** (1.5GB MP4)
  - Gate: Yellow warning toast, import proceeds successfully

- [ ] **File Too Large** (5GB MP4)
  - Gate: Red error toast, import blocked

- [ ] **Corrupted File**
  - Gate: Red error toast "Could not read [filename]", app doesn't crash

- [ ] **Empty Library**
  - Gate: Shows "Drag & drop video files or click Import to get started"

### Visual/UI Verification

- [ ] **Clip Cards** (5 videos)
  - Gate: Thumbnails 160x90px (16:9), filenames truncated with ellipsis, durations MM:SS with dark overlay

- [ ] **Library Scrolling** (15 clips)
  - Gate: Scrolls smoothly at 60fps, scrollbar appears automatically

- [ ] **Loading States** (2GB file)
  - Gate: Spinner + filename immediate, "Processing large file..." after 3s, smooth fade-in on complete

### Performance (from prd-v1.md)

- [ ] **Import Speed** (1080p H.264 MP4, 500MB, 2min)
  - Gate: Metadata < 2s, thumbnail < 1s, total < 3s

- [ ] **Responsiveness** (3 files importing)
  - Gate: UI non-blocking (buttons clickable, scrolling works)

- [ ] **Memory** (10 clips, ~5GB source files)
  - Gate: App memory < 1GB, stable over 15min

- [ ] **Scrolling** (10+ clips)
  - Gate: 60fps, no stuttering

### FFmpeg Integration

- [ ] **Metadata Parsing** (H.264 MP4, 1920x1080, 30fps)
  - Gate: Width, height, framerate, codec all parsed correctly, duration accurate to 0.1s

- [ ] **Thumbnail Quality**
  - Gate: Clear image, 16:9 aspect ratio, 320x180px, < 50KB file size

- [ ] **Mixed Formats** (MP4 and MOV)
  - Gate: Both process successfully with metadata and thumbnails

---

## 13. Definition of Done

- [ ] Electron IPC handlers implemented (`selectFiles`, `getMetadata`, `getThumbnail`)
- [ ] FFmpeg integration working (metadata extraction + thumbnail generation)
- [ ] Drag-and-drop import functional with visual feedback
- [ ] File picker import functional with format filtering
- [ ] Library component displays all imported clips with thumbnails
- [ ] Clip cards show thumbnail, filename, duration correctly formatted
- [ ] Empty state displayed when no clips imported
- [ ] Loading states shown during import operations
- [ ] Error handling for unsupported formats, large files, corrupted files
- [ ] File size validation (warn 1GB+, block 4GB+)
- [ ] Temp directory created for thumbnails
- [ ] All acceptance gates pass (Section 12)
- [ ] No console errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Performance targets met (< 2s metadata, < 1s thumbnail, < 1GB memory)
- [ ] Manual testing with real MP4 and MOV files completed
- [ ] Cross-platform testing on macOS completed
- [ ] Code follows .cursorrules TypeScript/React/Electron patterns
- [ ] Documentation: README updated with import instructions

---

## 14. Risks & Mitigations

**Risk 1: FFmpeg metadata extraction fails for certain codecs**
- Impact: Import fails, user can't add video to Library
- Likelihood: Medium (some codecs less common)
- Mitigation: Test with variety of MP4/MOV files (H.264, HEVC, different framerates)
- Mitigation: Provide clear error message if FFmpeg fails
- Mitigation: Log FFmpeg errors for debugging

**Risk 2: Thumbnail generation slow for large/high-res files**
- Impact: Import feels slow, poor user experience
- Likelihood: Medium (4K files, long videos)
- Mitigation: Extract frame at 0.1 seconds (near beginning, usually I-frame)
- Mitigation: Scale thumbnail to small size (320x180px) to speed up encoding
- Mitigation: Show progress indicator for imports taking >3 seconds
- Fallback: If thumbnail fails, show placeholder image (defer to future PR)

**Risk 3: Memory usage with many clips**
- Mitigation: Store paths only (not video data), small thumbnails (< 50KB), monitor with 10+ clips

**Risk 4: Drag-and-drop conflicts with future timeline drag**
- Mitigation: Use Library-specific drop zone selectors, check dataTransfer type to differentiate file vs clip drags

---

## 15. Rollout & Telemetry

**Feature Flag**: No (core MVP functionality)

**Manual Validation Steps**:
1. Launch app in dev mode: `npm start`
2. Drag single MP4 file from Finder to Library panel
3. Verify drop zone highlights, import completes, clip card appears
4. Click "Import Videos" button
5. Select 2 MP4 files, click Open
6. Verify both files import successfully
7. Check thumbnails are correct (first frame)
8. Check durations formatted correctly (MM:SS)
9. Import 10+ clips, verify scrolling is smooth
10. Test unsupported format (.avi) → verify error message
11. Test large file (1.5GB) → verify warning toast
12. Build production: `npm run make`
13. Test same scenarios in built app
14. Monitor memory usage with Activity Monitor

**Metrics to Monitor**:
- Import success rate (manual observation for MVP)
- Metadata extraction time (manual stopwatch)
- Thumbnail generation time (manual stopwatch)
- Memory usage with 10 clips (Activity Monitor)
- FFmpeg error rate (check console logs)

---

## 16. Open Questions

- Q1: Should we support video preview from Library (click clip → plays in preview panel)?
  - **Decision**: Not in this PR — defer to PR-4 (Video Preview). This PR focuses only on import and display.
  
- Q2: Should duplicate imports be prevented (detect if same file already in Library)?
  - **Decision**: No per prd-v1.md — allow duplicates. User may want same clip multiple times in timeline.
  
- Q3: Should we implement clip removal from Library?
  - **Decision**: Defer to future PR — not critical for MVP Phase 2. User can restart app to clear Library for now.

- Q4: What happens if thumbnail generation fails?
  - **Decision**: Show placeholder thumbnail (gray box with video icon). Don't block import. Log error for debugging.

- Q5: Should we extract additional metadata (bitrate, audio codec, file size)?
  - **Decision**: Not for MVP — only extract what's needed for editing workflow (duration, resolution, framerate, codec). Can add more later.

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:
- [ ] Clip preview from Library (click to play) — PR-4
- [ ] Drag from Library to Timeline — PR-3
- [ ] Clip deletion from Library
- [ ] Clip organization (folders, tags, search, filters)
- [ ] Duplicate detection
- [ ] Thumbnail cleanup on app quit
- [ ] File path validation/relinking if source moved
- [ ] Batch import progress bar (% complete)
- [ ] Import history/recent files
- [ ] Custom thumbnail selection (choose frame)
- [ ] Thumbnail caching/optimization
- [ ] Support for additional formats (AVI, MKV, etc.)
- [ ] Video preview on hover in Library
- [ ] Clip metadata editing (rename, add notes)

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User can import video files into Library and see them displayed with thumbnails, filenames, and durations.

2. **Primary user and critical action?**
   - Video editor who needs to import video files from Finder as the first step in their editing workflow.

3. **Must-have vs nice-to-have?**
   - Must: Drag-and-drop, file picker, FFmpeg metadata extraction, thumbnail generation, Library display, error handling
   - Nice: Preview from Library (deferred), clip deletion (deferred), duplicate detection (deferred)

4. **Video processing requirements?**
   - FFmpeg metadata extraction (duration, resolution, framerate, codec) in < 2 seconds
   - FFmpeg thumbnail generation (first frame, 320x180px JPEG) in < 1 second
   - Support MP4 and MOV formats only
   - Handle corrupted files gracefully

5. **Performance constraints?**
   - Metadata extraction < 2 seconds per file
   - Thumbnail generation < 1 second per file
   - App memory < 1GB with 10 clips
   - Library scrolling 60fps with 10+ clips
   - UI remains responsive during import (no blocking)

6. **Error/edge cases to handle?**
   - Unsupported formats (.avi, .mkv, etc.)
   - Large files (1GB+ warning, 4GB+ blocked)
   - Corrupted files (FFmpeg parse failure)
   - File doesn't exist or not readable
   - Temp directory permissions issues
   - Disk space insufficient for thumbnails

7. **Data model changes?**
   - Add `VideoClip` interface (id, path, filename, duration, thumbnail, metadata, importedAt)
   - Add `VideoMetadata` interface (width, height, framerate, codec)
   - Update `AppState.library` to be array of `VideoClip`

8. **Electron IPC handlers required?**
   - `selectFiles()` — Open file picker, return selected paths
   - `getMetadata(filePath)` — Extract metadata with FFmpeg
   - `getThumbnail(filePath, clipId)` — Generate thumbnail with FFmpeg

9. **UI entry points and states?**
   - Entry: Drag files to Library panel, click "Import Videos" button
   - States: Empty, loading (per file), populated (clip cards), error (toast notifications)

10. **File system implications?**
    - Read video files from user-selected paths
    - Write thumbnail files to: ~/Library/Application Support/ollo/thumbnails/
    - Create temp directory if doesn't exist
    - Store absolute file paths in app state (linked files)

11. **Dependencies or blocking integrations?**
    - Depends on PR-1 (Application Launch & Window Setup) being complete
    - Blocks PR-3 (Timeline drag-to-reorder) and PR-4 (Video Preview)

12. **Rollout strategy and metrics?**
    - Manual testing with real MP4/MOV files
    - No feature flag (core functionality)
    - Monitor: import time, memory usage, FFmpeg errors

13. **What is explicitly out of scope?**
    - Video playback/preview (PR-4)
    - Timeline interactions (PR-3)
    - Clip deletion from Library
    - Duplicate detection
    - Clip organization (folders, tags, search)
    - Windows/Linux support

---

## Authoring Notes

- This PR is foundational for all video editing features — quality is critical
- Test thoroughly with variety of MP4/MOV files (different codecs, resolutions, framerates)
- FFmpeg integration is new — allow extra time for debugging
- Error handling must be robust — corrupted files shouldn't crash app
- Performance testing with 10+ clips is mandatory
- Keep drag-and-drop handlers isolated to Library panel to avoid future conflicts
- Thumbnail generation should fail gracefully (show placeholder if needed)
- File path validation will be important in future PRs when paths are actually used for preview/export

