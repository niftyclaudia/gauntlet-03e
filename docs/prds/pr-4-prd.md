# PRD: Video Preview Player

**Feature**: Video Preview & Playback

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 4

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md)

---

## 1. Summary

Enable users to preview video clips and sequences by clicking clips in Library or Timeline, playing sequences from the timeline, and scrubbing through video content with synchronized audio playback, providing the visual feedback needed to make editing decisions.

---

## 2. Problem & Goals

**Problem**: Users can import videos (PR-2) and arrange them on a timeline (PR-3), but cannot preview what they're editing. Without video playback, users cannot verify clip content, assess timing, or preview their sequence before export.

**Why now**: This is Phase 4 of the MVP, building on Library (PR-2) and Timeline (PR-3). Video preview is essential for users to make informed editing decisions and verify their sequence works before exporting.

**Goals** (ordered, measurable):
  - [ ] G1 — User can click clip in Library → video plays in preview player with audio synchronized
  - [ ] G2 — User can play/pause playback using Spacebar or Play button, with progress bar showing current position
  - [ ] G3 — User can scrub through video by dragging playhead or progress bar, with preview updates within 100ms
  - [ ] G4 — User can preview entire sequence from timeline with "Preview Sequence" button, playing all clips in order

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing trim functionality (PR-6)
- [ ] Not implementing auto-save (PR-5)
- [ ] Not implementing video export (PR-8)
- [ ] Not implementing video effects, filters, or transitions
- [ ] Not implementing audio volume control or audio effects
- [ ] Not implementing frame-by-frame scrubbing
- [ ] Not implementing picture-in-picture or multiple preview windows
- [ ] Not implementing fullscreen preview mode
- [ ] Not implementing playback speed controls (slow motion, fast forward)
- [ ] Not implementing keyboard shortcuts beyond Spacebar (play/pause)
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- Video playback starts within 500ms of clicking clip
- Playback smooth at minimum 30fps (per prd-v1.md)
- Scrubbing updates preview within 100ms (per prd-v1.md)
- Audio synchronized with video (no noticeable delay)
- Progress bar accurately reflects playback position
- Playhead updates smoothly during playback

**System** (from prd-v1.md):
- Video playback: Smooth 30fps minimum (1080p H.264 content)
- Scrubbing updates preview within 100ms
- No UI blocking during video operations
- Memory usage < 1GB with 10 clips playing

**Quality**:
- 0 blocking bugs
- All acceptance gates pass
- Crash-free playback >99.9%
- Audio/video sync accurate to <100ms

---

## 5. Users & Stories

- As a video editor, I want to click a clip in Library to preview it so that I can verify its content before adding to timeline
- As a content creator, I want to play my sequence with one button so that I can see how all clips flow together
- As a user, I want to scrub through video by dragging the playhead so that I can quickly jump to specific moments
- As a video editor, I want to see the current playback time so that I know where I am in the video
- As a user, I want smooth playback without stuttering so that I can accurately assess video quality

---

## 6. Experience Specification (UX)

**Entry Points**: 
- Click clip card in Library → preview that clip only
- Click clip card in Timeline → preview that clip (with trim points applied)
- Click "Preview Sequence" button → play all timeline clips in order
- Click Play button or press Spacebar → resume playback from current position

**Player Layout**:
- Center panel (40% of window width, above timeline)
- Video element maintains 16:9 aspect ratio (letterbox/pillarbox if needed)
- Controls bar below video: Play/Pause button, progress bar, time display (current/total)
- Empty state: Gray placeholder when no clip selected

**Playback Controls**:
- Play/Pause button (▶ / ⏸) — toggles playback
- Progress bar — draggable, shows current position, click to seek
- Time display — "00:15 / 02:30" format (current time / total duration)
- Spacebar — keyboard shortcut for play/pause (when player focused)

**Playhead Scrubbing**:
- Drag playhead on timeline → video preview updates in real-time
- Preview updates within 100ms of playhead movement
- Audio previews during scrubbing (if supported by browser)
- Playhead position synced with video player currentTime

