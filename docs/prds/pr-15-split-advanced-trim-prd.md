# PRD: Split & Advanced Trim

**Feature**: Split & Advanced Trim

**Version**: 1.0

**Status**: Ready for Development

**Agent**: Pete

**Target Release**: Sprint 15

**PR Number**: 15

**Links**: [PR Brief], [TODO], [Designs], [Tracking Issue]

---

## 1. Summary

Split & Advanced Trim enables video editors to split clips at any point on the timeline and trim with frame-precision. Users can position the playhead, click a Split button to divide clips into segments, and use snap-to-grid functionality for precise alignment. This reduces workflow friction and enables tight edits without re-importing clips.

**Key Outcome**: User positions playhead → clicks Split → clip divided into two segments → trim with snap-to-grid for frame precision → export correctly reflects split segments.

---

## 2. Problem & Goals

- **What video editing problem are we solving?** Editors need to create tight cuts and remove unwanted portions from middle of clips, but currently can only trim from edges. Without split functionality, users must re-import the same clip multiple times to achieve jump cuts.
- **Why now?** Basic trimming (PR-6) is complete. Split and advanced trim are essential for professional editing workflows and natural next step.
- **Goals (ordered, measurable):**
  - [ ] G1 — Enable split at playhead position with one click
  - [ ] G2 — Provide snap-to-grid with visual feedback for precise alignment
  - [ ] G3 — Display frame counts and timecodes for frame-precise editing

---

## 3. Non-Goals / Out of Scope

**Intentionally Excluded:**
- ❌ **Trim ripple edits**: Adjusting subsequent clips when trimming (advanced feature)
- ❌ **Frame-accurate scrubbing**: Sub-frame precision (second-level acceptable)
- ❌ **Split preview before committing**: See result before applying split
- ❌ **Multi-clip splitting**: Split multiple clips simultaneously
- ❌ **Scene cut detection**: Automatic split points
- ❌ **Trim handles with waveform**: Visual waveform preview on handles
- ❌ **Undo/redo for split operations**: (Separate feature S21)

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- **User-visible**: Split operation completes in <100ms with visual feedback
- **System**: [See performance requirements in prd-v1.md]
  - Split operation: <50ms response time
  - Snap-to-grid alignment: Within 1-3 pixels of target
  - Timeline UI remains responsive with 20+ clips
- **Quality**: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a **video editor**, I want to split clips at any point so that I can remove unwanted portions from the middle of clips without re-importing.
- As a **content creator**, I want snap-to-grid functionality so that I can align clips precisely to specific time intervals.
- As a **tutorial maker**, I want frame counts displayed so that I can make frame-accurate edits for smooth pacing.

---

## 6. Experience Specification (UX)

### Entry Points and Flows

1. **Split Button**: Button in timeline toolbar or keyboard shortcut (Cmd/Ctrl+X)
2. **Snap Toggle**: Checkbox in timeline toolbar to enable/disable snap-to-grid

### Happy Path Flow

```
User positions playhead within a clip
  ↓
User clicks "Split" button (or Cmd/Ctrl+X)
  ↓
Clip splits into two segments at playhead
  ↓
User enables snap-to-grid
  ↓
User drags trim handle → snaps to grid lines
  ↓
Visual highlight shows snap point
  ↓
Export uses split segments correctly
```

### Visual Behavior

- **Split button**: Enabled when playhead is over a clip, disabled otherwise
- **Snap-to-grid lines**: Vertical lines at snap intervals (configurable: 1sec, 500ms, or frame)
- **Snap visual feedback**: Highlighted vertical line when snap point reached
- **Frame count display**: Timecode shows hours:minutes:seconds:frames (e.g., "00:10:15:05")
- **Split indicator**: Visual divider between split segments on timeline

### States

| State | Appearance | Actions | Notes |
|-------|-----------|---------|-------|
| **Playhead Over Clip** | Split button enabled, playhead at time position | Click Split or use shortcut | Ready to split |
| **Split Applied** | Two clip segments displayed, visual divider shown | Trim either segment independently | Both segments in timeline |
| **Snap Enabled** | Snap lines visible, trim drag snaps to grid | Drag trim handle, snap feedback shown | Precise alignment |

---

## 7. Functional Requirements (Must/Should)

### MUST (Core Split & Trim Functionality)

