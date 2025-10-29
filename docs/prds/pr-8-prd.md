# PRD: Video Export

**Feature**: Video Export to MP4

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 8

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md) | [pr-4-prd.md](./pr-4-prd.md) | [pr-5-prd.md](./pr-5-prd.md) | [pr-6-prd.md](./pr-6-prd.md) | [pr-7-prd.md](./pr-7-prd.md)

---

## 1. Summary

Enable users to export their edited video sequence as a single MP4 file. The export process applies all trim points, concatenates clips in timeline order, handles mixed source formats (different resolutions, frame rates, aspect ratios), and provides real-time progress feedback. Export produces a playable MP4 file that can be viewed in external video players.

---

## 2. Problem & Goals

**Problem**: Users can import videos (PR-2), arrange them on a timeline (PR-3), preview individual clips (PR-4), trim clips (PR-6), and preview the sequence (PR-7), but cannot export their final edited video as a standalone MP4 file. Without export, users cannot share or use their edited videos outside the application.

**Why now**: This is Phase 8 of the MVP, the final functional phase before polish and testing (Phase 9). Export is the culmination of the video editing workflow - without it, the MVP is incomplete. Users need to produce a final video file that plays in external players. Export completes the core editing loop: import → edit → preview → export.

**Goals** (ordered, measurable):
  - [ ] G1 — User can click "Export Video" button to initiate export, opens native file picker to choose save location, defaults to `ollo_export_[timestamp].mp4`
  - [ ] G2 — Export applies all trim points from timeline clips (using FFmpeg -ss and -t flags), producing trimmed segments that match user's editing
  - [ ] G3 — Export concatenates all timeline clips in order (using FFmpeg concat demuxer), creating a single continuous video file
  - [ ] G4 — Export handles mixed source formats: different resolutions upscale to highest (max 1080p), different frame rates convert to 30fps, different aspect ratios letterbox to match first clip
  - [ ] G5 — Export shows real-time progress bar (0-100%) by parsing FFmpeg stderr output, updates every 1-2 seconds during export
  - [ ] G6 — Export completes successfully, produces valid MP4 file that plays in external video players (QuickTime, VLC, etc.) with synchronized audio
  - [ ] G7 — Export displays success message with file path and "Reveal in Finder" button, or error message if export fails

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing custom export settings UI (fixed preset per prd-v1.md: MP4, H.264, AAC, 30fps, max 1080p, ~5Mbps bitrate)
- [ ] Not implementing export format options (MP4 only for MVP)
- [ ] Not implementing export quality presets (single medium-quality preset)
- [ ] Not implementing batch export (one sequence at a time)
- [ ] Not implementing export queue (no background exports, one at a time)
- [ ] Not implementing export cancellation during processing (may add later, but not in MVP)
- [ ] Not implementing video effects, transitions, or filters during export (hard cuts only)
- [ ] Not implementing audio mixing or volume adjustments (original volume only)
- [ ] Not implementing export to cloud services (local file system only)
- [ ] Not implementing export templates or presets selection
- [ ] Not implementing frame-accurate export options (second-level precision acceptable)
- [ ] Not implementing export of audio-only sequences
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

Reference `prd-v1.md` for detailed performance targets:

**User-visible**:
- Export completes successfully, produces valid MP4 that plays in external players (QuickTime, VLC) with synchronized audio
- Progress bar updates smoothly (0-100%, every 1-2 seconds)
- Handles mixed source formats correctly (resolutions, frame rates, aspect ratios)
- Trim points match preview exactly
- Clear success/error messages with actionable feedback

**System** (per prd-v1.md):
- Export time: < 5 minutes for 2-minute 1080p video
- Progress updates: Every 1-2 seconds (non-blocking)
- Memory usage: < 1.5GB during export
- File size: ~35-40MB for 1080p 1-minute video (5Mbps bitrate)
- FFmpeg operations complete without errors

**Quality**: 0 blocking bugs, all acceptance gates pass, exported file plays correctly with synchronized audio

---

## 5. Users & Stories