**Sequence Preview**:
- "Preview Sequence" button (top-right of player, disabled if timeline empty)
- Plays all timeline clips in order from first to last
- Applies trim points to each clip (plays only trimmed portion)
- Smooth transition between clips (no gap, no overlap)
- Stops at end of sequence (doesn't loop)
- Shows total sequence duration during preview

**States**:
- Empty: Gray placeholder, "No clip selected"
- Loading: Spinner or loading indicator while video loads
- Playing: Video playing, Play button shows Pause icon
- Paused: Video paused at current frame, Play button shows Play icon
- Scrubbing: Preview updating as playhead moves
- Error: Error message if video fails to load (e.g., "Could not load video")

**Performance** (from prd-v1.md):
- Playback at minimum 30fps (smooth motion)
- Scrubbing updates preview within 100ms
- Audio synchronized with video (< 100ms delay)

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- VideoPlayer component loads video from file path using HTML5 `<video>` element
- Click clip in Library → loads and plays that clip in preview player
- Click clip in Timeline → loads and plays that clip with trim points applied
- Play/Pause button toggles playback state
- Spacebar keyboard shortcut toggles play/pause (when player focused)
- Progress bar displays current playback position (0 to duration)
- Progress bar is draggable for seeking (click and drag)
- Time display shows current time and total duration (MM:SS format)
- Playhead on timeline syncs with video player (drag playhead → seek video)
- Video player syncs with playhead (playback → playhead moves)
- Audio plays synchronized with video (no noticeable delay)
- "Preview Sequence" button plays all timeline clips in order
- Sequence preview applies trim points (plays only trimmed portion of each clip)
- Sequence preview stops at end (no auto-loop)
- Video maintains 16:9 aspect ratio (letterbox/pillarbox for other ratios)
- Preview updates within 100ms when scrubbing

**SHOULD**:
- Loading indicator shown while video loads
- Empty state shows helpful placeholder message
- Error message displayed if video fails to load
- Video player focusable (for keyboard shortcuts)
- Progress bar shows buffering state if video is loading

**Acceptance Gates**:
- [Gate] When user clicks clip in Library → video loads and plays in preview within 500ms
- [Gate] When user clicks Play button → video starts playing, button changes to Pause
- [Gate] When user presses Spacebar → playback toggles (play ↔ pause)
- [Gate] When user drags progress bar → video seeks to new position within 100ms
- [Gate] When user drags playhead on timeline → preview updates within 100ms, shows correct frame
- [Gate] When video is playing → progress bar and playhead update smoothly, audio synchronized
- [Gate] When user clicks "Preview Sequence" → all timeline clips play in order, trim points applied
- [Gate] When sequence reaches end → playback stops, doesn't loop
- [Gate] When playing 1080p H.264 video → playback smooth at minimum 30fps
- [Gate] When scrubbing → preview updates within 100ms of playhead movement

---

## 8. Data Model

**Existing Types** (from prd-v1.md, PR-2, PR-3):
```typescript
interface VideoClip {
  id: string;
  path: string;
  filename: string;
  duration: number;
  thumbnail: string;
  metadata: VideoMetadata;
}

interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;
  trimEnd: number;
  order: number;
}
```

**New/Updated State** (additions to AppState):
```typescript
interface AppState {
  library: VideoClip[];
  timeline: TimelineClip[];
  selectedClipId: string | null;
  currentPlayheadPosition: number; // seconds (existing, now synced with player)
  isPlaying: boolean; // NEW: playback state (playing/paused)
  isExporting: boolean;
  exportProgress: number;
  timelineZoom: number;
  timelineScrollPosition: number;
  // ... other state
}
```

**Player State** (component-level):
```typescript
interface PlayerState {
  currentVideo: VideoClip | null; // Currently loaded clip
  currentTimelineClip: TimelineClip | null; // Currently playing timeline clip (if sequence mode)
  isPlaying: boolean;
  currentTime: number; // seconds, synced with video element
  duration: number; // total duration of current clip/sequence
  playbackMode: 'library' | 'timeline' | 'sequence'; // What's being previewed
  isLoading: boolean;
  error: string | null;
}
```

**Validation Rules**:
- currentTime must be >= 0 and <= duration
- isPlaying is true only when video element is actually playing
- When in sequence mode, currentTimelineClip must exist in timeline
- trimStart < trimEnd for all clips in sequence

**Invariants**:
- Video player currentTime synced with currentPlayheadPosition state
- If selectedClipId changes, video player loads new clip
- Playhead position never exceeds total sequence duration
- If timeline is empty, "Preview Sequence" button is disabled

---

## 9. API / Service Contracts

**No new Electron IPC handlers required** - all operations use HTML5 video element and file:// protocol URLs.

**Video Loading** (React component):
```typescript
// Load video from file path
const videoSrc = `file://${clip.path}`;

// Apply trim points (for timeline clips)
const startTime = timelineClip.trimStart;
const endTime = timelineClip.trimEnd;

// Video element props
<video
  src={videoSrc}
  currentTime={startTime}
  onTimeUpdate={(e) => {
    const current = e.currentTarget.currentTime;
    if (current >= endTime) {
      // End of clip reached
      handleClipEnd();
    }
    setCurrentPlayheadPosition(current);
  }}
  onLoadedMetadata={(e) => {
    // Video metadata loaded
    setDuration(e.currentTarget.duration);
  }}
/>
```

**Sequence Preview Logic** (React state management):
```typescript
// Calculate sequence from timeline clips
const calculateSequence = (
  timeline: TimelineClip[],
  library: VideoClip[]
): SequenceItem[] => {
  // Returns array of clips with trim points and start times
  // Example: [{ clip, startTime: 0, endTime: 10 }, { clip, startTime: 10, endTime: 25 }]
};

// Handle clip transition in sequence
const handleSequenceClipEnd = () => {
  // Move to next clip in sequence
  // Update currentTime to next clip's trimStart
  // Load next clip's video
};
```

**Pre/Post Conditions**:
- Video loading: File path must exist and be readable, supported format (MP4/MOV)
- Playback: Video must be loaded (onLoadedMetadata fired)
- Sequence preview: Timeline must not be empty
- Scrubbing: Video must be loaded, new time must be within 0 and duration

---

## 10. UI Components to Create/Modify

**New Components**:
- `src/components/VideoPlayer.tsx` — Main video player component (replace placeholder)
- `src/components/PlayerControls.tsx` — Play/Pause button, progress bar, time display
- `src/components/SequencePreviewButton.tsx` — "Preview Sequence" button (disabled if timeline empty)

**Modified Components**:
- `src/components/Library.tsx` — Add onClick handler to clip cards (calls onSelectClip)
- `src/components/LibraryClipCard.tsx` — Make clickable, add hover state for preview indication
- `src/components/Timeline.tsx` — Sync playhead position with video player
- `src/components/TimelineClipCard.tsx` — Add onClick handler (calls onSelectClip)
- `src/components/Playhead.tsx` — Make draggable, sync with video player currentTime
- `src/App.tsx` — Add playback state management, sequence preview logic, video player props

**New Hooks**:
- `src/hooks/useVideoPlayer.ts` — Video player state management, playback controls, time sync
- `src/hooks/useSequencePreview.ts` — Sequence preview logic, clip transitions

**New Utilities**:
- `src/utils/sequenceCalculations.ts` — Calculate sequence from timeline, handle clip transitions, calculate total duration

---

## 11. Integration Points

- **HTML5 Video Element**: Use native `<video>` element for playback, file:// protocol for loading local files
- **React State Management**: useState for player state, useEffect for syncing playhead with video currentTime
- **Event Handlers**: onTimeUpdate, onLoadedMetadata, onEnded, onClick for controls
- **Keyboard Events**: onKeyDown for Spacebar play/pause (when player focused)
- **Timeline Integration**: Playhead position synced bidirectionally with video player currentTime
- **Library Integration**: Click handler on clip cards triggers video load
- **Timeline Integration**: Click handler on timeline clips triggers video load with trim points

**No Electron IPC required** - all video playback handled client-side with HTML5 video element.

---

## 12. Test Plan & Acceptance Gates

**Happy Path**:
- [ ] User clicks clip in Library
  - Gate: Video loads within 500ms, plays automatically, controls visible
- [ ] User clicks Play button
  - Gate: Video starts playing, button changes to Pause, progress bar moves
- [ ] User presses Spacebar
  - Gate: Playback toggles (play ↔ pause)
- [ ] User drags progress bar
  - Gate: Video seeks to new position within 100ms, preview shows correct frame
- [ ] User drags playhead on timeline
  - Gate: Preview updates within 100ms, audio previews (if supported)
- [ ] User plays entire sequence
  - Gate: All timeline clips play in order, trim points applied, stops at end

**Edge Cases**:
- [ ] Empty Library (no clips)
  - Gate: Player shows empty state, no errors
- [ ] Empty Timeline
  - Gate: "Preview Sequence" button disabled, no errors
- [ ] Single clip on timeline
  - Gate: Sequence preview plays single clip with trim points
- [ ] Very short clip (< 1 second)
  - Gate: Clip plays correctly, controls work
- [ ] Very long clip (> 10 minutes)
  - Gate: Playback smooth, scrubbing responsive, progress bar accurate
- [ ] Video file moved/deleted
  - Gate: Error message shown, app doesn't crash
- [ ] Corrupted video file
  - Gate: Error message shown, app doesn't crash
- [ ] Multiple rapid clicks on clips
  - Gate: Only last clicked clip loads, no race conditions

**Video Processing**:
- [ ] 1080p H.264 MP4 playback
  - Gate: Playback smooth at minimum 30fps, audio synchronized
- [ ] 720p MOV playback
  - Gate: Playback works, aspect ratio maintained (letterbox if needed)
- [ ] Different framerates (30fps, 60fps)
  - Gate: All play correctly, no stuttering
- [ ] Different aspect ratios (16:9, 4:3, 21:9)
  - Gate: Aspect ratio maintained (letterbox/pillarbox applied)

**Performance** (see prd-v1.md):
- [ ] Playback smoothness
  - Gate: Minimum 30fps for 1080p H.264 content
- [ ] Scrubbing responsiveness
  - Gate: Preview updates within 100ms of playhead movement
- [ ] Memory usage
  - Gate: < 1GB RAM with 10 clips, no memory leaks
- [ ] UI responsiveness
  - Gate: Controls respond immediately, no blocking during playback

**Sequence Preview**:
- [ ] Sequence with 3 clips
  - Gate: All clips play in order, transitions smooth, trim points applied
- [ ] Sequence with trimmed clips
  - Gate: Only trimmed portions play, no gaps between clips
- [ ] Sequence stops at end
  - Gate: Playback stops after last clip, doesn't loop
- [ ] Sequence duration calculation
  - Gate: Total duration = sum of (trimEnd - trimStart) for all clips

**Manual Testing**:
- [ ] Import 3 clips (PR-2)
- [ ] Add clips to timeline (PR-3)
- [ ] Click each clip in Library → verify preview
- [ ] Click each clip in Timeline → verify preview with trim points (when PR-6 complete)
- [ ] Test Play/Pause button
- [ ] Test Spacebar shortcut
- [ ] Test progress bar dragging
- [ ] Test playhead dragging on timeline
- [ ] Test sequence preview with 3 clips
- [ ] Test playback smoothness (30fps minimum)
- [ ] Test scrubbing responsiveness (< 100ms)

---

## 13. Definition of Done

See standards in prd-v1.md and .cursorrules:
- [ ] VideoPlayer component implemented with HTML5 video element
- [ ] PlayerControls component with Play/Pause, progress bar, time display
- [ ] SequencePreviewButton component functional
- [ ] Click handler on Library clips loads video in preview
- [ ] Click handler on Timeline clips loads video with trim points (if available)
- [ ] Play/Pause button toggles playback
- [ ] Spacebar keyboard shortcut works for play/pause
- [ ] Progress bar is draggable and seeks video
- [ ] Time display shows current/total time (MM:SS)
- [ ] Playhead syncs with video player (bidirectional)
- [ ] "Preview Sequence" button plays all timeline clips in order
- [ ] Sequence preview applies trim points and stops at end
- [ ] Video maintains 16:9 aspect ratio (letterbox/pillarbox)
- [ ] Loading and error states displayed
- [ ] All acceptance gates pass
- [ ] Performance targets met (30fps playback, <100ms scrubbing)
- [ ] TypeScript types correct, no console errors
- [ ] Cross-platform testing done (macOS primary)
- [ ] Code follows .cursorrules patterns

---

## 14. Risks & Mitigations

- **Risk**: HTML5 video element may not support file:// protocol reliably → **Mitigation**: Test with various video files, handle errors gracefully, fallback to alternative loading if needed
- **Risk**: Scrubbing performance may be slow for large files → **Mitigation**: Throttle playhead updates, use requestAnimationFrame, test with large files
- **Risk**: Audio/video sync issues → **Mitigation**: Use native HTML5 video sync, test with various formats, monitor sync during playback
- **Risk**: Memory usage with multiple video elements → **Mitigation**: Single video element reused, unload previous video before loading new, monitor memory during testing
- **Risk**: Sequence preview transitions may stutter → **Mitigation**: Preload next clip during current clip playback, smooth transition logic, test with various clip lengths
- **Risk**: File path changes (moved/deleted files) → **Mitigation**: Handle file not found errors, show user-friendly error message, don't crash app
- **Risk**: Different aspect ratios break layout → **Mitigation**: Use CSS object-fit: contain, maintain 16:9 container, letterbox/pillarbox as needed

---

## 15. Rollout & Telemetry

**Feature Flag?** No (core MVP feature)

**Metrics**:
- Playback start time (manual observation, target < 500ms)
- Playback smoothness (visual verification, target 30fps)
- Scrubbing responsiveness (manual timing, target < 100ms)
- Sequence preview success rate (manual observation)
- Error rate for failed video loads (console logs)

**Manual Validation Steps**:
1. Launch app in dev mode: `npm start`
2. Import 3 clips (PR-2)
3. Click first clip in Library → verify video plays
4. Test Play/Pause button
5. Test Spacebar shortcut
6. Test progress bar dragging
7. Add clips to timeline (PR-3)
8. Test sequence preview
9. Test playhead dragging on timeline
10. Verify playback smoothness (30fps)
11. Verify scrubbing responsiveness (< 100ms)
12. Build production: `npm run make`
13. Test same scenarios in built app

---

## 16. Open Questions

- Q1: Should we preload next clip during sequence preview to avoid stutter?
  - **Decision**: Yes, for MVP - preload next clip 2 seconds before current clip ends
- Q2: Should scrubbing preview audio or just visual frames?
  - **Decision**: Visual frames only for scrubbing (audio previews only during normal playback) - browsers handle this automatically
- Q3: Should we show buffering indicator during video load?
  - **Decision**: Yes, show loading spinner while video metadata loads
- Q4: What happens if user clicks another clip while sequence is playing?
  - **Decision**: Stop sequence playback, load clicked clip immediately
- Q5: Should we implement fullscreen preview mode?
  - **Decision**: No, defer to future PR - not critical for MVP

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future PRs:
- [ ] Fullscreen preview mode
- [ ] Playback speed controls (slow motion, fast forward)
- [ ] Frame-by-frame scrubbing (arrow keys)
- [ ] Picture-in-picture preview
- [ ] Multiple preview windows
- [ ] Video quality selection (720p/1080p)
- [ ] Audio volume control
- [ ] Keyboard shortcuts beyond Spacebar
- [ ] Playback markers or chapter points
- [ ] Video comparison view (before/after)

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User can click a clip in Library, see it play in preview, pause it, and scrub through it.

2. **Primary user and critical action?**
   - Video editor who needs to preview clips and sequences to verify content before editing/exporting.

3. **Must-have vs nice-to-have?**
   - Must: Playback from Library clicks, Play/Pause controls, progress bar, playhead scrubbing, sequence preview
   - Nice: Fullscreen mode, playback speed controls, keyboard shortcuts (beyond Spacebar)

4. **Video processing requirements?** (see prd-v1.md)
   - HTML5 video element for playback (file:// protocol URLs)
   - Support MP4 and MOV formats
   - Maintain 16:9 aspect ratio (letterbox/pillarbox)
   - Performance: 30fps minimum playback, < 100ms scrubbing

5. **Performance constraints?** (see prd-v1.md)
   - Playback smooth at minimum 30fps (1080p H.264)
   - Scrubbing updates preview within 100ms
   - No UI blocking during video operations
   - Memory usage < 1GB with 10 clips

6. **Error/edge cases to handle?**
   - Video file moved/deleted (show error, don't crash)
   - Corrupted video file (show error, don't crash)
   - Empty Library/Timeline (show empty state)
   - Very short/long clips (handle gracefully)
   - Multiple rapid clicks (avoid race conditions)
   - Different aspect ratios (letterbox/pillarbox)

7. **Data model changes?**
   - Add `isPlaying: boolean` to AppState (or component state)
   - Add PlayerState interface for component-level state
   - Use existing selectedClipId for preview source

8. **Electron IPC handlers required?**
   - None - all video playback handled client-side with HTML5 video element

9. **UI entry points and states?**
   - Entry: Click clip in Library, click clip in Timeline, click "Preview Sequence" button
   - States: Empty, loading, playing, paused, scrubbing, error

10. **File system implications?**
    - Read video files via file:// protocol URLs (already stored as paths in state)
    - No file write operations needed

11. **Dependencies or blocking integrations?**
    - Depends on PR-2 (Library) and PR-3 (Timeline) being complete
    - Blocks PR-6 (Trimming) - preview must work before trim preview can work

12. **Rollout strategy and metrics?**
    - Manual testing with real MP4/MOV files
    - No feature flag (core functionality)
    - Monitor: playback smoothness, scrubbing responsiveness, error rate

13. **What is explicitly out of scope?**
    - Trimming functionality (PR-6)
    - Auto-save (PR-5)
    - Video export (PR-8)
    - Video effects, filters, transitions
    - Audio volume control
    - Fullscreen mode
    - Playback speed controls
    - Windows/Linux support

---

## Authoring Notes

- HTML5 video element is simple but must handle file:// protocol correctly
- Test with various video formats early (MP4, MOV, different codecs)
- Scrubbing performance may need optimization (throttling, requestAnimationFrame)
- Sequence preview must handle clip transitions smoothly
- Playhead sync must be bidirectional (video → playhead, playhead → video)
- Error handling is critical - corrupted/moved files shouldn't crash app
- Aspect ratio handling requires CSS object-fit: contain
- Reference `prd-v1.md` Section 6 (Video Preview Player) and `.cursorrules` for patterns

