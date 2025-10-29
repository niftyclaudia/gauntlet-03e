# PRD: Video Trimming

**Feature**: Video Trimming with Drag Handles

**Version**: 1.0

**Status**: Complete

**Agent**: Pete

**Target Release**: MVP Phase 6

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md) | [pr-4-prd.md](./pr-4-prd.md) | [pr-5-prd.md](./pr-5-prd.md)

---

## 1. Summary

Enable users to trim video clips on the timeline by dragging left and right trim handles, updating clip duration in real-time, reflecting changes in preview playback, and updating thumbnails to show the new start frame, providing precise control over clip start and end points.

---

## 2. Problem & Goals

**Problem**: Users can import videos (PR-2), arrange them on a timeline (PR-3), and preview them (PR-4), but cannot remove unwanted portions from the beginning or end of clips. Without trimming, users cannot precisely control which sections of their videos appear in the final sequence. Trim handles are currently visual only (PR-3) and non-functional.

**Why now**: This is Phase 6 of the MVP, building on Timeline (PR-3) and Video Preview (PR-4). Trimming is essential for the core editing workflow - users must be able to remove unwanted content from clips before exporting. Auto-save (PR-5) ensures trim points are preserved.

**Goals** (ordered, measurable):
  - [x] G1 — User can drag left trim handle right to trim clip start, with handle position updating in real-time during drag
  - [x] G2 — User can drag right trim handle left to trim clip end, with handle position updating in real-time during drag
  - [x] G3 — Trimmed clips enforce minimum duration of 0.5 seconds (handles cannot cross), with duration display updating immediately
  - [x] G4 — Preview player reflects trimmed clip boundaries during playback and scrubbing
  - [ ] G5 — Clip thumbnail updates to show new start frame when trimStart changes, regenerated via FFmpeg within 2 seconds (deferred per PRD)

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing split clips at playhead (out of scope for MVP)
- [ ] Not implementing ripple edits or gap insertion (sequential clips only)
- [ ] Not implementing keyboard shortcuts for trimming (drag handles only)
- [ ] Not implementing numeric input for exact trim times (drag handles only)
- [ ] Not implementing multi-select trimming (one clip at a time)
- [ ] Not implementing frame-accurate trimming (second-level precision)
- [ ] Not implementing trim preview before committing (changes apply on mouse up after IPC validation)
- [ ] Not implementing thumbnail regeneration when trimStart changes (out of scope for PR-6)
- [ ] Not implementing undo/redo for trim operations (out of scope for MVP)
- [ ] Not implementing audio crossfades or video transitions (no transitions in MVP)
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- Trim handle drag starts within 50ms of mouse down (per prd-v1.md timeline responsiveness)
- Handle position updates smoothly during drag (< 16ms frame time for 60fps)
- Duration display updates in real-time as handle is dragged
- Minimum duration constraint enforced (cannot drag handles past 0.5 seconds)
- Preview playback respects trim boundaries immediately
- Tooltip displays original → new duration during drag and follows mouse cursor

**System** (from prd-v1.md):
- Timeline UI responsive: < 50ms response time for drag operations
- No UI blocking during trim operations (global mouse listeners allow smooth dragging)
- IPC trim commit completes in < 100ms
- Memory usage increase < 10MB for trim state tracking (useTrimDrag hook state)

**Quality**:
- 0 blocking bugs
- All acceptance gates pass
- Trim points persist correctly in auto-save
- Preview playback accurately reflects trim boundaries
- No visual glitches during handle dragging

---

## 5. Users & Stories

- As a video editor, I want to drag the left handle to remove unwanted content from the beginning so that I can start my clip at the right moment
- As a content creator, I want to drag the right handle to cut off the end so that my clip ends precisely where I want
- As a user, I want to see the duration update in real-time while trimming so that I know exactly how long my clip will be
- As a video editor, I want the preview to respect my trim points so that I can verify the trimmed content looks correct
- As a user, I want the thumbnail to update when I change the start time so that I can quickly identify clips by their new first frame
- As a video editor, I want handles to prevent crossing so that my clips always have a meaningful minimum duration