**REQ-1: Split at Playhead**
- User positions playhead within a clip on timeline
- "Split" button available in timeline toolbar or keyboard shortcut (Cmd/Ctrl+X)
- Split divides clip into two segments (before/after playhead)
- Both segments display correctly with updated durations
- Both segments inherit any trim points already applied
- Split near start/end creates minimal segment (1 second minimum) without error
- Cannot split when playhead not over a clip (button disabled)

**REQ-2: Frame-Precise Timecodes**
- Trim UI shows in/out point timecodes (e.g., "00:10.5 - 00:45.2")
- Frame count displayed for frame-precise trimming (e.g., "125 frames")
- Timecode format: HH:MM:SS:FF (hours:minutes:seconds:frames)
- Frame rate derived from source clip metadata (typically 30fps for video)

**REQ-3: Snap-to-Grid**
- Snap-to-grid option available with selectable intervals:
  - 1 second (default)
  - 500ms
  - Frame-precise (based on clip framerate)
- Snap-to-clip-edges automatically aligns adjacent clips
- Visual feedback (highlighted line) when snap point reached
- Toggle snap on/off via checkbox or keyboard shortcut
- Snap alignment within 1-3 pixels of target

**REQ-4: Split State Management**
- Split operation produces two independent clip objects in timeline state
- First segment: trimStart = original.trimStart, trimEnd = playhead position
- Second segment: trimStart = playhead position, trimEnd = original.trimEnd
- Both segments reference same library clip (libraryClipId)
- Order property updated: first segment keeps original order, second segment gets order+1
- Export correctly concatenates split segments

### SHOULD (Nice-to-Have Enhancements)

**REQ-5: Split UI Polish** (Post-MVP)
- Visual divider line between split segments
- Hover effect on split button shows preview line
- Split animation (fade-in of new segment)

**REQ-6: Advanced Snap Options** (Post-MVP)
- Custom snap interval input (user-defined milliseconds)
- Snap to scene cuts (requires scene detection)
- Snap to audio peaks (requires audio analysis)

### Acceptance Gates

| Scenario | Input | Expected Output | Pass Criteria |
|----------|-------|-----------------|---------------|
| **Happy Path 1: Basic Split** | Position playhead → Click Split | Clip divided into two segments | Both segments visible, durations correct |
| **Happy Path 2: Split Then Trim** | Split clip → Trim first segment | First segment trimmed, second unchanged | Trim affects only selected segment |
| **Edge Case 1: Split Near Start** | Split at 1 second mark | First segment 1s, second segment (duration-1s) | No errors, valid segments |
| **Edge Case 2: Split at Exact Boundary** | Split at trimStart or trimEnd | Error or disabled split | Graceful handling |
| **Error Case 1: No Clip Selected** | Click Split with playhead on empty timeline | Button disabled or error message | Clear feedback |
| **Snap Test 1: 1-Second Grid** | Enable snap, drag to ~1.5s mark | Handles snap to 1s or 2s | Alignment within 3 pixels |
| **Snap Test 2: Frame-Precise** | Enable frame snap (30fps), drag to 1.033s mark | Snaps to 1.000s or 1.067s (exact frames) | No drift |

---

## 8. Data Model

### Modified Interfaces

```typescript
// No new interfaces needed - existing TimelineClip is sufficient

// Split operation modifies timeline array:
interface TimelineClip {
  id: string;                    // Unique identifier (UUID)
  libraryClipId: string;         // Reference to source clip
  trimStart: number;             // Start trim point in seconds
  trimEnd: number;               // End trim point in seconds
  order: number;                 // Position in timeline
}

// Split creates two clips:
// Segment 1: { id: uuid1, libraryClipId: 'clip-A', trimStart: 0, trimEnd: 10, order: 5 }
// Segment 2: { id: uuid2, libraryClipId: 'clip-A', trimStart: 10, trimEnd: 30, order: 6 }
```

### Timeline State

```typescript
// In App.tsx timeline state
const [timeline, setTimeline] = useState<TimelineClip[]>([]);
const [snapEnabled, setSnapEnabled] = useState<boolean>(false);
const [snapInterval, setSnapInterval] = useState<'1sec' | '500ms' | 'frame'>('1sec');
```

### Split Operation

