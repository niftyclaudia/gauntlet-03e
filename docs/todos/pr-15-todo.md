# PR-15 TODO — Split & Advanced Trim

**Branch**: `feat/pr-15-split-advanced-trim`  
**Source PRD**: `docs/prds/pr-15-split-advanced-trim-prd.md`  
**Owner (Agent)**: Cody

---

## 0. Clarifying Questions & Assumptions

- Questions: None (all answered in PRD)
- Assumptions (confirm in PR if needed):
  - Existing trim functionality works correctly
  - Timeline state management patterns are established
  - Playhead position tracking is reliable
  - Export pipeline handles multiple segments automatically

---

## 1. Setup

- [ ] Create branch `feat/pr-15-split-advanced-trim` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-15-split-advanced-trim-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context
- [ ] Review existing trim implementation in `src/hooks/useTrimDrag.ts` and `src/components/Timeline.tsx`
- [ ] Confirm environment and Electron dev server work

---

## 2. Service Layer

No new IPC handlers needed - all operations are client-side state management.

---

## 3. Data Model & File Operations

No new interfaces needed - existing `TimelineClip` is sufficient.

- [ ] Review existing `TimelineClip` interface in `src/types/video.ts`
  - Test Gate: Interface includes all fields needed for split operation
- [ ] Add snap state to App.tsx timeline state
  - Test Gate: Snap settings persist across app sessions

---

## 4. UI Components

Create/modify React components per PRD Section 10.

### New Components

- [ ] Create `src/components/TimelineSplitButton.tsx`
  - Props: `enabled: boolean`, `onClick: () => void`
  - Visual: Icon button with "Split" label
  - Disabled state: Grayed out when playhead not over clip
  - Keyboard shortcut: Cmd/Ctrl+Shift+X
  - Test Gate: Button renders, enabled/disabled states work, click triggers callback

- [ ] Create `src/components/TimelineSnapToggle.tsx`
  - Props: `enabled: boolean`, `interval: '1sec' | '500ms' | 'frame'`, `onToggle: () => void`, `onIntervalChange: (interval) => void`
  - Visual: Checkbox + dropdown for interval selection
  - Test Gate: Toggle works, interval selector updates correctly

- [ ] Create `src/components/SnapIndicator.tsx`
  - Props: `position: number`, `visible: boolean`
  - Visual: Highlighted vertical line at snap point
  - Test Gate: Line appears at correct position when snap point reached

- [ ] Create `src/components/FrameCounter.tsx`
  - Props: `time: number`, `framerate: number = 30`
  - Visual: Timecode display in HH:MM:SS:FF format
  - Logic: Calculate frames from time and framerate
  - Test Gate: Correctly formats timecodes, handles 30fps and 29.97fps

### Modified Components

- [ ] Modify `src/components/Timeline.tsx`
  - Add split button rendering in toolbar area
  - Detect when playhead is over a clip (for split button enable/disable)
  - Add snap logic to trim drag operations
  - Render snap indicator when snap point reached
  - Add split visual divider between split segments
  - Test Gate: Split button appears, snap works during trim, visual feedback shown

- [ ] Modify `src/components/TimelineClipCard.tsx`
  - Add subtle visual divider line for split segments
  - Detect if clip is a split segment (adjacent to another segment with same libraryClipId)
  - Test Gate: Visual divider appears between split segments

- [ ] Modify `src/components/TrimTooltip.tsx`
  - Add frame count display using FrameCounter component
  - Update timecode format to HH:MM:SS:FF
  - Test Gate: Frame counts display correctly during trim

- [ ] Wire up state management
  - Add `snapEnabled` and `snapInterval` state to App.tsx
  - Add `handleSplit` handler in App.tsx
  - Pass state and handlers to Timeline component
  - Test Gate: Split operations update timeline state correctly

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

### Timeline Operations

- [ ] Implement `splitClipAtPlayhead` function in `src/utils/timelineOperations.ts`
  - Logic:
    1. Find clip to split by matching playhead position to clip boundaries
    2. Calculate local playhead position within clip (accounting for trim points)
    3. Validate split point (minimum 1-second segment duration)
    4. Create two segments with correct trimStart/trimEnd
    5. Update order properties for all following clips
    6. Return new timeline array
  - Error handling: Return original timeline if split invalid
  - Test Gate: Function correctly splits clip, handles edge cases

- [ ] Implement `snapToGrid` function in `src/utils/trimCalculations.ts`
  - Logic:
    1. Convert time to snap intervals (1sec, 500ms, or frame-precise)
    2. Round to nearest interval
    3. Return snapped time
  - Parameters: `time: number, interval: '1sec' | '500ms' | 'frame', framerate: number = 30`
  - Test Gate: Correctly snaps time to intervals, handles 30fps framerate

- [ ] Modify `useTrimDrag` hook in `src/hooks/useTrimDrag.ts`
  - Add snap logic to `handleTrimMove`
  - Check if snap enabled, apply snap before updating trim values
  - Calculate snap tolerance (3 pixels at current zoom level)
  - Emit snap event when snap point reached (for visual indicator)
  - Test Gate: Trim drag snaps to grid when enabled, visual feedback appears

### Export Integration

- [ ] Verify export pipeline handles split segments
  - Review existing export logic in `src/main/ffmpeg.ts`
  - Confirm export correctly processes each segment with its trim points
  - Test Gate: Export produces correct video with split segments