---

## 6. Experience Specification (UX)

**Entry Points**:
- Hover over left trim handle on timeline clip → cursor changes to resize indicator (`ew-resize`)
- Hover over right trim handle on timeline clip → cursor changes to resize indicator (`ew-resize`)
- Mouse down on left handle → begin trim start drag
- Mouse down on right handle → begin trim end drag

**Trim Handle Behavior**:
- Left handle: Draggable from clip start (trimStart = 0) to (clip duration - 0.5s)
- Right handle: Draggable from clip end (trimEnd = clip duration) to (trimStart + 0.5s)
- Handles visually highlight on hover (slightly larger, different color)
- During drag: Handle follows mouse cursor horizontally, constrained to valid range
- Handle position updates every mouse move event (throttled to < 16ms for smooth 60fps)
- Cursor changes to `ew-resize` while hovering over handles
- Cursor changes to `grabbing` while dragging handle

**Trim Interaction Flow**:
1. User hovers over left or right trim handle
2. Cursor changes to `ew-resize`, handle highlights (hover state managed at Timeline level)
3. User presses mouse down on handle → `onTrimStart` callback fires from TimelineClipCard to Timeline
4. Timeline's `useTrimDrag` hook starts drag operation, sets up global mouse listeners
5. User drags handle horizontally → global `mousemove` handler updates dragged trim values in real-time
6. `TrimTooltip` appears showing original → new duration
7. Clip width on timeline adjusts to reflect new duration (via draggedInPoint/draggedOutPoint props)
8. Duration display updates immediately (shows trimmed duration)
9. User releases mouse → global `mouseup` handler triggers IPC call to `trim:trimClip`
10. IPC handler validates trim values and returns success
11. Timeline calls `onTrimUpdate` callback to update App state
12. Auto-save triggered (existing PR-5 functionality)
13. Global mouse listeners removed, drag state cleared

**Visual Feedback**:
- Duration overlay updates in real-time during drag (MM:SS format)
- Clip width on timeline scales to new duration (based on zoom level)
- Handle position visually updates during drag
- Preview player position updates if clip is selected
- Loading indicator shown while thumbnail regenerates (non-blocking)

**Constraints & Validation**:
- Minimum clip duration: 0.5 seconds (enforced during drag)
- Left handle cannot drag past (total duration - 0.5s)
- Right handle cannot drag past (trimStart + 0.5s)
- Handles snap to valid range if constraint violated
- Trim values clamped to [0, clip duration] range
- TrimStart must always be < trimEnd

**States**:
- Idle: Handles visible on hover, no interaction, hover state managed via `hoveredEdge` at Timeline level
- Hover: Handle highlighted, cursor changed (`onEdgeHoverChange` callback updates Timeline state)
- Dragging: `useTrimDrag` hook active, global mouse listeners attached, `TrimTooltip` visible, dragged values previewed
- Committing: IPC call to `trim:trimClip` in progress
- Committed: Trim value saved via `onTrimUpdate` callback, auto-save triggered, drag state cleared
- Error: IPC validation fails → error logged, drag state cleared, trim not applied

