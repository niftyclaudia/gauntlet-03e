# PR-6 TODO — Video Trimming

**Branch**: `feat/pr-6-trimming`  
**Source PRD**: `docs/prds/pr-6-prd.md`  
**Owner (Agent)**: Pete

---

## 0. Clarifying Questions & Assumptions

- Questions: None - PRD is clear
- Assumptions (confirm in PR if needed):
  - PR-3 (Timeline) is complete and timeline clips display correctly
  - PR-4 (Video Preview) is complete and preview respects trim points
  - PR-5 (Auto-Save) is complete and trim points will be persisted
  - Trim handles are currently visual only (need to make interactive)
  - TimelineClip interface already has trimStart and trimEnd (no data model changes needed)

---

## 1. Setup

- [ ] Create branch `feat/pr-6-trimming` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-6-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` Section 5 (Video Trimming) for context
- [ ] Review existing TimelineClipCard component to understand handle structure
- [ ] Review existing Timeline component to understand clip state management
- [ ] Review existing VideoPlayer component to verify trim point handling (PR-4)
- [ ] Review existing FFmpeg utilities for thumbnail generation patterns
- [ ] Review existing IPC handlers for patterns
- [ ] Confirm environment and Electron dev server work

---

## 2. Service Layer (IPC Handlers)

### 2.1 IPC Handler for Trim Clip

- [x] Add `trim:trimClip` IPC handler to `src/main/ipcHandlers.ts`
  - Parameters: `clipId: string, inPoint: number, outPoint: number, clipDuration: number`
  - Validates clipId exists in timeline state
  - Validates trim values: `inPoint >= 0`, `outPoint > inPoint`, `outPoint - inPoint >= 0.5`
  - Returns `Promise<{ success: boolean; inPoint: number; outPoint: number }>`
  - Handles errors (throws Error with descriptive message)
  - Test Gate: Handler validates trim values correctly, rejects invalid values

- [x] Register `trim:trimClip` handler in `registerIpcHandlers()` function
  - Test Gate: Handler registered, no console errors on app start

---

## 3. Preload Script Updates

- [x] Add `trim.trimClip` method to contextBridge API in `src/preload.ts`
  - Add to existing `trim` object (or create if doesn't exist)
  - Calls `ipcRenderer.invoke('trim:trimClip', clipId, inPoint, outPoint, clipDuration)`
  - Returns `Promise<{ success: boolean; inPoint: number; outPoint: number }>`
  - Test Gate: Method exposed on `window.electron.trim.trimClip`

---

## 4. Type Definitions (Renderer)

- [x] Update `ElectronAPI` interface in `src/renderer/types/electron.d.ts`
  - Add `trim: { trimClip: (clipId: string, inPoint: number, outPoint: number, clipDuration: number) => Promise<{ success: boolean; inPoint: number; outPoint: number }> }`
  - Test Gate: TypeScript compiles, types match preload API

---

## 5. Trim Calculation Utilities

- [x] Create `src/utils/trimCalculations.ts` with utility functions
  - Test Gate: File created, exports functions

- [x] Implement `pixelsToTime()` function in `trimCalculations.ts`
  - Converts mouse X position (in pixels) to time in seconds
  - Parameters: `pixelX: number, clipStartX: number, zoom: number`
  - Returns clamped time within valid range [0, clip duration]
  - Test Gate: Converts pixels to time correctly at different zoom levels

- [x] Implement `timeToPixels()` function in `trimCalculations.ts`
  - Converts time in seconds to pixel X position
  - Parameters: `time: number, clipStartX: number, zoom: number`
  - Returns pixel X position relative to timeline container
  - Test Gate: Converts time to pixels correctly at different zoom levels

- [x] Implement `validateTrimStart()` function in `trimCalculations.ts`
  - Parameters: `trimStart: number, trimEnd: number, clipDuration: number`
  - Validates: `trimStart >= 0`, `trimStart < trimEnd`, `trimEnd - trimStart >= 0.5`
  - Returns valid trimStart (clamped to constraints)
  - Test Gate: Constraints enforced correctly, handles edge cases

- [x] Implement `validateTrimEnd()` function in `trimCalculations.ts`
  - Parameters: `trimStart: number, trimEnd: number, clipDuration: number`
  - Validates: `trimEnd <= clipDuration`, `trimEnd > trimStart`, `trimEnd - trimStart >= 0.5`
  - Returns valid trimEnd (clamped to constraints)
  - Test Gate: Constraints enforced correctly, handles edge cases

- [x] Implement `getMinTrimStart()` function in `trimCalculations.ts`
  - Parameters: `trimEnd: number, clipDuration: number`
  - Returns: Minimum valid trimStart (ensures minimum duration)
  - Test Gate: Returns correct minimum value

- [x] Implement `getMaxTrimEnd()` function in `trimCalculations.ts`
  - Parameters: `trimStart: number, clipDuration: number`
  - Returns: Maximum valid trimEnd (ensures minimum duration)
  - Test Gate: Returns correct maximum value

---

## 6. Custom Hook for Trim Drag (Centralized)

- [x] Create `src/hooks/useTrimDrag.ts` custom hook
  - Test Gate: File created, exports hook

- [x] Implement hook state management in `useTrimDrag.ts`
  - State: `dragging: TrimDragState | null`, `draggedInPoint: number | null`, `draggedOutPoint: number | null`, `tooltipPosition: {x, y}`, `tooltipVisible: boolean`
  - Interface: `TrimDragState` includes `clipId`, `edge`, `initialInPoint`, `initialOutPoint`, `initialMouseX`, `initialClipStartX`, `initialClipWidth`, `timelineStartTime`
  - Returns: drag state and handlers for trim operations
  - Test Gate: Hook initializes correctly, state updates work

- [x] Implement `handleTrimStart()` in `useTrimDrag.ts`
  - Parameters: `clipId, edge, initialInPoint, initialOutPoint, clipStartX, mouseX, mouseY, timelineStartTime, initialClipWidth?`
  - Sets dragging state with initial values
  - Sets initial draggedInPoint/draggedOutPoint and fixed points
  - Sets tooltip position and visibility
  - Test Gate: Trim start initializes state correctly, tooltip positioned

- [x] Implement `handleTrimMove()` in `useTrimDrag.ts`
  - Parameters: `mouseX, clipDuration, mouseXScreen?, mouseYScreen?, currentClipStartX?`
  - Calculates new trim values based on mouse delta
  - Updates draggedInPoint/draggedOutPoint with constraint validation
  - Updates tooltip position to follow mouse cursor
  - Uses `validateTrimStart()` and `validateTrimEnd()` from trimCalculations
  - Test Gate: Mouse move updates dragged values correctly, constraints enforced, tooltip follows cursor

- [x] Implement `handleTrimEnd()` in `useTrimDrag.ts`
  - Clears dragging state
  - Clears dragged values and tooltip
  - Test Gate: Trim end clears state correctly

- [x] Ensure smooth 60fps updates (global mouse listeners allow smooth dragging)
  - Test Gate: Drag feels smooth, no janky updates

---

## 7. TimelineClipCard Component Updates

### 7.1 Add Trim Handle Interactions

- [x] Add `onTrimStart` prop to `TimelineClipCardProps` interface
  - Callback: `(clipId: string, edge: 'left' | 'right', e: React.MouseEvent) => void`
  - Test Gate: Prop added, TypeScript compiles

- [x] Add `onEdgeHoverChange` prop to `TimelineClipCardProps` interface
  - Callback: `(clipId: string | null, edge: 'left' | 'right' | null) => void`
  - Test Gate: Prop added, TypeScript compiles

- [x] Add props for trim drag state to `TimelineClipCardProps` interface
  - `isTrimming?: boolean` - Whether this clip is currently being trimmed
  - `draggedInPoint?: number | null` - Preview inPoint during drag
  - `draggedOutPoint?: number | null` - Preview outPoint during drag
  - `fixedInPoint?: number | null` - Fixed inPoint when dragging right handle
  - `fixedOutPoint?: number | null` - Fixed outPoint when dragging left handle
  - Test Gate: Props added, TypeScript compiles

- [x] Add mouse event handlers to left trim handle
  - `onMouseDown` → calls `onTrimStart(clip.id, 'left', e)`, prevents default/propagation
  - `onMouseEnter` → calls `onEdgeHoverChange(clip.id, 'left')`
  - `onMouseLeave` → calls `onEdgeHoverChange(null, null)` if not trimming
  - `onClick` → stops propagation (prevents clip selection)
  - Test Gate: Left handle triggers callback, doesn't interfere with clip drag

- [x] Add mouse event handlers to right trim handle
  - `onMouseDown` → calls `onTrimStart(clip.id, 'right', e)`, prevents default/propagation
  - `onMouseEnter` → calls `onEdgeHoverChange(clip.id, 'right')`
  - `onMouseLeave` → calls `onEdgeHoverChange(null, null)` if not trimming
  - `onClick` → stops propagation (prevents clip selection)
  - Test Gate: Right handle triggers callback, doesn't interfere with clip drag

- [x] Update clip display to use dragged trim values during drag
  - Use `draggedInPoint ?? fixedInPoint ?? clip.trimStart` for displayTrimStart
  - Use `draggedOutPoint ?? fixedOutPoint ?? clip.trimEnd` for displayTrimEnd
  - Update clip width calculation to use display trim values
  - Update duration display to show trimmed duration
  - Test Gate: Clip preview updates during drag, shows correct width and duration

### 7.2 Visual Feedback for Trim Handles

- [x] Add hover state styling to trim handles
  - Use `hoveredEdge` prop to determine if handle should highlight
  - Add CSS class `trim-handle-hovered` when `hoveredEdge` matches handle edge
  - Cursor changes to `ew-resize` on hover (via CSS)
  - Test Gate: Handles highlight on hover, cursor changes

- [x] Add dragging state styling to trim handles
  - Use `isTrimming` prop to determine if handle is being dragged
  - Add CSS class `trim-handle-dragging` when `isTrimming && hoveredEdge` matches
  - Cursor changes to `grabbing` during drag (via CSS/style prop)
  - Test Gate: Handles show visual feedback during drag

---

## 8. Timeline Component Updates

### 8.1 Trim Drag Hook Integration

- [x] Add `useTrimDrag` hook to Timeline component
  - Initialize with `zoom: timelineZoom` parameter
  - Test Gate: Hook initialized, no console errors

- [x] Add `hoveredEdge` state to Timeline component
  - State: `{ clipId: string; edge: 'left' | 'right' } | null`
  - Test Gate: State added, initializes to null

- [x] Implement `handleTrimStart` callback in Timeline
  - Parameters: `clipId, edge, event`
  - Finds clip and library clip from props
  - Calculates clip position using `calculateClipPosition()`
  - Calculates timeline start time using existing sequence calculations
  - Converts mouse position to timeline container coordinates (with scroll)
  - Calls `trimDrag.handleTrimStart()` with all calculated values
  - Test Gate: Trim start initializes drag correctly, calculates positions accurately

- [x] Implement `handleEdgeHoverChange` callback in Timeline
  - Updates `hoveredEdge` state based on clipId and edge
  - Test Gate: Hover state updates correctly, persists during drag

### 8.2 Global Mouse Listeners

- [x] Add `useEffect` to attach global mouse listeners during drag
  - Only attach when `trimDrag.dragging` is not null
  - `mousemove` listener: calculates mouse position, calls `trimDrag.handleTrimMove()`
  - `mouseup` listener: commits trim via IPC, calls `onTrimUpdate`, clears drag state
  - Cleanup: remove listeners when drag ends or component unmounts
  - Test Gate: Listeners attached/removed correctly, drag works smoothly beyond clip boundaries

- [x] Implement IPC trim commit in `mouseup` handler
  - Get final trim values from `trimDrag.draggedInPoint`/`draggedOutPoint` and fixed points
  - Call `window.electron.trim.trimClip(clipId, inPoint, outPoint, clipDuration)`
  - On success: call `onTrimUpdate` callback if provided
  - On error: log error, clear drag state (trim not applied)
  - Test Gate: IPC call works, trim committed correctly, errors handled gracefully

### 8.3 TrimTooltip Component

- [x] Import and render `TrimTooltip` component in Timeline
  - Conditionally render when `trimDrag.dragging && trimDrag.tooltipVisible`
  - Calculate original duration from clip's trimStart/trimEnd
  - Calculate new duration from `trimDrag.draggedInPoint`/`draggedOutPoint` and fixed points
  - Determine `isExpanding` (trimStart decreased or trimEnd increased)
  - Pass props: `originalDuration`, `newDuration`, `position`, `visible`, `isExpanding`
  - Test Gate: Tooltip displays during drag, shows correct durations, follows mouse cursor

### 8.4 Pass Trim Props to TimelineClipCard

- [x] Pass trim-related props to each TimelineClipCard
  - `onTrimStart={handleTrimStart}` - callback to start trim drag
  - `onEdgeHoverChange={handleEdgeHoverChange}` - callback for hover state
  - `hoveredEdge={hoveredEdge?.clipId === clip.id ? hoveredEdge.edge : null}`
  - `isTrimming={trimDrag.dragging?.clipId === clip.id}`
  - `draggedInPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.draggedInPoint : null}`
  - `draggedOutPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.draggedOutPoint : null}`
  - `fixedInPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.fixedInPoint : null}`
  - `fixedOutPoint={trimDrag.dragging?.clipId === clip.id ? trimDrag.fixedOutPoint : null}`
  - Test Gate: All props passed correctly, clip cards receive trim state

---

## 9. TrimTooltip Component Creation

- [x] Create `src/components/TrimTooltip.tsx` component
  - Test Gate: File created, exports component

- [x] Implement TrimTooltipProps interface
  - `originalDuration: number` - Original duration before trim (seconds)
  - `newDuration: number` - New duration after trim (seconds)
  - `position: { x: number; y: number }` - Tooltip position in pixels
  - `visible: boolean` - Whether tooltip is visible
  - `isExpanding: boolean` - Whether clip is expanding (trimStart decreased or trimEnd increased)
  - Test Gate: Interface defined, TypeScript compiles

- [x] Implement TrimTooltip component JSX
  - Fixed positioning using `position` prop
  - Display original duration → new duration (formatted with `formatDuration`)
  - Show duration change indicator (positive/negative)
  - Use `isExpanding` to determine if change is positive or negative
  - Transform to center above cursor (`translate(-50%, -100%)`)
  - High z-index, pointer-events: none
  - Test Gate: Component renders correctly, displays durations properly

- [x] Add conditional rendering
  - Return `null` if `visible` is false
  - Test Gate: Component doesn't render when not visible

---

## 10. App.tsx State Updates

- [x] Add `onTrimUpdate` handler in `App.tsx`
  - Updates `timeline` state: find clip by ID, update trimStart/trimEnd
  - Uses functional setState to ensure correct updates
  - Test Gate: State updates correctly, triggers re-render

- [x] Verify auto-save includes trim updates
  - Auto-save (PR-5) already includes trim points
  - Verified that trim values are saved correctly
  - Test Gate: Trim points persist in autosave file

---

## 11. CSS Styling Updates

- [x] Update trim handle styles in `src/index.css`
  - Add `.timeline-clip-trim-handle:hover` styles via `.timeline-clip-card:hover`
    - Slightly larger size, different color (e.g., brighter)
    - Cursor: `ew-resize`
  - Add `.trim-handle-hovered` and `.trim-handle-dragging` styles
    - Visual feedback during drag (e.g., active color, cursor: `grabbing`)
  - Ensure handles are positioned correctly (left/right edges)
  - Test Gate: Handles styled correctly, hover and drag states visible

- [x] Ensure trim handles don't interfere with clip drag
  - Set `pointer-events` appropriately
  - Prevent clip drag when interacting with handles
  - Test Gate: Can drag handles independently of clip drag

- [x] Add TrimTooltip styles in `src/index.css`
  - `.trim-tooltip` - fixed positioning, high z-index, pointer-events: none
  - `.trim-tooltip-content` - background, padding, border-radius, shadow
  - `.trim-tooltip-label` - label styling (e.g., "Duration")
  - `.trim-tooltip-durations` - flex container for duration display
  - `.trim-tooltip-original` - original duration styling
  - `.trim-tooltip-arrow` - arrow separator (→)
  - `.trim-tooltip-new` - new duration styling
  - `.trim-tooltip-positive` - positive change (green/increase)
  - `.trim-tooltip-negative` - negative change (red/decrease)
  - `.trim-tooltip-change` - change indicator styling
  - Test Gate: Tooltip styled correctly, readable, visible during drag

---

## 12. Preview Player Integration

- [x] Verify VideoPlayer updates when trim values change
  - VideoPlayer (PR-4) already watches trimStart/trimEnd
  - Verified that changing trim values updates preview immediately
  - Test Gate: Preview reflects new trim boundaries immediately

- [x] Test preview playback with trimmed clips
  - Playback starts at trimStart, stops at trimEnd
  - Scrubbing respects trim boundaries
  - Test Gate: Preview plays only trimmed portion correctly

- [x] Test sequence preview with trimmed clips
  - Verified trimmed clips play correctly in sequence mode
  - Test Gate: Sequence respects trim points for all clips

---

## 13. Integration Testing

- [x] Test trim handle drag with different zoom levels
  - Low zoom (100%): Trim precision appropriate
  - High zoom (1000%): Trim precision more accurate
  - Test Gate: Trimming works at all zoom levels

- [x] Test trim constraints (minimum duration)
  - Tried to drag handles past 0.5s minimum
  - Verified handles snap to valid position
  - Test Gate: Constraints enforced, handles don't cross

- [x] Test trim with multiple clips on timeline
  - Trimmed first clip, then second, then third
  - Verified each clip trims independently
  - Test Gate: Multiple clips can be trimmed, no interference

- [x] Test trim with very short clips (near 0.5s minimum)
  - Verified handles still work within minimal range
  - Test Gate: Short clips can still be trimmed slightly

- [x] Test trim with very long clips (several minutes)
  - Verified trim precision at different zoom levels
  - Test Gate: Long clips trim correctly, precision appropriate

---

## 14. IPC Integration Testing

- [x] Test IPC `trim:trimClip` handler validation
  - Call with valid trim values → returns success with validated trim values
  - Call with invalid clipId → returns error (validated in renderer)
  - Call with invalid trim values (negative, reversed, too short) → returns error
  - Test Gate: IPC handler validates correctly, rejects invalid values

- [x] Test trim commit flow (mouse up → IPC → state update)
  - Drag handle, release mouse → IPC call triggered
  - Verified IPC success triggers `onTrimUpdate` callback
  - Verified App state updates with new trim values
  - Test Gate: Trim committed correctly, state updated after IPC success

- [x] Test IPC error handling
  - Tested IPC failure scenarios (invalid trim values)
  - Verified error logged, drag state cleared, trim not applied
  - Verified UI remains responsive, user can retry
  - Test Gate: Errors handled gracefully, trim operation doesn't leave bad state

- [x] Test trim tooltip display
  - Verified tooltip appears during drag
  - Verified tooltip shows correct original → new duration
  - Verified tooltip follows mouse cursor
  - Verified tooltip disappears on mouse up
  - Test Gate: Tooltip displays correctly, provides useful feedback

---

## 15. Auto-Save Integration Testing

- [x] Verify trim points are saved in auto-save
  - Trimmed clips, waited for auto-save (30s interval)
  - Checked autosave.json file contains updated trim points
  - Test Gate: Trim points included in autosave file

- [x] Test session restore with trim points
  - Trimmed clips, closed app, reopened app
  - Verified trim points restored correctly
  - Verified preview reflects restored trim boundaries
  - Test Gate: Trim points persist across app restarts

---

## 16. Performance Testing

- [x] Test handle drag responsiveness
  - Measured time from mouse down to first trim update
  - Confirmed < 50ms per prd-v1.md
  - Test Gate: Drag response time < 50ms

- [x] Test handle drag smoothness
  - Dragged handle and verified updates are smooth (60fps)
  - No frame drops or stuttering observed
  - Test Gate: Drag feels smooth, no visible stuttering

- [x] Test timeline UI responsiveness during trim
  - Tried to zoom, scroll, select other clips while dragging handle
  - UI remained responsive
  - Test Gate: Other interactions work during trim drag

- [x] Test IPC trim commit performance
  - Measured time from mouse up to IPC completion
  - Confirmed < 100ms per PRD
  - Does not block UI
  - Test Gate: IPC trim commit < 100ms, non-blocking

- [x] Test memory usage with multiple trimmed clips
  - Trimmed 10 clips, monitored memory usage
  - Remained < 1GB per prd-v1.md
  - Test Gate: Memory usage acceptable, no leaks

---

## 17. Edge Case Testing

- [x] Test trim with clip at minimum duration (0.5s)
  - Tried to drag handles further (constrained correctly)
  - Test Gate: Minimum duration enforced, handles cannot cross

- [x] Test rapid trim operations
  - Quickly dragged handle back and forth
  - Verified state updates correctly, no errors
  - Test Gate: Rapid operations handled correctly

- [x] Test trim on very edge of clip (0.1s from start/end)
  - Verified trim handles still accessible
  - Test Gate: Edge cases handled, trim still works

- [x] Test trim with invalid clipId
  - Tested error handling scenarios
  - Verified IPC fails gracefully, drag state cleared
  - Test Gate: Invalid state handled gracefully, no crashes

---

## 18. Manual Testing Protocol

Follow manual testing protocol from prd-v1.md Section 12:

- [x] Import 3 video clips (MP4/MOV, 1080p)
  - Test Gate: Clips import successfully

- [x] Add clips to timeline
  - Test Gate: Clips appear on timeline

- [x] Trim first clip: drag left handle to remove 5 seconds from start
  - Verified tooltip appears showing duration change
  - Verified duration decreases during drag
  - Verified clip width adjusts during drag
  - Verified IPC commit on mouse up
  - Verified preview shows new start (thumbnail regeneration deferred per PRD)
  - Test Gate: Left handle trims correctly, tooltip displays, IPC commits, all updates reflect change

- [x] Trim second clip: drag right handle to remove 3 seconds from end
  - Verified duration decreases
  - Verified preview stops at new end
  - Test Gate: Right handle trims correctly, preview respects end

- [x] Trim third clip: trim both ends to create 10-second clip
  - Dragged left handle to set start
  - Dragged right handle to set end
  - Verified clip duration is 10 seconds
  - Verified preview plays only 10 seconds
  - Test Gate: Both handles work together, clip trimmed correctly

- [x] Preview sequence with trimmed clips
  - Clicked "Preview Sequence" button
  - Verified all clips play in order
  - Verified trimmed portions only play
  - Verified smooth transitions between clips
  - Test Gate: Sequence preview respects trim points, smooth playback

- [x] Close and reopen app
  - Verified trim points restored
  - Verified preview reflects trim boundaries
  - Test Gate: Trim points persist, session restore works

---

## 19. Acceptance Gates

Check every gate from PRD Section 12:

### Happy Path Gates
- [x] Gate: User drags left handle → `onTrimStart` fires, `useTrimDrag` manages state, `draggedInPoint` updates, tooltip shows, duration display updates, clip width adjusts, preview reflects change
- [x] Gate: User drags right handle → `onTrimStart` fires, `useTrimDrag` manages state, `draggedOutPoint` updates, tooltip shows, duration display updates, clip width adjusts, preview reflects change
- [x] Gate: User trims clip from both ends → both trimStart and trimEnd updated correctly via IPC, clip plays only trimmed portion, tooltip displays correctly

### Edge Case Gates
- [x] Gate: trimStart cannot exceed (duration - 0.5s), constraint enforced in `useTrimDrag.handleTrimMove` and `validateTrimStart`, handles snap to valid position
- [x] Gate: trimEnd cannot go below (trimStart + 0.5s), constraint enforced in `useTrimDrag.handleTrimMove` and `validateTrimEnd`, handles snap to valid position
- [x] Gate: trimStart and trimEnd always maintain minimum 0.5s duration

### IPC Integration Gates
- [x] Gate: IPC `trim:trimClip` handler validates trim values correctly, returns success with validated trim values
- [x] Gate: Trim operation commits via IPC on mouse up, `onTrimUpdate` callback updates App state correctly

### Performance Gates
- [x] Gate: Drag feels smooth at 60fps, no lag or stuttering (global mouse listeners)
- [x] Gate: Can drag handle while timeline scrolls, zoom works, other clips selectable
- [x] Gate: Global mouse listeners allow dragging beyond clip boundaries, UI remains responsive (< 50ms response time)
- [x] Gate: IPC trim commit < 100ms, non-blocking

### Auto-Save Integration Gates
- [x] Gate: Trim points restored correctly after app restart, preview reflects trim boundaries
- [x] Gate: Auto-save file includes updated trim points after trim operation

### Preview Integration Gates
- [x] Gate: Preview plays only trimmed portion, stops at trimEnd, starts at trimStart
- [x] Gate: Playback position adjusts if needed, trim boundaries respected

---

## 20. Documentation & PR

- [x] Add inline code comments for complex logic
  - Trim calculation functions
  - Pixel-to-time conversion
  - Constraint validation
  - Global mouse listener setup/teardown
  - IPC trim commit flow
  - Tooltip position calculation
  - Test Gate: Code is well-commented, logic is clear

- [x] Update README if needed (no changes expected for MVP)
  - Test Gate: README accurate if updated (no changes needed)

- [x] Documentation updated (PRD and TODO)
  - PRD marked as Complete
  - TODO items marked as completed
  - Test Gate: Documentation complete and accurate

- [x] PR ready for review
  - Test Gate: PR ready for user approval

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handler `trim:trimClip` implemented in main process
- [ ] `useTrimDrag` hook implemented for centralized trim state management
- [ ] `TrimTooltip` component displays duration changes during drag
- [ ] Global mouse listeners implemented for smooth drag operations
- [ ] React components implement trim handle drag interactions (TimelineClipCard → Timeline)
- [ ] Trim state updates correctly in AppState.timeline via `onTrimUpdate` callback
- [ ] Auto-save functionality includes trim points (verified)
- [ ] Manual testing complete with real video files
- [ ] Performance targets met (timeline responsive < 50ms, IPC < 100ms)
- [ ] All acceptance gates pass (drag handles, constraints, preview, tooltip, IPC)
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings or errors
- [ ] Documentation updated (code comments, inline documentation)
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially (some depend on previous tasks)
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- Test frequently with real video files during development
- Focus on smooth drag experience - performance is critical for UX (global mouse listeners enable smooth dragging)
- `useTrimDrag` hook centralizes state - cleaner architecture than per-clip hooks
- Tooltip provides immediate feedback during drag - important for good UX
- Global mouse listeners allow dragging beyond clip boundaries - essential for smooth interaction

---

## Critical Dependencies

**Must complete before testing:**
1. Setup (Section 1)
2. Service Layer (Section 2) - IPC handler for trim validation
3. Trim Utilities (Section 5) - Calculations needed for drag logic
4. Custom Hook (Section 6) - Core drag logic (`useTrimDrag`)
5. TrimTooltip Component (Section 9) - Visual feedback component
6. Timeline Component Updates (Section 8) - Global listeners, hook integration, tooltip rendering
7. TimelineClipCard Updates (Section 7) - Callback integration, preview display

**Can be tested incrementally:**
- IPC integration (Section 13) - can test after basic trimming works
- Auto-save integration (Section 14) - can test after trimming works
- Edge cases (Section 16) - test after happy path works

**Final validation:**
- Manual testing protocol (Section 17) - comprehensive end-to-end test
- Acceptance gates (Section 18) - verify all requirements met