```typescript
function splitClipAtPlayhead(
  clipId: string,
  playheadPosition: number,
  timeline: TimelineClip[],
  library: VideoClip[]
): TimelineClip[] {
  // Find clip to split
  const clipIndex = timeline.findIndex(c => c.id === clipId);
  const clip = timeline[clipIndex];
  const libraryClip = library.find(lc => lc.id === clip.libraryClipId);
  
  if (!clip || !libraryClip) return timeline;
  
  // Calculate split point relative to clip start
  const clipStartTime = calculateClipStartTime(clipIndex, timeline, library);
  const localPlayheadTime = playheadPosition - clipStartTime;
  
  // Validate split point
  const minDuration = 1.0; // Minimum segment duration
  if (localPlayheadTime < clip.trimStart + minDuration || 
      localPlayheadTime > clip.trimEnd - minDuration) {
    return timeline; // Cannot split
  }
  
  // Create two segments
  const segment1: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: clip.trimStart,
    trimEnd: localPlayheadTime,
    order: clip.order
  };
  
  const segment2: TimelineClip = {
    id: uuidv4(),
    libraryClipId: clip.libraryClipId,
    trimStart: localPlayheadTime,
    trimEnd: clip.trimEnd,
    order: clip.order + 1
  };
  
  // Insert segments and reorder
  const newTimeline = [...timeline];
  newTimeline.splice(clipIndex, 1, segment1, segment2);
  return newTimeline.map((c, i) => ({ ...c, order: i }));
}
```

---

## 9. API / Service Contracts

No new IPC handlers needed. All operations are client-side state management in React.

### Snap Calculation Utility

```typescript
// Utils function for snap-to-grid
export function snapToGrid(
  time: number,
  interval: '1sec' | '500ms' | 'frame',
  framerate: number = 30
): number {
  if (interval === '1sec') {
    return Math.round(time);
  } else if (interval === '500ms') {
    return Math.round(time * 2) / 2;
  } else if (interval === 'frame') {
    return Math.round(time * framerate) / framerate;
  }
  return time;
}
```

---

## 10. UI Components to Create/Modify

### New Components

- `src/components/TimelineSplitButton.tsx` — Split button in timeline toolbar
- `src/components/TimelineSnapToggle.tsx` — Snap-to-grid toggle checkbox
- `src/components/SnapIndicator.tsx` — Visual snap feedback line
- `src/components/FrameCounter.tsx` — Frame count display in trim tooltip

### Modified Components

- `src/components/Timeline.tsx` — Add split button, snap logic, snap visual feedback
- `src/components/TimelineClipCard.tsx` — Show visual divider for split segments
- `src/components/TrimTooltip.tsx` — Add frame count display
- `src/utils/timelineOperations.ts` — Add splitClipAtPlayhead function
- `src/utils/trimCalculations.ts` — Add snapToGrid function

---

## 11. Integration Points

- **Timeline state management**: Split operation updates timeline array in App.tsx
- **Playhead position**: Uses existing currentPlayheadPosition from App state
- **Export pipeline**: Existing export handles split segments automatically (no changes)
- **Trim operations**: Existing trim hooks work with split segments (no changes)
- **Auto-save**: Existing session save picks up split segments (no changes)

---

## 12. Test Plan & Acceptance Gates

### Happy Path Tests

- [ ] **Test 1: Basic Split**
  - Position playhead at 10-second mark in 30-second clip
  - Click Split button
  - **Gate**: Two segments created (0-10s and 10-30s), both playable

- [ ] **Test 2: Split Then Trim**
  - Split clip at 15-second mark
  - Trim first segment to 10 seconds
  - **Gate**: First segment 0-10s, second segment 15-30s unchanged

- [ ] **Test 3: Multiple Splits**
  - Split same clip 3 times (4 segments total)
  - **Gate**: All segments visible, durations sum to original, export works

### Edge Case Tests

- [ ] **Test 4: Split Near Start**
  - Split at 1.1 second mark
  - **Gate**: First segment 0-1s (minimum), second segment continues

- [ ] **Test 5: Split at Boundary**
  - Split at exact trimStart or trimEnd
  - **Gate**: Error message or split disabled gracefully

- [ ] **Test 6: Very Short Segment**
  - Split to create 1-second first segment
  - **Gate**: Segment displays and exports correctly (no visual glitches)

### Snap-to-Grid Tests

- [ ] **Test 7: 1-Second Snap**
  - Enable snap, drag trim handle to 1.43 seconds
  - **Gate**: Handle snaps to 1.00 or 2.00 seconds, visual feedback shown

- [ ] **Test 8: 500ms Snap**
  - Set snap interval to 500ms, drag to 1.73 seconds
  - **Gate**: Handle snaps to 1.5 or 2.0 seconds

