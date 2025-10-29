# PRD: Sequence Preview

**Feature**: Sequence Preview Mode

**Version**: 1.0

**Status**: Mostly Complete - Testing & Verification Needed

**Agent**: Pete

**Target Release**: MVP Phase 7

**Links**: [prd-v1.md](../../prd-v1.md) | [pr-1-prd.md](./pr-1-prd.md) | [pr-2-prd.md](./pr-2-prd.md) | [pr-3-prd.md](./pr-3-prd.md) | [pr-4-prd.md](./pr-4-prd.md) | [pr-5-prd.md](./pr-5-prd.md) | [pr-6-prd.md](./pr-6-prd.md)

---

## 1. Summary

Enable users to preview their complete edited sequence by playing all timeline clips in order with smooth transitions, maintaining audio synchronization across clip boundaries, and providing visual feedback through the playhead position. This allows users to review their work before export.

---

## 2. Problem & Goals

**Problem**: Users can import videos (PR-2), arrange them on a timeline (PR-3), preview individual clips (PR-4), and trim clips (PR-6), but cannot preview the entire sequence as it will appear in the final export. Without sequence preview, users cannot verify that clips transition smoothly, audio stays synchronized, or that the overall sequence flows correctly before committing to an export.

**Why now**: This is Phase 7 of the MVP, building on Timeline (PR-3), Video Preview (PR-4), and Trimming (PR-6). Sequence preview is essential before export (PR-8) - users must be able to verify their sequence works correctly. This also enables users to catch issues early before the time-consuming export process.

**Goals** (ordered, measurable):
  - [x] G1 — User can click "Preview Sequence" button to start playback of all timeline clips in order from the current playhead position (✅ Implemented in VideoPlayer.tsx:handleSequencePreview)
  - [x] G2 — Sequence preview automatically transitions between clips smoothly (< 100ms gap), maintaining audio continuity (✅ Implemented in VideoPlayer.tsx:handleTimeUpdate lines 605-632)
  - [x] G3 — Playhead position updates in real-time during sequence playback, accurately reflecting sequence time across all clips (✅ Implemented - sequence time tracking in handleTimeUpdate)
  - [⚠️] G4 — Audio remains synchronized with video throughout sequence playback, including across clip transitions (✅ Partially - HTML5 video handles, but needs testing for transition gaps)
  - [x] G5 — Sequence preview respects all trim points from individual clips, playing only the trimmed portions (✅ Implemented - transitions occur at trimEnd)
  - [x] G6 — User can pause/resume sequence preview, seek within sequence (via timeline or player controls), and playback stops automatically at sequence end (✅ Implemented - pause/resume, seeking, auto-stop at end)

---

## 3. Non-Goals / Out of Scope

- [ ] Not implementing video transitions or effects between clips (no crossfades, wipes, dissolves - hard cuts only per prd-v1.md)
- [ ] Not implementing audio mixing or volume adjustments (original volume only)
- [ ] Not implementing real-time rendering/encoding during preview (preview uses source files directly via HTML5 video)
- [ ] Not implementing loop playback (sequence stops at end)
- [ ] Not implementing playback speed adjustment (1x speed only)
- [ ] Not implementing frame-accurate scrubbing during sequence mode (second-level precision acceptable)
- [ ] Not implementing audio-only preview mode
- [ ] Not implementing sequence markers or chapter points
- [ ] Windows or Linux support (macOS only for MVP)

---

## 4. Success Metrics

**User-visible**:
- Sequence preview starts within 200ms after clicking "Preview Sequence" button
- Clip transitions are smooth (< 100ms gap between clips, no audio dropouts)
- Playhead position updates smoothly during playback (60fps updates)
- Audio remains synchronized throughout sequence (no drift > 50ms)
- Sequence playback respects all trim points (verified by checking each clip start/end)
- Playback stops automatically at sequence end with playhead at final position
- Seeking within sequence works correctly (clicking timeline jumps to correct clip and position)

**System** (from prd-v1.md):
- Preview playback: Smooth 30fps minimum during sequence playback
- Scrubbing updates preview within 100ms when seeking in sequence
- Memory usage: No significant increase during sequence mode vs single clip playback
- No UI blocking during clip transitions (< 50ms transition time)