- As a video editor, I want to export my edited sequence as an MP4 file so that I can share it with others or use it in other applications
- As a content creator, I want to see export progress in real-time so that I know how long the process will take
- As a user, I want my exported video to match what I see in preview so that trimmed clips and sequence order are preserved
- As a video editor, I want exported videos to handle mixed source formats automatically so that I don't have to manually convert clips before importing
- As a user, I want to easily find my exported video file so that I can open it in other applications or share it
- As a content creator, I want export to complete successfully even with different video formats so that I can mix clips from different sources

---

## 6. Experience Specification (UX)

**Entry Points**:
- "Export Video" button in video player panel (disabled when timeline is empty)
- Button shows loading/disabled state during export
- Keyboard shortcut: Cmd+E (when timeline has clips and not currently exporting)

**Export Flow**:
1. Click "Export Video" (or Cmd+E) → File picker opens (default: `ollo_export_YYYYMMDD_HHMMSS.mp4` in Documents)
2. User selects location → Export begins:
   - Button shows "Exporting..." (disabled)
   - Progress bar appears (0-100%, updates every 1-2 seconds)
   - UI remains responsive (user can view library/preview)
3. On completion → Success dialog with file path and "Reveal in Finder" button
4. On error → Error dialog with specific FFmpeg error message
5. After completion → Button re-enables, progress bar resets

**States**: Idle (enabled when timeline has clips), Disabled (empty timeline), Exporting (progress visible), Success/Error (dialogs)