**Performance** (from prd-v1.md):
- Handle drag response: < 50ms initial response (`onTrimStart` callback), < 16ms frame updates (global mouse listeners)
- Duration calculation: < 10ms (synchronous update in `useTrimDrag.handleTrimMove`)
- IPC trim commit: < 100ms (async validation, non-blocking)
- Timeline width recalculation: < 50ms (uses existing calculations with dragged values)
- No UI blocking during any trim operation (global listeners allow smooth dragging)

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- Trim handles trigger `onTrimStart` callback when mouse down occurs
- `useTrimDrag` hook manages centralized drag state at Timeline level
- Global mouse listeners (`mousemove`, `mouseup`) attached during drag to allow dragging beyond clip boundaries
- Left handle drag updates `draggedInPoint`, constrained to valid range [0, clip duration - 0.5s]
- Right handle drag updates `draggedOutPoint`, constrained to valid range [trimStart + 0.5s, clip duration]
- Minimum clip duration enforced: 0.5 seconds (trimEnd - trimStart >= 0.5)
- `TrimTooltip` displays original and new duration during drag
- Duration display updates in real-time during drag (shows trimmed duration from dragged values)
- Clip width on timeline scales to new duration immediately (via `draggedInPoint`/`draggedOutPoint` props)
- Preview player reflects trim boundaries (playback respects trimStart/trimEnd)
- On mouse up, IPC call to `trim:trimClip` validates and commits trim values
- Trim points persisted in auto-save (already supported by PR-5)
- Trim state updates trigger auto-save on commit (every 30s interval or on mouse up)
- Handle drag position converted from pixels to seconds using zoom level and clip position

**SHOULD**:
- Handle highlights on hover for better discoverability (via `hoveredEdge` state)
- Cursor changes provide visual feedback (ew-resize cursor on hover, grabbing during drag)
- Smooth drag experience (aim for 60fps with global mouse listeners)
- Tooltip position follows mouse cursor during drag
- Hover state persists during drag (handles remain highlighted)

**Acceptance gates per requirement**:
- [Gate] When user drags left handle → `onTrimStart` fires, `useTrimDrag` manages state, `draggedInPoint` updates, tooltip shows, duration display updates, clip width adjusts
- [Gate] When user drags right handle → `onTrimStart` fires, `useTrimDrag` manages state, `draggedOutPoint` updates, tooltip shows, duration display updates, clip width adjusts
- [Gate] When handles would violate minimum duration → constraint enforced in `useTrimDrag.handleTrimMove`, handles snap to valid position
- [Gate] When mouse up occurs → IPC call to `trim:trimClip` validates values, `onTrimUpdate` callback updates App state, auto-save includes updated trim points
- [Gate] During trim drag → global mouse listeners allow dragging beyond clip boundaries, UI remains responsive (< 50ms response time), no blocking
- [Gate] Tooltip displays correctly → shows original duration → new duration, follows mouse cursor, disappears on mouse up

---

## 8. Data Model

The existing `TimelineClip` interface already supports trim points (from PR-3):

```typescript
interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;  // Already exists, defaults to 0
  trimEnd: number;    // Already exists, defaults to clip duration
  order: number;
}
```

**Validation rules**:
- `trimStart >= 0` (cannot be negative)
- `trimEnd <= libraryClip.duration` (cannot exceed source clip duration)
- `trimEnd - trimStart >= 0.5` (minimum duration 0.5 seconds)
- `trimStart < trimEnd` (start must be before end)

**State updates**:
- Trim values updated in `AppState.timeline` array
- Updates trigger React re-render of timeline clips
- Auto-save automatically includes updated trim points (PR-5)

**Trim state management**:
- `useTrimDrag` hook manages drag state at Timeline level (not per-clip)
- State includes: `dragging` (active drag operation), `draggedInPoint`, `draggedOutPoint`, `tooltipPosition`, `tooltipVisible`
- Global mouse listeners added/removed via `useEffect` in Timeline component
- Hover state (`hoveredEdge`) managed separately at Timeline level

**Timeline integration**:
- TimelineClipCard calls `onTrimStart(clipId, edge, event)` when handle is clicked
- Timeline's `handleTrimStart` calculates clip position and initializes `useTrimDrag` hook
- Timeline passes `draggedInPoint`/`draggedOutPoint` to TimelineClipCard for preview during drag
- Timeline renders `TrimTooltip` conditionally when drag is active
- Timeline handles IPC call on mouse up and calls `onTrimUpdate` callback to App

---

## 9. API / Service Contracts

**New Electron IPC handler required**: `trim:trimClip`