**Quality**:
- 0 blocking bugs
- All acceptance gates pass
- Audio sync maintained across all clip boundaries
- Playhead position accurate to within 0.1 seconds
- No visual glitches or frame drops during transitions

---

## 5. Users & Stories

- As a video editor, I want to preview my complete sequence so that I can verify the clips flow together correctly before exporting
- As a content creator, I want to see all my trimmed clips play in order so that I can catch any issues before the export process
- As a user, I want smooth transitions between clips during preview so that I can see how the final video will look
- As a video editor, I want audio to stay synchronized throughout the sequence so that dialogue and music don't drift out of sync
- As a user, I want to seek within the sequence preview so that I can jump to specific parts to review them
- As a content creator, I want the playhead to show accurate sequence time so that I know where I am in the overall timeline

---

## 6. Experience Specification (UX)

**Entry Points**:
- "Preview Sequence" button in video player panel (disabled when timeline is empty)
- Spacebar keyboard shortcut (when timeline has clips and no library clip is selected, per PR-4)
- Play button in player controls (when timeline has clips, starts sequence from current playhead)

**Sequence Preview Flow**:
1. User clicks "Preview Sequence" button or presses Spacebar
2. System calculates sequence from timeline clips (sorted by order, accounting for trim points)
3. System determines starting clip and position based on current playhead
4. First clip loads in video player, starts at calculated position (respecting trimStart)
5. Playback begins automatically
6. As video plays, playhead updates in real-time showing sequence position
7. When current clip reaches trimEnd, system transitions to next clip
8. Next clip loads (if needed) and playback continues from trimStart
9. Process repeats until all clips played
10. Playback stops at sequence end, playhead at final position

**Visual Behavior**:
- "Preview Sequence" button disabled when timeline is empty
- Button shows active state during sequence playback
- Playhead moves smoothly across timeline during playback
- Video player shows currently playing clip
- Player controls show sequence total duration and current sequence time
- Loading indicator shown briefly during clip transitions (< 100ms)

**Smooth Transitions**:
- Preload next clip during current clip playback (if possible)
- Pause current clip when reaching trimEnd
- Switch video source to next clip
- Seek to trimStart of next clip
- Resume playback immediately (< 100ms total transition time)
- Maintain audio continuity (no gaps or clicks)

**Seeking Behavior**:
- User can drag playhead on timeline → system seeks to corresponding position in sequence
- System calculates which clip contains the target sequence time
- System loads appropriate clip (if needed) and seeks to local time within that clip
- User can use player control progress bar to seek within sequence
- Seeking pauses playback (user must press Play/Spacebar to resume)

**Playback States**:
- Stopped: Sequence not active, playhead at current position
- Loading: Clip loading for sequence start or transition (< 200ms)
- Playing: Sequence playback active, playhead advancing
- Paused: Sequence paused mid-playback (can resume from current position)
- Ended: Sequence completed, playhead at end, playback stopped

**Performance** (from prd-v1.md):
- Playback smooth 30fps minimum (same as single clip playback)
- Clip transitions < 100ms (preload strategy, efficient source switching)
- Playhead updates 60fps (throttled to avoid excessive React re-renders)
- Scrubbing updates preview within 100ms
- Memory usage remains reasonable (no preloading of entire sequence)

---

## 7. Functional Requirements (Must/Should)

**MUST**:
- "Preview Sequence" button triggers sequence playback when clicked
- Sequence calculation uses timeline clips sorted by order
- Sequence respects trimStart and trimEnd for each clip
- Sequence plays clips in order (no gaps, no overlaps per prd-v1.md timeline requirements)
- Clip transitions occur automatically when current clip reaches trimEnd
- Next clip loads and plays from trimStart (smooth transition < 100ms)
- Audio remains synchronized throughout sequence (no gaps or clicks at transitions)
- Playhead position updates in real-time during playback (showing sequence time, not individual clip time)
- Player controls show sequence total duration and current sequence time
- Playback stops automatically when sequence ends (last clip reaches trimEnd)
- User can pause/resume sequence playback at any time
- User can seek within sequence (via timeline drag or player control progress bar)
- Seeking calculates correct clip and local time within that clip
- Sequence can start from any playhead position (not just beginning)
- Sequence preview mode active indicator (button state or visual feedback)

