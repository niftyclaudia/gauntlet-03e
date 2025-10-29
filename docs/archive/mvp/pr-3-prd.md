# PRD: Timeline & Drag-to-Reorder

**Feature**: Timeline Interface & Clip Management

**Version**: 1.0

**Status**: Draft

**Agent**: Pete

**Target Release**: MVP Phase 3

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md)

---

## 1. Summary

Enable users to drag clips from Library to Timeline, reorder clips by dragging horizontally, zoom the timeline (100%-1000%), and manage clip selection and deletion, providing the foundation for video sequence editing.

---

## 2. Problem & Goals

**Problem**: Users have imported videos in Library (PR-2) but cannot arrange them into an editable sequence. Without a timeline interface, users cannot create multi-clip sequences or prepare content for export.

**Why now**: This is Phase 3 of the MVP, building on Library import from PR-2. Timeline is essential for the core editing workflow - users must be able to arrange clips before any trimming or export can occur.

**Goals** (ordered, measurable):
  - [x] G1 — User can drag clips from Library to Timeline, adding them to sequence with visual feedback
  - [x] G2 — User can reorder clips by dragging horizontally on Timeline with snap-to-position behavior
  - [x] G3 — Timeline displays clips with thumbnails, zoom controls (100%-1000%), and playhead visualization
  - [x] G4 — User can select clips (click), delete clips (Delete key), and clear all clips with "Clear All" button

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing video playback/preview (PR-4)
- [ ] Not implementing trim handles or trimming functionality (PR-6)
- [ ] Not implementing auto-save (PR-5)
- [ ] Not implementing video export (PR-8)
- [ ] Not implementing clip splitting at playhead
- [ ] Not implementing overlapping clips or tracks (sequential only per prd-v1.md)
- [ ] Not implementing ripple edits or gap insertion
- [ ] Not implementing undo/redo (out of scope for MVP)
- [ ] Not implementing clip copy/paste
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- Drag from Library to Timeline completes within 50ms (UI response)
- Clip reordering updates position within 50ms (per prd-v1.md performance target)
- Timeline zoom slider updates clip widths smoothly (60fps)
- Clip selection highlights immediately (< 16ms)
- Total duration display updates instantly when clips added/removed

**System** (from prd-v1.md):
- Timeline UI responsive: < 50ms response time for drag operations
- Timeline scrolling smooth: 60fps with 10+ clips
- Memory usage < 1GB with 10 clips on timeline
- No UI blocking during clip operations

**Quality**:
- 0 blocking bugs
- All clips snap together correctly (no gaps, no overlaps)
- Drag-and-drop works reliably for all clip counts (1-20 clips)
- All acceptance gates pass
- Crash-free timeline operations >99.9%

---

## 5. Users & Stories

- As a video editor, I want to drag clips from Library to Timeline so that I can build a sequence for editing
- As a content creator, I want to reorder clips by dragging them horizontally so that I can arrange my story flow
- As a user, I want to zoom the timeline so that I can see detailed clip positions or get an overview of the entire sequence
- As a video editor, I want to see clip thumbnails and filenames on the timeline so that I can identify what I'm working with
- As a user, I want to delete clips from the timeline so that I can remove mistakes quickly
- As a user, I want the timeline to show total duration so that I know how long my sequence is

---

## 6. Experience Specification (UX)

**Entry Points**: Drag clip from Library panel to Timeline panel, or click empty Timeline area

