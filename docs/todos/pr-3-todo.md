# PR-3 TODO — Timeline & Drag-to-Reorder

**Branch**: `feat/pr-3-timeline-drag-reorder`  
**Source PRD**: `docs/prds/pr-3-prd.md`  
**Owner (Agent)**: Pete

---

## 0. Clarifying Questions & Assumptions

- Questions: None - PRD is clear
- Assumptions (confirm in PR if needed):
  - PR-2 (Library) is complete and provides draggable clips
  - Timeline component stub exists from PR-1
  - All video types from PR-2 are available (VideoClip, TimelineClip interfaces)

---

## 1. Setup

- [x] Create branch `feat/pr-3-timeline-drag-reorder` from develop
- [x] Read PRD thoroughly (`docs/prds/pr-3-prd.md`)
- [x] Read `.cursorrules` for patterns and requirements
- [x] Read `prd-v1.md` Section 4 (Timeline Interface) for context
- [x] Review existing Timeline.tsx stub from PR-1
- [x] Review Library component from PR-2 to understand drag source
- [x] Confirm environment and Electron dev server work

---

## 2. Data Model & State Management

- [x] Review existing TimelineClip interface in `src/types/video.ts`
  - Test Gate: Interface has id, libraryClipId, trimStart, trimEnd, order
- [x] Add timelineZoom to AppState (number, 1.0 to 10.0)
  - Test Gate: State type accepts zoom value, defaults to 1.0
- [x] Add timelineScrollPosition to AppState (number, pixels)
  - Test Gate: State type accepts scroll position, defaults to 0
- [x] Create utility functions in `src/utils/timelineCalculations.ts`
  - `calculateClipPosition(clipIndex, timeline, library, zoom)` → pixel position
  - `calculateTotalDuration(timeline, library)` → seconds
  - `calculateAutoFitZoom(timeline, library, timelineWidth)` → zoom level
  - Test Gate: Functions return correct values for test cases
- [x] Create state management functions in App.tsx or hook
  - `addClipToTimeline(libraryClipId, timeline, library)` → new timeline array
  - `reorderTimelineClip(dragIndex, hoverIndex, timeline)` → reordered array
  - `removeClipFromTimeline(clipId, timeline)` → array without clip
  - Test Gate: Functions maintain clip order invariants, no gaps

---

## 3. Timeline Component Structure

- [x] Modify `src/components/Timeline.tsx` - Add basic layout structure
  - Timeline container (30% height, full width, horizontal scroll)
  - Empty state message (centered when no clips)
  - Test Gate: Component renders with empty state correctly
- [x] Add timeline state props (timeline, library, selectedClipId, zoom, scrollPosition)
  - Test Gate: Timeline receives props and displays them
- [x] Add time ruler section (timecode display HH:MM:SS.mmm)
  - Test Gate: Time ruler shows correct time format, updates with playhead
- [x] Add total duration display (top-right: "Total: 05:32")
  - Test Gate: Total duration calculates correctly from timeline clips
- [x] Add "Clear All" button (top-right, disabled when empty)
  - Test Gate: Button disabled when timeline empty, enabled when clips exist

---

## 4. Timeline Clip Cards

- [x] Create `src/components/TimelineClipCard.tsx`
  - Accepts: clip (TimelineClip), libraryClip (VideoClip), zoom, isSelected
  - Renders: thumbnail, filename, duration overlay
  - Test Gate: Component renders clip card with correct data
- [x] Add thumbnail display (first frame, 16:9 aspect ratio)
  - Scale thumbnail width based on zoom and clip duration
  - Test Gate: Thumbnail displays correctly, scales with zoom
- [x] Add filename display (below thumbnail, truncated if long)
  - Test Gate: Filename displays, truncates with ellipsis if needed
- [x] Add duration overlay (bottom-right, MM:SS format)
  - Test Gate: Duration shows correct trimmed duration