**SHOULD**:
- Smooth clip transitions with minimal visual/audio interruption
- Preload next clip during current clip playback (optimization for faster transitions)
- Loading indicator during clip transitions
- Playhead animation smooth (60fps updates, throttled appropriately)
- Spacebar keyboard shortcut works for sequence preview (already implemented per PR-4)

**Acceptance gates per requirement**:
- [Gate] When user clicks "Preview Sequence" → sequence starts from current playhead, first clip loads and plays within 200ms
- [Gate] When clip reaches trimEnd → next clip loads and playback continues from trimStart within 100ms, audio synchronized
- [Gate] During sequence playback → playhead updates smoothly showing sequence time, position accurate to 0.1s
- [Gate] When sequence reaches end → playback stops, playhead at final position, user can restart or seek
- [Gate] When user seeks during sequence → system loads correct clip, seeks to correct position, playback pauses (can resume)
- [Gate] Throughout sequence playback → audio remains synchronized (no gaps, clicks, or drift > 50ms)

---

## 8. Data Model

The existing sequence data structures already support sequence preview (from existing implementation):

```typescript
// Sequence item represents a clip in the sequence with timing information
interface SequenceItem {
  clip: TimelineClip;        // Timeline clip with trim points
  libraryClip: VideoClip;    // Library clip reference
  startTime: number;         // Start time in sequence (cumulative)
  endTime: number;           // End time in sequence (cumulative)
}
```

**Sequence calculation**:
- Sequence calculated from timeline array (sorted by order)
- Each sequence item has startTime and endTime (cumulative, accounting for trimmed durations)
- Total sequence duration = sum of (trimEnd - trimStart) for all clips
- No gaps between clips (clips snap together per prd-v1.md)

**Sequence state management**:
- Sequence calculated whenever timeline changes (useEffect watching timeline)
- Current sequence index tracked during playback (which clip is currently playing)
- Sequence time tracked separately from video element currentTime (conversion between sequence time and clip-local time)
- Sequence mode flag (isSequenceModeRef) indicates when sequence preview is active

**Validation rules**:
- Sequence can only start if timeline has at least 1 clip
- Sequence time must be within [0, total sequence duration]
- Clip transitions only occur when video reaches clip.trimEnd
- Seeking must map sequence time to correct clip and local time

**State updates**:
- Sequence state recalculated when timeline changes
- Sequence index updated on clip transitions
- Sequence time updated during playback (via handleTimeUpdate)
- Playhead position (sequence time) updated via onPlayheadChange callback to App

---

## 9. API / Service Contracts