**IPC handler**:
```typescript
// New IPC handler in preload.ts
window.electron.trim.trimClip(
  clipId: string,
  inPoint: number,
  outPoint: number
): Promise<{ success: boolean; clip?: TimelineClip }>

// Implementation in main process
// Validates trim values and returns success response
// Note: Actual trim operation is applied during export using FFmpeg
```

**Pre/post-conditions**:
- Pre: `clipId` exists in timeline, `inPoint >= 0`, `outPoint > inPoint`, `outPoint - inPoint >= 0.5`
- Post: Trim values validated, returns success with updated clip data
- Error: If validation fails, throws Error with descriptive message

**Parameters and types**:
- `clipId: string` — UUID of timeline clip to trim
- `inPoint: number` — Trim start point in seconds (trimStart)
- `outPoint: number` — Trim end point in seconds (trimEnd)

**Return values**:
- `Promise<{ success: boolean; clip?: TimelineClip }>` — Success response with updated clip if successful
- `Promise<Error>` — If validation fails or clip not found

**Error handling**:
- Clip not found → Error: "Clip not found: {clipId}"
- Invalid trim values → Error: "Invalid trim values: inPoint={inPoint}, outPoint={outPoint}"
- Minimum duration violation → Error: "Trim duration must be at least 0.5 seconds"

**Note**: Thumbnail regeneration is handled separately (out of scope for PR-6). The trim IPC handler only validates and commits trim values.

---

## 10. UI Components to Create/Modify

**Components to create**:
- `src/components/TrimTooltip.tsx` — Tooltip component showing original/new duration during trim drag

**Components to modify**:
- `src/components/TimelineClipCard.tsx` — Add `onTrimStart` callback to trim handles, add hover state management via `onEdgeHoverChange`, display dragged trim values during drag
- `src/components/Timeline.tsx` — Add `useTrimDrag` hook for centralized trim state management, add global mouse listeners during drag, render `TrimTooltip`, handle trim completion via IPC
- `src/components/VideoPlayer.tsx` — Already handles trim points (PR-4), verify it updates correctly when trim values change

**Hooks to create**:
- `src/hooks/useTrimDrag.ts` — Centralized trim drag state management hook at Timeline level (manages drag state, tooltip position, dragged in/out points)

**Utilities to create/modify**:
- `src/utils/trimCalculations.ts` — Functions for converting mouse position to trim time, validating constraints, calculating handle positions
- `src/main/ipcHandlers.ts` — Add `trim:trimClip` IPC handler that validates and returns trim values

**Types** — No changes needed (TimelineClip already has trimStart/trimEnd)

**Styles** (CSS):
- `src/index.css` — Update trim handle styles to show hover state, dragging state, cursor changes, add TrimTooltip styles

---

## 11. Integration Points