**Performance**: Progress updates every 1-2 seconds (non-blocking), UI responsive, < 5 minutes for 2-minute 1080p video (per prd-v1.md)

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- MUST export timeline clips as single MP4 file using FFmpeg
- MUST apply trim points from timeline clips (use -ss and -t flags)
- MUST concatenate clips in timeline order (use concat demuxer)
- MUST re-encode with fixed preset: MP4, H.264 (libx264), AAC, 30fps, max 1080p, ~5Mbps bitrate
- MUST handle mixed resolutions (upscale to highest, max 1080p)
- MUST handle mixed frame rates (convert all to 30fps)
- MUST handle mixed aspect ratios (letterbox to match first clip's aspect ratio)
- MUST show real-time progress bar (0-100%) by parsing FFmpeg stderr
- MUST open native file picker for save location with default filename `ollo_export_[timestamp].mp4`
- MUST display success message with file path and "Reveal in Finder" button
- MUST display error message if export fails with specific error details
- MUST disable export button during export process
- MUST disable export button when timeline is empty
- MUST validate all source files exist before starting export
- MUST handle file system errors gracefully (permissions, disk space, invalid paths)
- MUST produce valid MP4 file that plays in external players (QuickTime, VLC)
- MUST maintain audio synchronization in exported video
- MUST auto-save project state before export starts (per prd-v1.md requirement)

**SHOULD**:
- SHOULD update progress bar every 1-2 seconds for smooth feedback
- SHOULD allow user to interact with app during export (view library, preview clips)
- SHOULD show estimated time remaining (if FFmpeg provides, optional enhancement)
- SHOULD validate exported file exists and is readable after completion
- SHOULD handle very long exports gracefully (10+ minute videos)

**Key Acceptance Gates** (see Section 12 for full test plan):
- [Gate] Export completes → MP4 plays in QuickTime/VLC with synchronized audio
- [Gate] Trim points applied correctly → Exported video matches preview
- [Gate] Mixed formats handled → All clips upscale to highest (max 1080p), convert to 30fps, letterbox to first clip's aspect ratio
- [Gate] Progress updates → Every 1-2 seconds, UI responsive, < 5 minutes for 2-minute 1080p video
- [Gate] Error handling → Clear messages, button re-enables, auto-save triggers before export

---

## 8. Data Model

**Export State** (added to AppState):
```typescript
interface AppState {
  // ... existing fields ...
  /** Export in progress flag */
  isExporting: boolean;
  /** Export progress percentage (0-100) */
  exportProgress: number;
  /** Export error message (null if no error) */
  exportError: string | null;
  /** Export output file path (set when export completes) */
  exportOutputPath: string | null;
}
```

**Export Parameters** (new interface):
```typescript
interface ExportParams {
  /** Timeline clips to export (sorted by order) */
  clips: TimelineClip[];
  /** Library clips map (for accessing source file paths) */
  libraryClips: Map<string, VideoClip>;
  /** Output file path (absolute path) */
  outputPath: string;
  /** Export settings (fixed preset) */
  settings: ExportSettings;
}

interface ExportSettings {
  /** Output format (always "mp4" for MVP) */
  format: 'mp4';
  /** Video codec (always "libx264" for MVP) */
  videoCodec: 'libx264';
  /** Audio codec (always "aac" for MVP) */
  audioCodec: 'aac';
  /** Output frame rate (always 30 for MVP) */
  framerate: 30;
  /** Target resolution width (calculated from sources, max 1920) */
  width: number;
  /** Target resolution height (calculated from sources, max 1080) */
  height: number;
  /** Video bitrate in Mbps (always ~5 for MVP) */
  videoBitrate: number;
  /** Audio bitrate in kbps (always 128 for MVP) */
  audioBitrate: 128;
  /** Aspect ratio mode: 'letterbox' (matches first clip) */
  aspectRatioMode: 'letterbox';
}
```

**Validation Rules**:
- Timeline must have at least 1 clip (export disabled if empty)
- All source files must exist and be readable before export starts
- All trim points must be valid (trimStart < trimEnd, trimEnd <= source duration)
- Output path must be writable (check permissions before starting)
- Output path directory must exist (create if needed, or show error)

**File Operations**:
- Write exported MP4 file to user-selected location
- Generate temporary files during export process (trimmed segments, concat list)
- Clean up temporary files after export completes (success or failure)
- Create output directory if it doesn't exist (with user permission)

---

## 9. API / Service Contracts

**Electron IPC Handlers** (main process):

```typescript
/**
 * Handler: export:start
 * Initiates video export process
 * Params: clips (TimelineClip[]), libraryClips (VideoClip[]), outputPath (string)
 * Returns: Promise<void>
 * Errors: Throws Error if export fails (file not found, encoding error, etc.)
 * Progress: Emits 'export:progress' events via IPC (0-100)
 */
window.electron.exportVideo(
  clips: TimelineClip[],
  libraryClips: VideoClip[],
  outputPath: string
): Promise<void>

/**
 * Event: export:progress
 * Emitted during export with progress percentage
 * Callback: (progress: number) => void (progress 0-100)
 */
window.electron.onExportProgress(
  callback: (progress: number) => void
): void

/**
 * Handler: export:showSaveDialog
 * Opens native save dialog for export file
 * Returns: Promise<string | null> (file path or null if cancelled)
 */
window.electron.showSaveDialog(
  defaultFilename: string
): Promise<string | null>

/**
 * Handler: export:revealInFinder
 * Opens macOS Finder to file location
 * Params: filePath (string)
 * Returns: Promise<void>
 * Errors: Handles gracefully if file not found
 */
window.electron.revealInFinder(
  filePath: string
): Promise<void>

/**
 * Handler: export:cancel (optional, not in MVP)
 * Cancels ongoing export (may not be implemented in MVP)
 * Returns: Promise<void>
 */
// Not implemented in MVP, may add later
```

**Pre/Post Conditions**: All source files exist and readable, output path writable, timeline has clips → Export completes, temp files cleaned up, progress events stop

**Error Handling**: File not found, permissions denied, FFmpeg errors, disk space full, invalid paths → Show clear error messages, cleanup temp files

**Parameters**: `clips: TimelineClip[]`, `libraryClips: VideoClip[]`, `outputPath: string`  
**Returns**: `Promise<void>` (rejects with Error on failure)

---

## 10. UI Components to Create/Modify

**Create**:
- `src/components/ExportDialog.tsx` — Success/error dialog with file path and "Reveal in Finder" button
- `src/components/ExportProgressBar.tsx` — Progress bar component (0-100%) for export status
- `src/hooks/useExport.ts` — Custom hook for export state management and IPC calls

**Modify**:
- `src/components/VideoPlayer.tsx` — Add "Export Video" button, wire up export functionality
- `src/components/PlayerControls.tsx` — Add export button to controls (if needed)
- `src/App.tsx` — Add export state (isExporting, exportProgress, exportError, exportOutputPath) to AppState
- `src/main/ipcHandlers.ts` — Add export IPC handlers (export:start, export:showSaveDialog, export:revealInFinder)
- `src/main/ffmpeg.ts` — Add export functions (generateExportCommand, parseFFmpegProgress, cleanupTempFiles)
- `src/preload.ts` — Add export API to contextBridge (exportVideo, onExportProgress, showSaveDialog, revealInFinder)
- `src/renderer/types/electron.d.ts` — Add export API type definitions

**Component Details**:
- **ExportDialog**: Props: `isOpen`, `success`, `filePath`, `error`, `onClose`, `onReveal` → Shows success/error message, file path, "Reveal in Finder" button
- **ExportProgressBar**: Props: `progress` (0-100), `isExporting`, `error` → Horizontal bar with percentage, red on error, hidden when not exporting
- **useExport**: Manages export state (isExporting, progress, error, outputPath), handles IPC calls and progress events

---

## 11. Integration Points

**Electron IPC Integration**:
- Export handlers in main process (ipcHandlers.ts)
- Export API exposed via preload script (contextBridge)
- Progress events via IPC event emitter (ipcRenderer.on)

**FFmpeg Integration**: Use bundled binary, generate trim/concat/re-encode commands, parse stderr for progress (`time=HH:MM:SS.mmm`), handle errors (see FFmpeg Pipeline Details section)

**File System**: Write to user-selected location, create/cleanup temp files, validate permissions/disk space before starting

**State Management**: Add export state to AppState, update from IPC progress events, reset after completion

**Auto-Save**: Trigger before export starts (per prd-v1.md), save to autosave.json, ensure no timing conflicts

**Cross-Platform**: macOS primary (native dialogs), Windows secondary (Electron API), handle absolute paths correctly

---

## 12. Test Plan & Acceptance Gates

**Define BEFORE implementation. Use checkboxes.**

Reference testing standards from `prd-v1.md`.

**Happy Path**:
  - [ ] User exports sequence with 1 clip → Exported MP4 plays correctly in external player
  - [ ] User exports sequence with 3 clips → All clips concatenated in order, plays correctly
  - [ ] User exports trimmed clips → Trim points applied correctly, exported video matches preview
  - [ ] User selects custom save location → File saved to selected location, "Reveal in Finder" works
  - [ ] Export progress updates smoothly → Progress bar shows 0-100% with updates every 1-2 seconds
  - [ ] Export completes successfully → Success dialog appears with file path
  - [ ] Gate: Exported MP4 file opens and plays correctly in QuickTime Player
  - [ ] Gate: Exported MP4 file opens and plays correctly in VLC
  - [ ] Gate: Audio stays synchronized throughout exported video
  - [ ] Gate: Export time is < 5 minutes for 2-minute 1080p video (per prd-v1.md)

**Mixed Source Formats**:
  - [ ] Export clips with different resolutions (1080p, 720p) → All upscale to 1080p in exported file
  - [ ] Export clips with different frame rates (30fps, 60fps) → All convert to 30fps in exported file
  - [ ] Export clips with different aspect ratios (16:9, 4:3) → All letterbox to match first clip (16:9)
  - [ ] Gate: Exported video has consistent resolution (1080p or highest), frame rate (30fps), aspect ratio
  - [ ] Gate: Letterboxing is correct (black bars on sides/top for 4:3 clips in 16:9 sequence)

**Edge Cases**:
  - [ ] Empty timeline → "Export Video" button disabled
  - [ ] Source file deleted before export → Error shows "Source file not found"
  - [ ] Insufficient disk space → Error shows "Not enough disk space"
  - [ ] Invalid output path → Error shows "Invalid save location"
  - [ ] User cancels file picker → Export doesn't start, no error shown
  - [ ] Very long sequence (10+ minutes) → Export completes successfully, progress updates smoothly
  - [ ] Very short clips (< 1 second) → Export handles correctly, minimum duration enforced
  - [ ] Gate: All edge cases handled gracefully with clear error messages

**Video Processing**:
  - [ ] FFmpeg trim operations work correctly → Trimmed segments match preview
  - [ ] FFmpeg concat operations work correctly → Clips concatenated in order
  - [ ] FFmpeg re-encoding works correctly → Output MP4 has correct codec, bitrate, resolution
  - [ ] FFmpeg progress parsing works correctly → Progress bar updates from stderr
  - [ ] Gate: FFmpeg operations complete without errors or warnings (check logs)
  - [ ] Gate: Temporary files are cleaned up after export (success or failure)

**Performance** (per prd-v1.md): Export time < 5 minutes for 2-minute 1080p, UI responsive, memory < 1.5GB, progress updates every 1-2 seconds

**Auto-Save**:
  - [ ] Auto-save triggers before export starts → Project state saves to autosave.json
  - [ ] Gate: Auto-save doesn't interfere with export process
  - [ ] Gate: Export doesn't interfere with auto-save timing (30-second interval)

**Manual Testing** (mandatory per prd-v1.md):
  - [ ] Test with real MP4 files (1080p, H.264)
  - [ ] Test with real MOV files (720p, H.264)
  - [ ] Test with mixed formats (MP4 + MOV in same sequence)
  - [ ] Test exported files in external players (QuickTime, VLC, Chrome)
  - [ ] Test export with 1, 3, 5, 10 clips
  - [ ] Test export with trimmed clips (various trim points)
  - [ ] Gate: All manual tests pass with real video files

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [ ] Electron IPC handlers implemented in main process (export:start, export:showSaveDialog, export:revealInFinder)
- [ ] React components implemented (ExportDialog, ExportProgressBar, useExport hook)
- [ ] "Export Video" button added to VideoPlayer component
- [ ] FFmpeg export pipeline implemented (trim, concat, re-encode)
- [ ] Progress tracking implemented (parse FFmpeg stderr)
- [ ] Mixed source format handling implemented (resolution, frame rate, aspect ratio)
- [ ] Auto-save triggers before export starts
- [ ] All acceptance gates pass (see Test Plan Section 12)
- [ ] Manual testing complete with real video files (MP4, MOV)
- [ ] Exported files play correctly in external players (QuickTime, VLC)
- [ ] Performance targets met (export time < 5 minutes for 2-minute 1080p video)
- [ ] Cross-platform testing done (macOS primary, Windows secondary if possible)
- [ ] Error handling comprehensive (file not found, permissions, disk space, encoding errors)
- [ ] Documentation updated (code comments, README if needed)
- [ ] No console warnings or errors
- [ ] TypeScript types correct (no `any` types without justification)

---

## 14. Risks & Mitigations

**Risk**: FFmpeg export fails with mixed source formats (different codecs, containers)
- **Mitigation**: Re-encode all clips to consistent format during export (don't use -c copy), test with various source formats

**Risk**: Export progress parsing is unreliable (FFmpeg stderr format varies)
- **Mitigation**: Implement robust parsing with fallback to time-based estimation, test with different FFmpeg versions

**Risk**: Export takes too long for large files (exceeds 5-minute target)
- **Mitigation**: Optimize FFmpeg settings (use hardware acceleration if available), show estimated time, allow cancellation (future enhancement)

**Risk**: Memory usage spikes during export (exceeds 1.5GB limit)
- **Mitigation**: Process clips in batches if needed, monitor memory usage, clean up temporary files promptly

**Risk**: Exported file doesn't play in external players (codec/container issues)
- **Mitigation**: Use standard MP4 container with H.264/AAC codecs, test with multiple players (QuickTime, VLC, Chrome)

**Risk**: Temporary files not cleaned up if export crashes or app closes
- **Mitigation**: Implement cleanup on app close, use unique temp file names, add cleanup function called after export

**Risk**: Export fails silently (no error shown to user)
- **Mitigation**: Comprehensive error handling, parse FFmpeg errors, show clear error messages, log all errors to console

**Risk**: Disk space runs out during export
- **Mitigation**: Check disk space before starting export, show error if insufficient, estimate output file size

**Risk**: User cancels export but process continues (not in MVP but good to consider)
- **Mitigation**: Document that cancellation is not in MVP scope, may add later if needed

---

## 15. Rollout & Telemetry

**Feature flag**: No (export is core MVP feature, no flag needed)

**Metrics to track** (if telemetry added later):
- Export completion rate (success vs failure)
- Average export time by video duration
- Export failure reasons (file not found, encoding errors, etc.)
- Most common source formats used in exports
- Export frequency per user session

**Manual validation steps**:
1. Launch app, import 3 video clips (MP4, MOV, different resolutions)
2. Add clips to timeline, trim one clip
3. Click "Export Video" button
4. Select save location in file picker
5. Verify progress bar updates during export
6. Verify success dialog appears with file path
7. Click "Reveal in Finder", verify file exists
8. Open exported MP4 in QuickTime, verify it plays correctly
9. Verify trimmed clip and sequence order match preview
10. Test with mixed formats (different resolutions, frame rates, aspect ratios)

---

## 16. Open Questions

- Q1: Should we show estimated time remaining during export? (Answer: Nice-to-have, not required for MVP)
- Q2: Should export be cancellable? (Answer: Not in MVP scope, may add later)
- Q3: Should we validate exported file after completion? (Answer: Yes, check file exists and is readable)
- Q4: How to handle very large exports (1GB+ output files)? (Answer: Show warning if estimated output > available disk space)
- Q5: Should we support batch export of multiple sequences? (Answer: Not in MVP scope, one sequence at a time)

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:
- [ ] Export cancellation during processing
- [ ] Custom export settings UI (quality presets, resolution options)
- [ ] Export to cloud services (YouTube, Vimeo, etc.)
- [ ] Batch export (multiple sequences)
- [ ] Export progress with time remaining estimation
- [ ] Export queue (background exports)
- [ ] Export templates/presets
- [ ] Export of audio-only sequences
- [ ] Export with video effects/transitions (hard cuts only in MVP)

---

## Preflight Questionnaire

**Key decisions**: Export single MP4 file with trim points applied, fixed preset (MP4/H.264/AAC/30fps/max 1080p), real-time progress, success/error dialogs. Handle mixed formats automatically. No cancellation, batch export, or custom settings in MVP. See Sections 2-3 and 7-9 for full details.

---

## Authoring Notes

- Write Test Plan before coding (Section 12)
- Favor vertical slice that ships standalone (export single clip → export multiple clips → handle mixed formats)
- Keep Electron IPC handlers deterministic (validate inputs, handle errors)
- React components are thin wrappers (useExport hook manages state, components render)
- Test video processing thoroughly with real video files (MP4, MOV, different formats)
- Reference `prd-v1.md` and `.cursorrules` throughout
- Export completes the MVP workflow: import → edit → preview → export
- Focus on reliability over features (fixed preset is fine, handle errors well)

---

## FFmpeg Export Pipeline Details

**Pipeline**: (1) Generate trimmed segments per clip using `-ss [start] -t [duration]`, (2) Create concat list file, (3) Concatenate and re-encode with fixed preset (H.264/AAC/30fps, scale/letterbox for mixed formats), (4) Parse stderr for progress (`time=HH:MM:SS.mmm`), (5) Cleanup temp files

**Key Commands**:
- Trim: `ffmpeg -ss [start] -i [input] -t [duration] -c:v libx264 -c:a aac [output]`
- Concat: `ffmpeg -f concat -safe 0 -i [list.txt] -c:v libx264 -preset medium -crf 23 -r 30 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:a aac -b:a 128k -movflags +faststart [output]`

**Processing**: Sequential (safer for MVP). Progress: Parse stderr, calculate `(currentTime / totalDuration) * 100`, emit via IPC.