**No new Electron IPC handlers required**:
- Sequence preview uses existing video file access (file:// protocol URLs)
- All sequence logic handled in renderer process (React/TypeScript)
- No FFmpeg operations needed for preview (preview uses source files directly)
- Existing IPC handlers from PR-2, PR-4 sufficient (file:getMetadata, file system access)

**Sequence calculation utilities** (existing, may need enhancements):
```typescript
// Calculate sequence from timeline clips
calculateSequence(timeline: TimelineClip[], library: VideoClip[]): SequenceItem[]

// Calculate total sequence duration
calculateSequenceDuration(sequence: SequenceItem[]): number

// Find which clip contains a given sequence time
findCurrentClipInSequence(sequence: SequenceItem[], currentTime: number): number

// Convert sequence time to local time within a clip
getLocalTimeInClip(sequenceItem: SequenceItem, sequenceTime: number): number
```

**Pre/post-conditions**:
- Pre: Timeline has at least 1 clip, all clips have valid libraryClip references
- Pre: All clips in timeline have valid trimStart/trimEnd values
- Post: Sequence array contains items for all valid timeline clips, sorted by order
- Post: Sequence startTime/endTime values are cumulative and accurate

**Error handling**:
- Missing library clip → Skip clip in sequence, log warning
- Invalid trim values → Use default (0 to clip duration), log warning
- Empty timeline → Disable preview button, show empty state

---

## 10. UI Components to Create/Modify

**Components already implemented** ✅:
- `src/components/VideoPlayer.tsx` — Sequence preview functionality already implemented
  - ✅ Clip transitions occur automatically at trimEnd (lines 605-632)
  - ✅ Sequence time tracking and playhead synchronization (lines 651-657)
  - ✅ Seeking within sequence mode (lines 398-451)
  - ✅ Pause/resume behavior in sequence mode (via spacebar and play button)
  - ✅ Sequence auto-stops at end (lines 633-647)

- `src/components/SequencePreviewButton.tsx` — ✅ Implemented
  - ✅ Button exists and is wired to handleSequencePreview
  - ⚠️ Verify disabled state when timeline empty (check implementation)

- `src/components/PlayerControls.tsx` — ✅ Works with sequence mode
  - ✅ Progress bar uses duration and currentTime from VideoPlayer (which shows sequence values in sequence mode)
  - ✅ Seek functionality works (onSeek callback handles sequence seeking)

- `src/components/Timeline.tsx` — ✅ Playhead synchronization
  - ✅ Playhead position synced via onPlayheadChange (sequence time)
  - ✅ Dragging playhead seeks within sequence (handled by VideoPlayer)

**Utilities already implemented** ✅:
- `src/utils/sequenceCalculations.ts` — ✅ All functions exist
  - ✅ `calculateSequence` - calculates sequence from timeline
  - ✅ `calculateSequenceDuration` - total sequence duration
  - ✅ `findCurrentClipInSequence` - finds clip index for sequence time
  - ✅ `getLocalTimeInClip` - converts sequence time to clip-local time

**Testing & Verification Needed**:
- ⚠️ Test clip transitions for audio gaps (measure transition time)
- ⚠️ Verify playhead accuracy during long sequences
- ⚠️ Test edge cases (single clip, very short clips, long sequences)
- ⚠️ Performance testing (transition times, memory usage)
- ⚠️ Verify button disabled state when timeline empty

**No new components required** — sequence preview is already implemented using existing video player infrastructure.

---

## 11. Integration Points

**Electron IPC integration**:
- No new IPC handlers needed
- Uses existing file access for video playback (file:// URLs)
- Video metadata already loaded (from PR-2)

**Local file system**:
- Video files accessed directly via file:// protocol (same as single clip playback)
- No temporary files or concatenation needed for preview (preview uses source files)
- Thumbnails already generated (from PR-2)

**State management** (React patterns):
- Sequence state calculated in VideoPlayer component
- Sequence index and time tracked in VideoPlayer component state
- Playhead position (sequence time) synced with App state via onPlayheadChange callback
- Timeline state (timeline array) passed as prop to VideoPlayer

**FFmpeg for video processing**:
- No FFmpeg operations during preview (preview uses source files via HTML5 video)
- FFmpeg only used during export (PR-8)
- Preview is client-side only (no server-side processing)

**Video preview integration** (PR-4):
- Reuses existing VideoPlayer component and HTML5 video element
- Extends single clip playback to handle multiple clips
- Uses same play/pause/seek controls
- Maintains same playback performance targets

**Timeline integration** (PR-3):
- Sequence calculated from timeline clips (sorted by order)
- Playhead position synced between VideoPlayer and Timeline
- Timeline playhead reflects sequence time during sequence playback
- Seeking via timeline works in sequence mode

**Trim integration** (PR-6):
- Sequence respects all trim points (trimStart/trimEnd per clip)
- Clip transitions occur at trimEnd boundaries
- Sequence duration = sum of trimmed durations

**Auto-save integration** (PR-5):
- Sequence preview state not saved (sequence recalculated on app load)
- Timeline clips and trim points saved (sequence derived from these)
- Playhead position saved (can restore sequence at saved position)

**Cross-platform compatibility**:
- macOS primary platform
- HTML5 video element cross-platform compatible
- File:// protocol works on macOS (primary)

---

## 12. Test Plan & Acceptance Gates

**Happy Path**:
- [ ] User clicks "Preview Sequence" with 3 clips on timeline → sequence starts from beginning, plays all 3 clips in order
  - Gate: All clips play in correct order, transitions smooth (< 100ms), audio synchronized
- [ ] User previews sequence with trimmed clips → only trimmed portions play, transitions at trim boundaries
  - Gate: Clip 1 plays from trimStart to trimEnd, transitions to clip 2, etc.
- [ ] User pauses and resumes sequence → playback continues from paused position
  - Gate: Pause works, resume continues from same position, playhead accurate
- [ ] User previews sequence from middle playhead position → starts from correct clip and position
  - Gate: System finds correct clip, seeks to correct position, plays from there

**Edge Cases**:
- [ ] Empty timeline → "Preview Sequence" button disabled
  - Gate: Button grayed out, tooltip shows "Timeline is empty"
- [ ] Single clip in timeline → sequence preview plays single clip (respects trim points)
  - Gate: Single clip plays correctly, trim points respected
- [ ] Very short clips (< 1 second) → transitions work correctly, no skipping
  - Gate: Short clips play fully, transitions smooth, audio continuous
- [ ] Very long clips (> 5 minutes) → sequence preview works, memory usage reasonable
  - Gate: Long clips play correctly, no memory leaks, playback smooth
- [ ] Clips with different resolutions/aspect ratios → preview works (aspect ratio handled by video element)
  - Gate: All clips display correctly, no visual glitches, playback smooth

**Clip Transitions**:
- [ ] Clip transition at trimEnd → next clip loads and plays from trimStart within 100ms
  - Gate: Transition time measured < 100ms, audio continuous (no gaps or clicks)
- [ ] Sequence ends at last clip trimEnd → playback stops, playhead at end
  - Gate: Playback stops correctly, playhead at final position, user can restart
- [ ] Rapid clip transitions (many short clips) → all transitions smooth, no performance degradation
  - Gate: Transitions remain < 100ms each, no frame drops, audio synchronized

**Audio Synchronization**:
- [ ] Audio remains synchronized across clip transitions → no audio gaps or clicks
  - Gate: Audio continuous throughout sequence (measured: no gaps > 50ms, no clicks)
- [ ] Audio sync maintained during long sequence (> 2 minutes) → no drift
  - Gate: Audio stays synchronized throughout (drift < 50ms total)

**Seeking**:
- [ ] User drags playhead to middle of sequence → system seeks to correct clip and position
  - Gate: Correct clip loads, seeks to correct local time, playback paused (can resume)
- [ ] User seeks via player control progress bar → seeks within sequence correctly
  - Gate: Seeks to correct sequence time, correct clip loads, position accurate
- [ ] User seeks to beginning of sequence → first clip loads, plays from trimStart
  - Gate: First clip loads, position at sequence time 0
- [ ] User seeks to end of sequence → last clip loads, position at trimEnd (sequence complete)
  - Gate: Last clip loads, position at final sequence time

**Playhead Synchronization**:
- [ ] Playhead updates during sequence playback → shows accurate sequence time
  - Gate: Playhead position matches sequence time (accurate to 0.1s), updates smoothly (60fps)
- [ ] Playhead synced between VideoPlayer and Timeline → both show same sequence time
  - Gate: VideoPlayer playhead and Timeline playhead show same position

**Performance** (see prd-v1.md):
- [ ] Playback smooth during sequence → 30fps minimum
  - Gate: Frame rate measured > 30fps, no stuttering
- [ ] Clip transitions fast → < 100ms transition time
  - Gate: Transition time measured < 100ms (video element source switch + seek)
- [ ] Memory usage reasonable → no significant increase vs single clip playback
  - Gate: Memory usage < 100MB increase during sequence vs single clip
- [ ] No UI blocking → timeline remains interactive during sequence playback
  - Gate: Timeline scroll/zoom works during playback, no lag

**Manual Testing Protocol** (from prd-v1.md):
- [ ] Import 3 video clips (different durations, MP4/MOV)
- [ ] Add clips to timeline, trim first clip (remove 5s from start)
- [ ] Click "Preview Sequence" → verify all clips play in order, transitions smooth
- [ ] Pause mid-sequence, seek to different position, resume → verify playback continues
- [ ] Verify playhead shows sequence time (not individual clip time)
- [ ] Verify audio synchronized throughout (listen for gaps/clicks)
- [ ] Verify sequence stops at end, playhead at final position

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [x] Sequence preview button triggers sequence playback correctly (✅ Implemented)
- [x] Sequence plays all clips in order, respecting trim points (✅ Implemented)
- [⚠️] Clip transitions smooth (< 100ms), audio synchronized (✅ Implemented but needs performance testing)
- [x] Playhead position updates accurately during sequence playback (sequence time) (✅ Implemented)
- [x] User can pause/resume sequence preview (✅ Implemented)
- [x] User can seek within sequence (timeline drag and player controls) (✅ Implemented)
- [x] Playback stops automatically at sequence end (✅ Implemented)
- [⚠️] All acceptance gates pass (✅ Implemented but needs comprehensive testing)
- [⚠️] Cross-platform testing done (macOS primary) (Needs verification)
- [⚠️] Performance targets met (30fps playback, < 100ms transitions) (Needs measurement)
- [ ] Documentation updated (code comments, inline docs) (May need minor updates)

**Code Quality Checklist**:
- [ ] No console warnings or errors
- [ ] TypeScript types correct (no `any` types)
- [ ] Error handling for edge cases (empty timeline, missing clips, invalid trim values)
- [ ] Performance considerations addressed (preload strategy, smooth transitions)
- [ ] Code follows existing patterns from PR-3, PR-4, PR-6
- [ ] Sequence calculations accurate and efficient

---

## 14. Risks & Mitigations

- **Risk**: Clip transitions cause audio gaps or clicks
  - Mitigation: Preload next clip during playback, pause current clip at trimEnd, switch source immediately, resume playback quickly. Test audio continuity extensively.

- **Risk**: Playhead position drifts during long sequences
  - Mitigation: Use accurate time tracking (sequence time, not video element time), sync playhead updates with video playback, throttle updates to 60fps but maintain accuracy.

- **Risk**: Memory usage increases with many clips loaded
  - Mitigation: Only load currently playing clip (unload previous), don't preload entire sequence, monitor memory usage during testing.

- **Risk**: Clip transitions too slow (> 100ms target)
  - Mitigation: Optimize video element source switching, preload next clip metadata, test transition timing with various clip sizes/formats.

- **Risk**: Seeking within sequence calculates incorrect clip or position
  - Mitigation: Thoroughly test sequence calculation functions, verify findCurrentClipInSequence accuracy, test edge cases (boundaries between clips).

- **Risk**: Sequence preview conflicts with single clip playback
  - Mitigation: Clear sequence mode flag when switching to single clip, ensure state management properly handles mode switches, test switching between modes.

- **Risk**: Audio synchronization issues across different clip formats/resolutions
  - Mitigation: HTML5 video element handles format differences, but test with various formats (MP4, MOV), different frame rates, different audio codecs.

---

## 15. Rollout & Telemetry

**Feature flag?**: No (core MVP feature, always enabled)

**Metrics**:
- Usage: Number of sequence previews per session (track button clicks)
- Performance: Clip transition time (measure time from trimEnd to next clip playing)
- Errors: Clip loading failures during transitions (log errors)
- Adoption: Percentage of sessions that use sequence preview before export

**Manual validation steps**:
1. Import 3 video clips
2. Add to timeline, trim first clip
3. Click "Preview Sequence" → verify playback
4. Pause, seek to middle, resume → verify continues correctly
5. Verify playhead shows sequence time
6. Verify audio synchronized (no gaps/clicks)
7. Verify sequence stops at end
8. Test with different clip formats, resolutions, durations

---

## 16. Open Questions

- **Q1**: Should sequence preview preload next clip during current clip playback?
  - **Decision**: Yes, for faster transitions. Load metadata and initialize video element, but don't start playback until transition.

- **Q2**: Should sequence preview handle corrupted or missing video files gracefully?
  - **Decision**: Yes, skip clips with errors, log warnings, continue with remaining clips. Show error message if all clips fail.

- **Q3**: Should sequence preview start from current playhead or always from beginning?
  - **Decision**: Start from current playhead position (allows user to preview from any point). Button can optionally have "Start from beginning" option if needed.

- **Q4**: Should sequence preview show loading indicator during clip transitions?
  - **Decision**: Yes, brief loading indicator (< 100ms) during transitions provides visual feedback that system is switching clips.

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Video transitions between clips (crossfades, wipes, dissolves)
- [ ] Audio crossfades or audio transitions
- [ ] Real-time rendering preview (currently uses source files directly)
- [ ] Loop playback for sequence
- [ ] Playback speed adjustment (slow motion, fast forward)
- [ ] Frame-accurate scrubbing in sequence mode
- [ ] Sequence markers or chapter points
- [ ] Audio-only preview mode
- [ ] Preview with effects applied (current preview is raw clips)
- [ ] Preview export (save preview as video file)

---

## Preflight Questionnaire

1. **Smallest end-to-end user outcome for this PR?**
   - User clicks "Preview Sequence", sees all timeline clips play in order with smooth transitions, playhead updates showing sequence time, audio synchronized, can pause/resume/seek, sequence stops at end.

2. **Primary user and critical action?**
   - Video editor who needs to preview their complete sequence to verify clips flow together correctly before exporting.

3. **Must-have vs nice-to-have?**
   - Must-have: Sequence playback, clip transitions (< 100ms), audio sync, playhead tracking, pause/resume, seek within sequence, stop at end
   - Nice-to-have: Loading indicators, preload optimization, smooth 60fps playhead updates

4. **Video processing requirements?** (see prd-v1.md)
   - No FFmpeg operations (preview uses source files via HTML5 video)
   - Efficient video element source switching for transitions
   - Preload next clip for faster transitions

5. **Performance constraints?** (see prd-v1.md)
   - Playback smooth 30fps minimum
   - Clip transitions < 100ms
   - Scrubbing updates preview within 100ms
   - Playhead updates 60fps (throttled)

6. **Error/edge cases to handle?**
   - Empty timeline (disable button)
   - Missing library clips (skip in sequence)
   - Corrupted video files (skip, log error)
   - Invalid trim values (use defaults)
   - Single clip in timeline (works correctly)

7. **Data model changes?**
   - No changes (SequenceItem interface already exists)
   - Sequence calculated from timeline (existing function)
   - State tracking for sequence mode and current clip index

8. **Electron IPC handlers required?**
   - No new handlers needed
   - Uses existing file access for video playback

9. **UI entry points and states?**
   - "Preview Sequence" button click → start sequence
   - Spacebar shortcut → start sequence (if timeline has clips, no library clip selected)
   - Play button → start sequence (if timeline has clips)
   - States: Stopped, Loading, Playing, Paused, Ended

10. **File system implications?**
    - No file operations (uses existing video file paths)
    - Video files accessed via file:// protocol (same as single clip playback)

11. **Dependencies or blocking integrations?**
    - Depends on PR-3 (Timeline), PR-4 (Video Preview), PR-6 (Trimming)
    - No blocking dependencies (all PRs complete)

12. **Rollout strategy and metrics?**
    - No feature flag (always enabled)
    - Metrics: Preview usage, transition performance, audio sync errors

13. **What is explicitly out of scope?**
    - Video transitions or effects
    - Audio mixing or volume adjustments
    - Real-time rendering
    - Loop playback
    - Playback speed adjustment
    - Frame-accurate scrubbing

---

## Authoring Notes

- Sequence preview leverages existing VideoPlayer infrastructure from PR-4
- Extend single clip playback to handle multiple clips with transitions
- Focus on smooth transitions and audio synchronization
- Playhead tracking must account for sequence time (cumulative) vs clip-local time
- Test extensively with various clip formats, durations, and trim configurations
- Reference `prd-v1.md` for performance targets and testing requirements
- Sequence calculations already exist - verify accuracy and enhance as needed