- [ ] **Test 9: Frame-Precise Snap**
  - Set snap to frame (30fps), drag to 1.033 seconds
  - **Gate**: Handle snaps to 1.000s (frame 0) or 1.067s (frame 2)

### Performance Tests

- [ ] **Test 10: Split Response Time**
  - Split clip and measure time to complete
  - **Gate**: Split completes in <50ms (timeline remains responsive)

- [ ] **Test 11: Snap Visual Feedback**
  - Drag trim handle across snap points
  - **Gate**: Highlight updates smoothly, no lag (60fps)

- [ ] **Test 12: Multiple Split Segments**
  - Create 10 segments from single clip
  - **Gate**: Timeline renders smoothly, drag still responsive

---

## 13. Definition of Done

- [ ] `TimelineSplitButton.tsx` implemented with enabled/disabled states
- [ ] `TimelineSnapToggle.tsx` implemented with interval selector
- [ ] `SnapIndicator.tsx` implemented with visual feedback
- [ ] `FrameCounter.tsx` implemented with HH:MM:SS:FF format
- [ ] Split operation implemented in `timelineOperations.ts`
- [ ] Snap calculation implemented in `trimCalculations.ts`
- [ ] Timeline integrates split button and snap logic
- [ ] All happy path tests pass (Test 1-3)
- [ ] All edge case tests pass (Test 4-6)
- [ ] All snap-to-grid tests pass (Test 7-9)
- [ ] Performance targets met: <50ms split, 60fps snap feedback
- [ ] No console warnings or errors
- [ ] Code follows .cursorrules patterns

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Split creates too many segments** | Timeline performance degrades | Limit max segments per clip (20), monitor with 10+ splits |
| **Snap alignment drift** | Handles don't snap precisely | Test pixel accuracy, use Math.round with precise intervals |
| **Split order calculation bugs** | Segments ordered incorrectly | Unit test splitClipAtPlayhead with edge cases |
| **Frame rate mismatch** | Snap uses wrong framerate | Derive framerate from clip metadata, fallback to 30fps |

---

## 15. Rollout & Telemetry

- **Feature flag?** No (direct release)
- **Metrics**: Split success rate, snap usage rate, performance timings
- **Manual validation steps**: All test gates from Section 12

---

## 16. Open Questions

- **Q1: Visual indicator for split segments?** Should we add a visual divider or rely on gap between clips?
  - **Decision**: Add subtle visual divider line between segments
- **Q2: Maximum segments per clip?** Should we limit how many times a clip can be split?
  - **Decision**: Limit to 20 segments (prevents performance issues)
- **Q3: Keyboard shortcut priority?** Cmd+X conflicts with Cut in some contexts.
  - **Decision**: Use Cmd/Ctrl+Shift+X for split (avoids conflicts)

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Trim ripple edits (affect subsequent clips)
- [ ] Frame-accurate scrubbing (sub-frame precision)
- [ ] Scene cut detection
- [ ] Audio peak snapping
- [ ] Custom snap intervals

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?** User positions playhead → clicks Split → clip divides into two segments → user trims with snap-to-grid → export uses split segments.
2. **Primary user and critical action?** Video editor creating tight edits; needs to split clips at arbitrary points and align with frame precision.
3. **Must-have vs nice-to-have?** MUST: Split at playhead, snap-to-grid, frame counts. NICE: Visual divider, split animation, custom snap intervals.
4. **Video processing requirements?** None (client-side state management only).
5. **Performance constraints?** Split <50ms, snap feedback 60fps, timeline responsive with 10+ segments.
6. **Error/edge cases to handle?** Split at boundaries, minimum segment duration, no clip selected.
7. **Data model changes?** No new interfaces (existing TimelineClip sufficient).
8. **Electron IPC handlers required?** None (pure React state operations).
9. **UI entry points and states?** Split button in toolbar → split applied → segments visible → export works.
10. **File system implications?** None (no file operations).
11. **Dependencies or blocking integrations?** None (builds on existing trim functionality).
12. **Rollout strategy and metrics?** Direct release, track split usage and snap preferences.
13. **What is explicitly out of scope?** Ripple edits, frame-accurate scrubbing, multi-clip splits, scene detection.

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep state operations deterministic
- React components are state updaters
- Test thoroughly with real clips (not mocks)
- Reference `prd-v1.md` and `.cursorrules` throughout