**Timeline Layout**: 
- Bottom panel (30% of window height, full width)
- Horizontal timeline with time ruler at top (HH:MM:SS.mmm)
- Clips arranged left-to-right in playback order
- Total duration displayed at top-right ("Total: 05:32")
- Visual playhead: red vertical line (#ff0000) showing current time position
- Background: #1a1a1a, clip area: #2a2a2a

**Zoom Controls**:
- Zoom slider (100% to 1000%) at bottom-left of timeline
- Default: Auto-fit (entire timeline visible in viewport)
- 100% = ~1 pixel per second
- 1000% = ~10 pixels per second
- Zoom indicator shows current level ("500%")
- Keyboard shortcuts: Cmd+Plus (zoom in), Cmd+Minus (zoom out)
- Horizontal scrollbar appears when zoomed in

**Clip Cards on Timeline**:
- Video thumbnail (first frame, 16:9 aspect ratio, scaled to clip width)
- Filename below thumbnail (truncated if too long)
- Duration overlay (bottom-right, MM:SS format)
- Width scales with zoom level and clip duration
- Selected: blue highlight border (#0066cc, 2px solid)
- Trim handles visible (left/right edges) but non-functional (PR-6)

**Drag from Library to Timeline**:
- Drag starts when user clicks Library clip card
- Library clip shows "dragging" opacity (50%)
- Timeline highlights with dashed border on drag-over
- Drop zone indicator shows insertion position (vertical line)
- Clip appears on timeline immediately with animation
- Clips snap to end of previous clip (no gaps)

**Horizontal Reorder**:
- Drag starts when user clicks timeline clip card
- Cursor changes to "move" indicator (four-way arrow)
- Drop zone indicator shows new position between clips
- Clips automatically snap together after drop
- Smooth animation during reorder (< 50ms response)

**Selection & Deletion**:
- Click clip to select (blue highlight border)
- Selected clip's full data available for preview (PR-4)
- Delete key removes selected clip
- "Clear All" button (top-right of timeline) removes all clips with confirmation
- Empty timeline shows: "Drag video files here or click to import"

**States**:
- Empty: "Drag video files here or click to import" (centered)
- With clips: Timeline shows clips, zoom controls, playhead
- Dragging: Visual feedback (opacity, drop zones)
- Loading: Clip appears with loading animation (if metadata still loading)

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- Timeline component renders clips horizontally in sequence order
- Drag-and-drop from Library to Timeline adds clips to sequence
- Clips snap together (no gaps, no overlaps) when added or reordered
- Horizontal drag-to-reorder updates clip order in state
- Zoom slider (100%-1000%) updates clip widths and timeline scale
- Auto-fit zoom calculates scale to fit entire timeline in viewport
- Playhead (red vertical line) displays at current time position
- Timecode display shows current playhead time (HH:MM:SS.mmm)
- Total duration displays sum of all clip durations
- Clip selection updates selectedClipId in state
- Delete key removes selected clip from timeline
- "Clear All" button removes all clips with confirmation dialog
- Clip cards display thumbnail, filename, duration
- Timeline scrolls horizontally when zoomed in

**SHOULD**:
- Smooth animations during drag operations (60fps target)
- Keyboard shortcuts for zoom (Cmd+Plus, Cmd+Minus)
- Visual feedback during drag (opacity, drop zones)
- Timeline auto-scrolls when dragging near edges

**Acceptance Gates**:
- [Gate] When user drags clip from Library → clip appears on Timeline within 50ms
- [Gate] When user reorders clip → new position reflects in state within 50ms, clips snap together
- [Gate] When user zooms timeline → clip widths update smoothly (60fps), scrollbar appears when needed
- [Gate] When user selects clip → selectedClipId updates, clip shows blue highlight border
- [Gate] When user deletes clip → clip removed from timeline, remaining clips re-order correctly
- [Gate] When timeline has 10 clips → UI remains responsive (< 50ms drag operations), smooth scrolling
- [Gate] When timeline is empty → shows empty state message, "Clear All" button disabled

---

## 8. Data Model

**Existing Types** (from prd-v1.md, PR-2):
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
  libraryClipId: string; // reference to library clip
  trimStart: number;     // seconds (default: 0)
  trimEnd: number;       // seconds (default: clip duration)
  order: number;         // sequence position (0, 1, 2, ...)
}
```

**New/Updated State** (additions to AppState):
```typescript
interface AppState {
  library: VideoClip[];
  timeline: TimelineClip[];
  selectedClipId: string | null;
  currentPlayheadPosition: number; // seconds
  timelineZoom: number; // 1.0 to 10.0 (100% to 1000%)
  timelineScrollPosition: number; // pixels from left
  // ... other state from PR-1, PR-2
}
```

**Validation Rules**:
- Clips must maintain sequential order (order: 0, 1, 2, ...)
- No gaps between clips (each clip starts where previous ends)
- trimStart < trimEnd for all clips
- trimEnd <= original clip duration
- Zoom value clamped between 1.0 and 10.0

**Invariants**:
- Timeline clips sorted by order property
- Selected clip must exist in timeline (if selectedClipId !== null)
- Total duration = sum of (trimEnd - trimStart) for all timeline clips
- Clip positions calculated: position = sum of previous clip durations

---

## 9. API / Service Contracts

**No new Electron IPC handlers required** - all operations are React state management.

**State Management Functions** (React hooks/utilities):
```typescript
// Add clip to timeline
const addClipToTimeline = (
  libraryClipId: string,
  timeline: TimelineClip[],
  library: VideoClip[]
): TimelineClip[] => {
  // Returns new timeline array with clip appended at end
  // Creates TimelineClip with trimStart: 0, trimEnd: clip.duration
  // Calculates order = timeline.length
}

// Reorder clip on timeline
const reorderTimelineClip = (
  dragIndex: number,
  hoverIndex: number,
  timeline: TimelineClip[]
): TimelineClip[] => {
  // Returns new timeline array with clip moved
  // Updates order properties for all affected clips
}

// Remove clip from timeline
const removeClipFromTimeline = (
  clipId: string,
  timeline: TimelineClip[]
): TimelineClip[] => {
  // Returns new timeline without clip
  // Recalculates order for remaining clips
}

// Calculate timeline position
const calculateClipPosition = (
  clipIndex: number,
  timeline: TimelineClip[],
  library: VideoClip[]
): number => {
  // Returns pixel position (X coordinate) based on zoom and previous clip durations
}

// Calculate total duration
const calculateTotalDuration = (
  timeline: TimelineClip[],
  library: VideoClip[]
): number => {
  // Returns sum of (trimEnd - trimStart) for all clips
}

// Calculate auto-fit zoom
const calculateAutoFitZoom = (
  timeline: TimelineClip[],
  library: VideoClip[],
  timelineWidth: number
): number => {
  // Returns zoom level (1.0 to 10.0) to fit entire timeline in viewport
}
```

**Pre/Post Conditions**:
- addClipToTimeline: libraryClipId must exist in library, timeline state updated atomically
- reorderTimelineClip: indices must be valid, order properties recalculated correctly
- removeClipFromTimeline: clipId must exist, selectedClipId cleared if removed clip was selected

---

## 10. UI Components to Create/Modify

**New Components**:
- `src/components/Timeline.tsx` — Main timeline panel component (modify existing stub)
- `src/components/TimelineClipCard.tsx` — Individual clip card on timeline (thumbnail, filename, duration)
- `src/components/TimelineZoomControls.tsx` — Zoom slider, zoom indicator, keyboard shortcuts
- `src/components/TimeRuler.tsx` — Timecode display (HH:MM:SS.mmm) above timeline
- `src/components/Playhead.tsx` — Red vertical line showing current time position

**Modified Components**:
- `src/components/Library.tsx` — Add drag source capability (make clips draggable)
- `src/App.tsx` — Add timeline state management, drag-and-drop handlers, zoom state

**New Hooks**:
- `src/hooks/useTimelineDragDrop.ts` — Drag-and-drop logic for Library→Timeline and reorder
- `src/hooks/useTimelineZoom.ts` — Zoom state and calculations (auto-fit, scroll)

**New Utilities**:
- `src/utils/timelineCalculations.ts` — Position calculations, duration sums, zoom calculations

---

## 11. Integration Points

- **React State Management**: useState, useContext for timeline state (timeline, selectedClipId, zoom)
- **Drag-and-Drop API**: HTML5 drag-and-drop events (onDragStart, onDragOver, onDrop)
- **React Refs**: For measuring timeline container width, scroll position
- **Event Handlers**: onClick for selection, onKeyDown for Delete key, Cmd+Plus/Minus for zoom
- **Library Component**: Must provide drag source data (clip ID) when dragging starts
- **App Component**: Coordinates state updates, passes props to Timeline and Library

**No Electron IPC required** - all operations are client-side React state management.

---

## 12. Test Plan & Acceptance Gates

**Happy Path**:
- [x] User drags clip from Library to Timeline
  - Gate: Clip appears on timeline, positioned at insertion point, no gaps
- [x] User adds 3 clips to timeline
  - Gate: Timeline shows 3 clips in sequence, total duration = sum of clip durations
- [x] User reorders clip by dragging horizontally
  - Gate: Clip moves to new position, clips snap together, order updated
- [x] User zooms timeline to 500%
  - Gate: Clip widths increase, scrollbar appears, zoom indicator shows "500%"
- [x] User selects clip
  - Gate: Clip shows blue highlight, selectedClipId updated
- [x] User deletes selected clip
  - Gate: Clip removed, remaining clips maintain order, selectedClipId cleared

**Edge Cases**:
- [x] Empty timeline (no clips)
  - Gate: Shows empty state, "Clear All" disabled, total duration = 0
- [x] Single clip on timeline
  - Gate: Clip displays correctly, delete works
- [x] Timeline with 20+ clips
  - Gate: All clips visible, scrolling smooth, performance < 50ms
- [x] Zoom at 100% (minimum)
  - Gate: Clips very small but visible, timeline fits in viewport
- [x] Zoom at 1000% (maximum)
  - Gate: Clips very large, scrollbar appears, precise positioning possible
- [x] Auto-fit zoom calculation
  - Gate: Entire timeline fits in viewport, zoom level calculated correctly
- [x] Delete last remaining clip
  - Gate: Timeline becomes empty, shows empty state

**Performance** (see prd-v1.md):
- [x] Timeline UI responsive
  - Gate: Drag operations complete in < 50ms
- [x] Timeline scrolling smooth
  - Gate: 60fps with 10+ clips, no jank
- [x] Memory usage
  - Gate: < 1GB with 10 clips on timeline

**Manual Testing**:
- [x] Import 3 clips from Library (PR-2)
- [x] Drag all 3 to Timeline
- [x] Reorder clips multiple times
- [x] Test zoom slider at various levels
- [x] Test keyboard shortcuts (Cmd+Plus, Cmd+Minus)
- [x] Select and delete clips
- [x] Test "Clear All" button
- [x] Verify clip thumbnails and filenames display correctly

---

## 13. Definition of Done

See standards in prd-v1.md and .cursorrules:
- [x] Timeline component renders clips horizontally with correct positions
- [x] Drag-and-drop from Library to Timeline works (adds clips at insertion point)
- [x] Horizontal drag-to-reorder works (clips snap together)
- [x] Zoom slider functional (100%-1000%) with auto-fit default
- [x] Playhead displays correctly (red vertical line)
- [x] Timecode and total duration display accurate values
- [x] Clip selection works (click to select, blue highlight)
- [x] Delete key removes selected clip
- [x] Delete button on clips removes clip
- [x] "Clear All" button works with confirmation
- [x] All acceptance gates pass
- [x] Performance targets met (< 50ms drag operations, 60fps scrolling)
- [x] TypeScript types correct, no console errors
- [x] Cross-platform testing done (macOS primary)
- [x] Code follows .cursorrules patterns

---

## 14. Risks & Mitigations

- **Risk**: Drag-and-drop performance with many clips → **Mitigation**: Use React state updates efficiently, memoization for clip cards, test with 20+ clips early
- **Risk**: Zoom calculations cause jank → **Mitigation**: Debounce zoom slider input, use requestAnimationFrame for smooth updates, cache calculations
- **Risk**: Clip positioning math errors (gaps/overlaps) → **Mitigation**: Unit tests for position calculations, validate order property updates, snap-to-grid logic
- **Risk**: Memory usage with many clips → **Mitigation**: Virtual scrolling if needed (defer to future), monitor memory during testing, limit clip count if necessary
- **Risk**: Auto-fit zoom calculation edge cases → **Mitigation**: Handle empty timeline, single clip, very long clips, test all scenarios

---

## 15. Rollout & Telemetry

- Feature flag? **No** (core MVP feature)
- Metrics: Timeline clip count, zoom level usage, drag operation frequency
- Manual validation: Test with 3-20 clips, verify all interactions work smoothly

---

## 16. Open Questions

- Q1: Should we support double-click to maximize clip width? → **Defer to future PR**
- Q2: Should we show clip in/out points on timeline? → **Defer to PR-6 (Trimming)**

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Clip copy/paste on timeline
- [ ] Undo/redo for timeline operations
- [ ] Ripple edits (moving clips affects later clips)
- [ ] Gap insertion between clips
- [ ] Overlapping clips or multiple tracks
- [ ] Timeline markers or chapter points

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User drags 3 clips to timeline, reorders them, and sees arranged sequence ready for editing.
2. **Primary user and critical action?** Video editor dragging clips to timeline and reordering to arrange story flow.
3. **Must-have vs nice-to-have?** Must: drag to timeline, reorder, zoom. Nice: keyboard shortcuts, auto-scroll during drag.
4. **Video processing requirements?** None - this is UI/state management only.
5. **Performance constraints?** < 50ms drag operations, 60fps scrolling (from prd-v1.md).
6. **Error/edge cases to handle?** Empty timeline, single clip, many clips, zoom edge cases, invalid drag targets.
7. **Data model changes?** Add timelineZoom, timelineScrollPosition to AppState. TimelineClip already defined.
8. **Electron IPC handlers required?** No - all client-side React state.
9. **UI entry points and states?** Drag from Library, reorder on timeline, zoom slider, click to select, Delete key.
10. **File system implications?** None - clips reference Library by ID, no file operations.
11. **Dependencies or blocking integrations?** Requires PR-2 (Library) to be complete.
12. **Rollout strategy and metrics?** Core MVP feature, no feature flag needed.
13. **What is explicitly out of scope?** Trimming, playback, auto-save, export, undo/redo.

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice: timeline with drag-to-add and reorder
- React state updates must be atomic (no partial states)
- Test with real imported clips from PR-2
- Reference `prd-v1.md` Section 4 (Timeline Interface) and `.cursorrules` for patterns