---

## 6. Manual Testing

Follow manual testing protocol from PRD Section 12.

### Happy Path Tests

- [ ] **Test 1: Basic Split**
  - Import 30-second video clip
  - Position playhead at 10-second mark
  - Click Split button (or Cmd/Ctrl+Shift+X)
  - **Gate**: Two segments created (0-10s and 10-30s), both visible on timeline
  - Drag both segments to preview player
  - **Gate**: Both play correctly at their trim points

- [ ] **Test 2: Split Then Trim**
  - Split clip at 15-second mark
  - Select first segment
  - Drag right trim handle to 10 seconds
  - **Gate**: First segment trims to 0-10s, second segment unchanged at 15-30s

- [ ] **Test 3: Multiple Splits**
  - Split same clip 3 times at different points (4 segments total)
  - **Gate**: All 4 segments visible on timeline
  - Export sequence
  - **Gate**: Export produces correct video with all segments concatenated

### Edge Case Tests

- [ ] **Test 4: Split Near Start**
  - Split at 1.1 second mark
  - **Gate**: First segment minimum 1 second, second segment continues
  - Try to split again at 2.1 seconds
  - **Gate**: Split succeeds (multiple segments possible)

- [ ] **Test 5: Split at Boundary**
  - Split at exact start of clip (playhead at 0)
  - **Gate**: Error message or split disabled (minimum segment duration)
  - Try to split at exact end
  - **Gate**: Error message or split disabled

- [ ] **Test 6: Very Short Segment**
  - Split to create 1-second first segment
  - Drag it around timeline
  - **Gate**: Segment displays correctly, no visual glitches

### Snap-to-Grid Tests

- [ ] **Test 7: 1-Second Snap**
  - Enable snap-to-grid, select 1-second interval
  - Drag trim handle to approximately 1.43 seconds
  - **Gate**: Handle snaps to 1.00 or 2.00 seconds (whichever is closer)
  - Visual highlight appears at snap point
  - **Gate**: Snap within 3 pixels of target

- [ ] **Test 8: 500ms Snap**
  - Set snap interval to 500ms
  - Drag trim handle to 1.73 seconds
  - **Gate**: Handle snaps to 1.5 or 2.0 seconds

- [ ] **Test 9: Frame-Precise Snap**
  - Set snap to frame (30fps)
  - Drag to 1.033 seconds (approximately frame 31)
  - **Gate**: Handle snaps to 1.000s (frame 0) or 1.067s (frame 2)
  - Verify with frame counter in trim tooltip
  - **Gate**: Frame count matches snapped time

### Performance Tests

- [ ] **Test 10: Split Response Time**
  - Import long 5-minute clip
  - Split clip 10 times (11 segments)
  - Measure time from split click to segments appearing
  - **Gate**: Split completes in <50ms, timeline remains responsive

- [ ] **Test 11: Snap Visual Feedback**
  - Enable snap
  - Rapidly drag trim handle across multiple snap points
  - **Gate**: Highlight updates smoothly without lag, no jank

- [ ] **Test 12: Multiple Split Segments**
  - Create 10 segments from single clip
  - Drag all segments around, trim various segments
  - **Gate**: Timeline renders smoothly, drag still <50ms response

- [ ] **Test 13: Snap with Multiple Tracks**
  - Import 3-4 different video clips to timeline
  - Enable snap-to-grid functionality
  - Drag trim handles across multiple clips
  - **Gate**: Snap works consistently across all clips, no interference between tracks
  - Test snap alignment when clips are adjacent to each other
  - **Gate**: Snap respects clip boundaries and doesn't cause visual glitches

---

## 7. Performance

Verify targets from PRD Section 4.

- [ ] Split operation <50ms response time
  - Test Gate: Measured with DevTools Performance profiler
- [ ] Snap-to-grid alignment within 1-3 pixels
  - Test Gate: Visual verification and pixel measurement
- [ ] Timeline UI responsive with 20+ clips (including splits)
  - Test Gate: Drag operations <50ms, no frame drops
- [ ] Snap visual feedback 60fps
  - Test Gate: DevTools frame rate monitor shows 60fps during snap

---

## 8. Acceptance Gates

Check every gate from PRD Section 12:
- [ ] All happy path gates pass (Test 1-3)
- [ ] All edge case gates pass (Test 4-6)
- [ ] All snap-to-grid gates pass (Test 7-9)
- [ ] All performance gates pass (Test 10-12)
- [ ] Multi-track snap testing passes (Test 13)

---

## 9. Documentation & PR

- [ ] Add inline code comments for split logic
- [ ] Document snap calculation algorithm
- [ ] Update README if needed
- [ ] Create PR description using format from agents/cody-agent-template.md
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Split button component implemented
- [ ] Snap-to-grid functionality implemented
- [ ] Frame counter display implemented
- [ ] Split operation works correctly
- [ ] Visual feedback for snap points working
- [ ] Manual testing complete with real video files
- [ ] Performance targets met (split <50ms, snap 60fps)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially (start with utility functions, then components)
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions
- No IPC handlers needed - this is pure React state management
- Leverage existing trim infrastructure
- Focus on visual feedback for snap (critical for UX)
- Test with various clip durations and frame rates