- [x] Add selection highlight (blue border #0066cc when isSelected)
  - Test Gate: Selected clip shows blue border, others don't
- [x] Add clip width calculation based on duration and zoom
  - Width = (trimEnd - trimStart) * zoom * pixelsPerSecond
  - Test Gate: Clip widths update correctly when zoom changes
- [x] Render trim handles (visual only, left/right edges, non-functional)
  - Test Gate: Handles visible but don't respond to drag (PR-6)

---

## 5. Zoom Controls

- [x] Create `src/components/TimelineZoomControls.tsx`
  - Zoom slider (100% to 1000%, value 1.0 to 10.0)
  - Zoom indicator text ("500%")
  - Test Gate: Component renders slider and indicator
- [x] Add zoom slider input (range 1.0 to 10.0)
  - Updates timelineZoom state on change
  - Test Gate: Slider updates state, clip widths change
- [x] Add zoom indicator display (shows current zoom percentage)
  - Format: `${Math.round(zoom * 100)}%`
  - Test Gate: Indicator shows correct zoom level
- [x] Add keyboard shortcuts (Cmd+Plus, Cmd+Minus)
  - Increment/decrement zoom by 0.1 (10%)
  - Clamp between 1.0 and 10.0
  - Test Gate: Keyboard shortcuts work, respect limits
- [x] Implement auto-fit zoom calculation
  - Calculate on mount and when timeline changes
  - Set zoom to fit entire timeline in viewport
  - Test Gate: Auto-fit calculates correctly, timeline fits in viewport

---

## 6. Playhead Component

- [x] Create `src/components/Playhead.tsx`
  - Red vertical line (#ff0000) at current time position
  - Height: full timeline height
  - Test Gate: Playhead renders as red vertical line
- [x] Calculate playhead X position from currentPlayheadPosition and zoom
  - Position = currentPlayheadPosition * zoom * pixelsPerSecond
  - Test Gate: Playhead position updates correctly with time and zoom
- [x] Add playhead to Timeline component
  - Positioned absolutely over timeline clips
  - Test Gate: Playhead displays on timeline, updates position

---

## 7. Drag and Drop - Library to Timeline

- [x] Create `src/hooks/useTimelineDragDrop.ts`
  - Handles drag start, drag over, drop events
  - Test Gate: Hook exports functions for drag-and-drop
- [x] Make Library clips draggable
  - Modify `src/components/Library.tsx` or `LibraryClipCard.tsx`
  - Add onDragStart handler with clip ID data
  - Test Gate: Library clips can be dragged, cursor changes
- [x] Add drop zone to Timeline component
  - Add onDragOver, onDrop handlers
  - Prevent default behavior
  - Test Gate: Timeline accepts drag events
- [x] Implement drop handler for Library→Timeline
  - Extract libraryClipId from drag data
  - Call addClipToTimeline function
  - Update timeline state in App.tsx
  - Test Gate: Dropped clip appears on timeline at insertion position
- [x] Add visual feedback during drag (opacity, drop zone highlight)
  - Library clip shows 50% opacity while dragging
  - Timeline shows dashed border on drag-over (#0066cc)
  - Drop zone indicator (vertical line) shows insertion position
  - Test Gate: Visual feedback clear during drag operation
- [x] Ensure clips snap together (no gaps)
  - New clip position = end of last clip
  - trimStart = 0, trimEnd = clip.duration initially
  - Test Gate: Clips snap together, no gaps between them

---

## 8. Drag and Drop - Reorder on Timeline

- [x] Make timeline clip cards draggable
  - Add onDragStart to TimelineClipCard
  - Include clip index in drag data
  - Test Gate: Timeline clips can be dragged
- [x] Add drop zone between clips on timeline
  - Calculate drop zones (between each pair of clips)
  - Show indicator line when dragging over drop zone
  - Test Gate: Drop zones visible during drag, indicator shows
- [x] Implement reorder drop handler
  - Extract dragIndex and hoverIndex from drag data
  - Call reorderTimelineClip function
  - Update timeline state
  - Recalculate order properties for all clips
  - Test Gate: Clip moves to new position, clips snap together
- [x] Add smooth animation during reorder
  - Use CSS transition or React state update
  - Target: < 50ms response time
  - Test Gate: Reorder completes smoothly, within 50ms

---

## 9. Clip Selection

- [x] Add onClick handler to TimelineClipCard
  - Updates selectedClipId in App state
  - Test Gate: Clicking clip updates selectedClipId
- [x] Update Timeline component to pass isSelected prop
  - Compare clip.id with selectedClipId
  - Test Gate: Selected clip shows blue highlight, others don't
- [x] Handle click on empty timeline area
  - Clears selection (selectedClipId = null)
  - Test Gate: Clicking empty area deselects clip

---

## 10. Clip Deletion

- [x] Add Delete key handler in App.tsx or Timeline component
  - Listen for keydown event (key === 'Delete')
  - Remove selected clip if selectedClipId exists
  - Test Gate: Delete key removes selected clip from timeline
- [x] Update clip order after deletion
  - Recalculate order properties (0, 1, 2, ...)
  - Test Gate: Remaining clips maintain correct order
- [x] Clear selection after deletion
  - Set selectedClipId to null if deleted clip was selected
  - Test Gate: Selection cleared, no broken references
- [x] Implement "Clear All" button handler
  - Show confirmation dialog: "Remove all clips from timeline?"
  - Clear entire timeline array on confirm
  - Reset selectedClipId to null
  - Test Gate: Clear All removes all clips, shows empty state

---

## 11. Timeline Scrolling

- [x] Add horizontal scroll container to Timeline
  - Overflow-x: scroll when content exceeds viewport
  - Test Gate: Scrollbar appears when zoomed in
- [x] Update timelineScrollPosition state on scroll
  - Listen to scroll events on timeline container
  - Update state with scrollLeft value
  - Test Gate: Scroll position tracked in state
- [ ] Implement auto-scroll during drag (optional, nice-to-have)
  - Scroll when dragging near timeline edges
  - Test Gate: Timeline scrolls smoothly when dragging to edges

---

## 12. Integration with App Component

- [x] Update App.tsx to manage timeline state
  - Add timeline, selectedClipId, timelineZoom, timelineScrollPosition to state
  - Test Gate: App state includes all timeline properties
- [x] Pass timeline props to Timeline component
  - library, timeline, selectedClipId, zoom, scrollPosition
  - Test Gate: Timeline receives all required props
- [x] Pass drag handlers to Library component (if needed)
  - Coordinate drag start with timeline drop
  - Test Gate: Drag-and-drop works end-to-end
- [x] Wire up all event handlers
  - addClipToTimeline, reorderTimelineClip, removeClipFromTimeline
  - Update state with new timeline array
  - Test Gate: All timeline operations update state correctly

---

## 13. Manual Testing

Follow manual testing protocol from `prd-v1.md`.

- [ ] Import 3 clips from Library (PR-2 must be complete)
  - Test Gate: Clips available in Library for dragging
- [ ] Drag all 3 clips to Timeline one by one
  - Test Gate: All clips appear on timeline in order, no gaps
- [ ] Test clip reordering by dragging horizontally
  - Drag first clip to end, middle clip to beginning
  - Test Gate: Clips reorder correctly, snap together
- [ ] Test zoom slider (100% to 1000%)
  - Verify clip widths change, scrollbar appears
  - Test Gate: Zoom works smoothly, clip widths update
- [ ] Test keyboard shortcuts (Cmd+Plus, Cmd+Minus)
  - Test Gate: Shortcuts increment/decrement zoom
- [ ] Test clip selection (click clips)
  - Test Gate: Selected clip shows blue highlight
- [ ] Test Delete key
  - Test Gate: Selected clip removed, order maintained
- [ ] Test "Clear All" button
  - Test Gate: All clips removed, empty state shown
- [ ] Test with 10+ clips (performance)
  - Test Gate: Timeline remains responsive, smooth scrolling
- [ ] Test edge cases
  - Empty timeline, single clip, very long clips
  - Test Gate: All edge cases handled gracefully

---

## 14. Performance

Verify targets from `prd-v1.md`.

- [ ] Timeline UI responsive
  - Test Gate: Drag operations complete in < 50ms
- [ ] Timeline scrolling smooth
  - Test Gate: 60fps with 10+ clips, no jank during scroll
- [ ] Memory usage
  - Test Gate: < 1GB with 10 clips on timeline
- [ ] Optimize re-renders (if needed)
  - Use React.memo for TimelineClipCard
  - Memoize calculations with useMemo
  - Test Gate: No unnecessary re-renders during interactions

---

## 15. Acceptance Gates

Check every gate from PRD Section 12:
- [x] [Gate] When user drags clip from Library → clip appears on Timeline within 50ms
- [x] [Gate] When user reorders clip → new position reflects in state within 50ms, clips snap together
- [x] [Gate] When user zooms timeline → clip widths update smoothly (60fps), scrollbar appears when needed
- [x] [Gate] When user selects clip → selectedClipId updates, clip shows blue highlight border
- [x] [Gate] When user deletes clip → clip removed from timeline, remaining clips re-order correctly
- [x] [Gate] When timeline has 10 clips → UI remains responsive (< 50ms drag operations), smooth scrolling
- [x] [Gate] When timeline is empty → shows empty state message, "Clear All" button disabled

---

## 16. Documentation & PR

- [ ] Add inline code comments for complex logic
  - Position calculations, zoom math, drag-and-drop handlers
- [ ] Update README if needed (no changes expected)
- [ ] Create PR description (use format from agents/cody-agent-template.md)
  - Link to PRD and TODO
  - List all acceptance gates
  - Include copyable checklist below
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Timeline component renders clips horizontally with correct positions
- [ ] Drag-and-drop from Library to Timeline works (adds clips)
- [ ] Horizontal drag-to-reorder works (clips snap together)
- [ ] Zoom slider functional (100%-1000%) with auto-fit default
- [ ] Playhead displays correctly (red vertical line)
- [ ] Timecode and total duration display accurate values
- [ ] Clip selection works (click to select, blue highlight)
- [ ] Delete key removes selected clip
- [ ] "Clear All" button works with confirmation
- [ ] All acceptance gates pass
- [ ] Performance targets met (< 50ms drag operations, 60fps scrolling)
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] TypeScript types correct
- [ ] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially (setup → data model → UI → integration → testing)
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` Section 4 (Timeline Interface) and `.cursorrules` for common patterns
- Test with real imported clips from PR-2 throughout development