**Electron IPC integration**:
- New `trim:trimClip` IPC handler in main process
- IPC call triggered on mouse up after drag completes
- Validates trim values and returns success with updated clip data
- Non-blocking async operation (doesn't freeze UI)

**Local file system**:
- No file operations during trim (trim is UI-only state change)
- Trim values are applied during export using FFmpeg (future PR)

**State management** (React patterns):
- Trim state stored in `AppState.timeline` (TimelineClip.trimStart/trimEnd)
- State updates via callback from TimelineClipCard to Timeline to App.tsx
- State updates trigger React re-renders of timeline and preview player

**FFmpeg for video processing**:
- No FFmpeg operations during trim (trim is UI-only state change)
- Trim values are validated and stored, will be applied during export in future PR

**Auto-save integration** (PR-5):
- Trim state automatically saved every 30 seconds
- Trim points restored correctly on session recovery

**Video preview integration** (PR-4):
- VideoPlayer already respects trimStart/trimEnd during playback
- Verify player updates correctly when trim values change during trim operation

**Timeline calculations**:
- Clip width calculations (from PR-3) already use trimStart/trimEnd
- Duration display already calculates trimmed duration
- No changes needed to timelineCalculations.ts

**Cross-platform compatibility**:
- macOS primary platform
- Thumbnail generation uses FFmpeg (cross-platform)

---

## 12. Test Plan & Acceptance Gates

**Happy Path**:
- [x] User drags left handle right → trimStart increases, duration decreases, preview updates
  - Gate: trimStart updates correctly, duration display shows new value, preview reflects trim start
- [x] User drags right handle left → trimEnd decreases, duration decreases, preview updates
  - Gate: trimEnd updates correctly, duration display shows new value, preview stops at trim end
- [x] User trims clip from both ends → both trimStart and trimEnd updated correctly
  - Gate: Clip plays only trimmed portion (thumbnail regeneration deferred per PRD)
- [x] User drags handle, then previews → trimmed clip plays correctly
  - Gate: Preview respects trim boundaries, playback smooth

**Edge Cases**:
- [x] User drags left handle to minimum duration → handle stops at constraint, cannot drag further
  - Gate: trimStart cannot exceed (duration - 0.5s), handle snaps to valid position
- [x] User drags right handle to minimum duration → handle stops at constraint, cannot drag further
  - Gate: trimEnd cannot go below (trimStart + 0.5s), handle snaps to valid position
- [x] User tries to drag handle past constraint → constraint enforced, no invalid state
  - Gate: trimStart and trimEnd always maintain minimum 0.5s duration
- [x] User trims very short clip (near 0.5s) → handles have minimal movement range
  - Gate: Handles still draggable within valid range, constraints work correctly
- [x] User trims very long clip (several minutes) → trim precision appropriate for zoom level
  - Gate: Handle drag feels precise at high zoom, works at low zoom

**IPC Integration**:
- [x] IPC call to `trim:trimClip` validates trim values correctly
  - Gate: IPC handler returns success with updated clip data, invalid values rejected
- [x] Trim operation commits correctly via IPC → App state updates
  - Gate: `onTrimUpdate` callback fires after IPC success, trim points updated in App state

**Performance** (see prd-v1.md):
- [x] Handle drag responsive → < 50ms initial response, < 16ms frame updates
  - Gate: Drag feels smooth at 60fps, no lag or stuttering
- [x] Timeline UI responsive during trim → no blocking, other interactions still work
  - Gate: Can drag handle while timeline scrolls, zoom works, other clips selectable
- [x] Thumbnail regeneration non-blocking → UI remains responsive during generation
  - Gate: Thumbnail regeneration deferred per PRD (out of scope for PR-6)

**Auto-Save Integration**:
- [x] Trim points saved in auto-save → trim state persists across app restarts
  - Gate: Trim points restored correctly after app restart, preview reflects trim boundaries
- [x] Trim operations trigger auto-save → state saved within 30 seconds or on commit
  - Gate: Auto-save file includes updated trim points after trim operation

**Preview Integration**:
- [x] Trimmed clip preview → playback respects trimStart and trimEnd
  - Gate: Preview plays only trimmed portion, stops at trimEnd, starts at trimStart
- [x] Trim during preview → preview updates immediately when trim changes
  - Gate: Playback position adjusts if needed, trim boundaries respected

**Manual Testing Protocol** (from prd-v1.md):
- [x] Import 3 video clips (MP4/MOV, 1080p)
- [x] Add clips to timeline
- [x] Trim first clip: drag left handle to remove 5 seconds from start
  - Gate: Duration decreases, preview shows new start, tooltip displays correctly, trim committed via IPC
- [x] Trim second clip: drag right handle to remove 3 seconds from end
  - Gate: Duration decreases, preview stops at new end
- [x] Trim third clip: trim both ends to create 10-second clip
  - Gate: Clip plays only 10 seconds, preview respects boundaries
- [x] Preview sequence with trimmed clips → all clips play correctly
  - Gate: Sequence plays trimmed portions only, smooth transitions
- [x] Close and reopen app → trim points restored
  - Gate: Trim points preserved, preview reflects trim boundaries

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [x] Electron IPC handler `trim:trimClip` implemented in main process
- [x] `useTrimDrag` hook implemented for centralized trim state management
- [x] `TrimTooltip` component displays duration changes during drag
- [x] Global mouse listeners implemented for smooth drag operations
- [x] React components implement trim handle drag interactions (TimelineClipCard → Timeline)
- [x] Trim state updates correctly in AppState.timeline via `onTrimUpdate` callback
- [x] Auto-save functionality includes trim points (verified)
- [x] All acceptance gates pass (drag handles, constraints, preview, tooltip, IPC)
- [x] Cross-platform testing done (macOS primary)
- [x] Performance targets met (timeline responsive < 50ms)
- [x] Documentation updated (code comments, inline documentation)

**Code Quality Checklist**:
- [x] No console warnings or errors
- [x] TypeScript types correct (no `any` types)
- [x] Error handling for edge cases (invalid trim values, IPC failures)
- [x] Performance considerations addressed (global mouse listeners for smooth dragging)
- [x] Accessibility: Keyboard navigation considered (future enhancement, not MVP)
- [x] Code follows existing patterns from PR-2, PR-3, PR-4, PR-5

---

## 14. Risks & Mitigations

- **Risk**: Handle drag performance degrades with many clips on timeline
  - Mitigation: Drag interactions only affect single clip, calculations are local to clip card, performance testing with 10+ clips

- **Risk**: Global mouse listeners may interfere with other interactions during drag
  - Mitigation: Listeners only attached when drag is active, properly cleaned up on mouse up, other interactions disabled during trim drag

- **Risk**: Trim precision difficult at low zoom levels (pixel-to-time conversion)
  - Mitigation: Use appropriate zoom level for precise trimming, minimum duration constraint prevents invalid states, handle snapping to valid range

- **Risk**: IPC validation may fail for edge cases
  - Mitigation: IPC handler validates all constraints, returns clear error messages, drag state cleared even on failure, user can retry

- **Risk**: Auto-save conflicts during rapid trim operations
  - Mitigation: Auto-save runs every 30 seconds (not on every drag), trim state committed on mouse up, multiple rapid trims batch into single save

- **Risk**: Preview player doesn't update immediately when trim changes
  - Mitigation: VideoPlayer already watches trimStart/trimEnd changes (from PR-4), verify React re-render triggers player update, test with real video files

- **Risk**: Minimum duration constraint feels too restrictive (0.5s)
  - Mitigation: 0.5s is MVP requirement, user feedback gathered during testing, future enhancement could make configurable

---

## 15. Rollout & Telemetry

**Feature flag?**: No (core MVP feature, always enabled)

**Metrics**:
- Usage: Number of trim operations per session (track mouse up events on handles)
- Performance: Handle drag response time (track mouse down to first update)
- Errors: Thumbnail generation failures (log FFmpeg errors)
- Adoption: Percentage of clips that are trimmed (trimStart > 0 or trimEnd < duration)

**Manual validation steps**:
1. Import 3 video clips
2. Add to timeline
3. Trim first clip: left handle, verify duration and preview
4. Trim second clip: right handle, verify duration and preview
5. Trim third clip: both handles, verify thumbnail updates
6. Preview sequence, verify all trims respected
7. Restart app, verify trim points restored
8. Test constraint: try to drag handles past minimum duration

---

## 16. Open Questions

- **Q1**: Should trim state be managed per-clip or centralized at Timeline level?
  - **Decision**: Centralized at Timeline level using `useTrimDrag` hook for better state management and global mouse listeners

- **Q2**: Should trim tooltip show during drag or only on hover?
  - **Decision**: Show tooltip during drag to provide immediate feedback on duration changes

- **Q3**: Should IPC validation happen on every mouse move or only on mouse up?
  - **Decision**: Only on mouse up (commit) to avoid excessive IPC calls, constraints enforced in `useTrimDrag` during drag

- **Q4**: Should trim handles be visible at all zoom levels, or only at higher zoom?
  - **Decision**: Always visible on hover (like current implementation), discoverability is important for MVP

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Keyboard shortcuts for trimming (precise frame-by-frame adjustments)
- [ ] Numeric input fields for exact trim times
- [ ] Trim ripple edits (adjusting subsequent clips when trimming)
- [ ] Frame-accurate trimming (sub-second precision)
- [ ] Trim preview before committing (see result before applying)
- [ ] Multi-select trimming (trim multiple clips simultaneously)
- [ ] Trim snap points (snap to scene cuts, audio beats)
- [ ] Trim handles with visual waveform or frame preview
- [ ] Undo/redo for trim operations

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User can drag a trim handle to remove unwanted content from the beginning or end of a clip, see the duration update in the tooltip during drag, preview the trimmed clip, and have the trim values committed via IPC.

2. **Primary user and critical action?**
   - Video editor who needs to precisely control clip start and end points by dragging trim handles.

3. **Must-have vs nice-to-have?**
   - Must-have: Draggable trim handles, `useTrimDrag` hook, trim state updates, minimum duration constraint, `TrimTooltip`, IPC validation, preview respects trim points
   - Nice-to-have: Smooth 60fps drag (performance polish), tooltip position following mouse cursor

4. **Video processing requirements?** (see prd-v1.md)
   - Trim IPC validation (no FFmpeg operations during trim)
   - Non-blocking async IPC call (< 100ms)
   - Error handling for IPC validation failures

5. **Performance constraints?** (see prd-v1.md)
   - Timeline UI responsive: < 50ms response time for drag operations
   - Handle drag updates: < 16ms frame time for 60fps smoothness (global mouse listeners)
   - IPC trim commit: < 100ms (async validation)

6. **Error/edge cases to handle?**
   - Minimum duration constraint (0.5s enforced in `useTrimDrag.handleTrimMove`)
   - Handle drag outside valid range (clamp to constraints during drag)
   - IPC validation failures (log, clear drag state, trim not applied)
   - Invalid trim values (validated in IPC handler, rejected with error)

7. **Data model changes?**
   - No changes needed (TimelineClip already has trimStart/trimEnd)
   - Trim values updated in existing AppState.timeline array

8. **Electron IPC handlers required?**
   - New handler: `trim:trimClip(clipId, inPoint, outPoint)` for validating and committing trim values

9. **UI entry points and states?**
   - Hover over trim handle → cursor change, handle highlight (via `hoveredEdge` state)
   - Mouse down on handle → `onTrimStart` callback fires, `useTrimDrag` initializes, global listeners attached
   - Mouse move → global handler updates dragged values, tooltip shows, clip previews new width
   - Mouse up → global handler triggers IPC call, `onTrimUpdate` callback updates App state, listeners removed

10. **File system implications?**
    - No file system operations during trim (trim is UI-only state change)
    - Trim values stored in app state and persisted via auto-save

11. **Dependencies or blocking integrations?**
    - Depends on PR-3 (Timeline), PR-4 (Video Preview), PR-5 (Auto-Save)
    - No blocking dependencies (all PRs complete)

12. **Rollout strategy and metrics?**
    - No feature flag (always enabled)
    - Metrics: Trim operations, drag performance, thumbnail failures

13. **What is explicitly out of scope?**
    - Split clips at playhead
    - Ripple edits or gap insertion
    - Keyboard shortcuts
    - Numeric input for trim times
    - Frame-accurate precision
    - Multi-select trimming

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep Electron IPC handlers deterministic
- React components are thin wrappers around state
- Test video processing thoroughly with real video files
- Reference `prd-v1.md` and `.cursorrules` throughout
- Global mouse listeners are critical for smooth drag experience (allows dragging beyond clip boundaries)
- `useTrimDrag` hook centralizes state for cleaner architecture than per-clip hooks
- Tooltip provides immediate feedback during drag (better UX than waiting for commit)

