# PR-4 TODO — Video Preview Player

**Branch**: `feat/pr-4-video-preview-player`  
**Source PRD**: `docs/prds/pr-4-prd.md`  
**Owner (Agent)**: Pete

---

## 0. Clarifying Questions & Assumptions

- Questions: None - PRD is clear
- Assumptions (confirm in PR if needed):
  - PR-2 (Library) is complete and clips can be clicked
  - PR-3 (Timeline) is complete and playhead exists
  - HTML5 video element supports file:// protocol on macOS
  - Video files are still accessible at their stored paths

---

## 1. Setup

- [ ] Create branch `feat/pr-4-video-preview-player` from develop
- [ ] Read PRD thoroughly (`docs/prds/pr-4-prd.md`)
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` Section 6 (Video Preview Player) for context
- [ ] Review existing VideoPlayer.tsx placeholder from PR-1
- [ ] Review Library component from PR-2 to understand clip selection
- [ ] Review Timeline component from PR-3 to understand playhead
- [ ] Confirm environment and Electron dev server work
- [ ] Prepare test video files (MP4, MOV, various resolutions)

---

## 2. Data Model & State Management

- [ ] Add `isPlaying: boolean` to AppState in `src/types/video.ts`
  - Test Gate: AppState type includes isPlaying, defaults to false
- [ ] Create PlayerState interface in `src/types/video.ts` (component-level state)
  - Properties: currentVideo, currentTimelineClip, isPlaying, currentTime, duration, playbackMode, isLoading, error
  - Test Gate: TypeScript compiles, interface defines all required properties
- [ ] Add playback state management to App.tsx (useState for isPlaying)
  - Test Gate: isPlaying state can be set and read correctly
- [ ] Create utility functions in `src/utils/sequenceCalculations.ts`
  - `calculateSequence(timeline, library)` → Array of SequenceItem with trim points and start times
  - `calculateSequenceDuration(sequence)` → Total duration in seconds
  - `findCurrentClipInSequence(sequence, currentTime)` → Current clip index
  - Test Gate: Functions return correct values for test timeline

---

## 3. Video Player Component (Core Structure)

- [ ] Replace placeholder in `src/components/VideoPlayer.tsx` with HTML5 video element structure
  - Video container with 16:9 aspect ratio constraint
  - Video element with ref for programmatic control
  - Test Gate: Component renders video element, container maintains aspect ratio
- [ ] Add video element with file:// protocol URL loading
  - Load video from clip.path: `file://${clip.path}`
  - Handle video loading state (onLoadStart, onLoadedMetadata)
  - Test Gate: Video loads from file path, metadata loads correctly
- [ ] Implement video loading logic (when clip selected)
  - Accept selectedClipId prop
  - Find clip in library by ID
  - Load video source from clip.path
  - Test Gate: Clicking clip in Library loads video in player
- [ ] Add empty state (gray placeholder when no clip selected)
  - Show "No clip selected" message
  - Test Gate: Empty state displays when selectedClipId is null
- [ ] Add loading state (spinner while video metadata loads)
  - Show loading indicator during onLoadStart → onLoadedMetadata
  - Test Gate: Loading indicator appears while video loads
- [ ] Add error state handling (onError event)
  - Display error message if video fails to load
  - Test Gate: Error message shows for invalid/corrupted files, app doesn't crash

---

## 4. Video Player Props & Integration

- [ ] Add props to VideoPlayer component
  - selectedClipId: string | null
  - library: VideoClip[]
  - timeline: TimelineClip[]
  - currentPlayheadPosition: number
  - onPlayheadChange: (position: number) => void
  - Test Gate: Component receives all props correctly
- [ ] Wire up VideoPlayer in App.tsx with required props
  - Pass selectedClipId, library, timeline, currentPlayheadPosition
  - Pass onPlayheadChange callback
  - Test Gate: Props flow correctly from App to VideoPlayer
- [ ] Implement video currentTime sync with currentPlayheadPosition
  - useEffect to sync video.currentTime when currentPlayheadPosition changes (external)
  - Use ref to avoid re-render loops
  - Test Gate: Dragging playhead on timeline seeks video

---

## 5. Player Controls Component

- [ ] Create `src/components/PlayerControls.tsx` component structure
  - Container below video element
  - Layout: Play/Pause button, progress bar, time display
  - Test Gate: Component renders with correct layout
- [ ] Implement Play/Pause button
  - Button with ▶ / ⏸ icons
  - onClick handler toggles playback
  - Displays correct icon based on isPlaying state
  - Test Gate: Button toggles playback, icon updates correctly
- [ ] Implement progress bar (input range)
  - Shows current position (0 to duration)
  - Draggable for seeking
  - Updates value as video plays
  - Test Gate: Progress bar shows current position, dragging seeks video
- [ ] Implement time display (current / total)
  - Format: "MM:SS / MM:SS" (e.g., "00:15 / 02:30")
  - Updates in real-time during playback
  - Uses formatDuration utility from PR-2
  - Test Gate: Time display shows correct current and total time
- [ ] Wire PlayerControls to VideoPlayer
  - Accept video ref, isPlaying state, currentTime, duration as props
  - Pass play/pause handlers, seek handler
  - Test Gate: Controls connected to video element, all functions work

---

## 6. Click Handlers (Library & Timeline)

- [ ] Add onClick handler to LibraryClipCard component
  - Call onSelectClip with clip when clicked
  - Add visual hover state to indicate clickable
  - Test Gate: Clicking clip in Library triggers onSelectClip
- [ ] Verify Library component passes onSelectClip to clip cards
  - Test Gate: Click handler flows correctly from App → Library → LibraryClipCard
- [ ] Implement clip loading in VideoPlayer when selectedClipId changes
  - useEffect watching selectedClipId prop
  - Load video from library clip when selectedClipId changes (and it's a library clip)
  - Test Gate: Changing selectedClipId loads corresponding video
- [ ] Add onClick handler to TimelineClipCard component
  - Call onSelectClip with clip.id when clicked
  - Test Gate: Clicking clip in Timeline triggers selection
- [ ] Implement timeline clip loading with trim points
  - When selectedClipId is timeline clip, find TimelineClip and VideoClip
  - Load video and set initial currentTime to trimStart
  - Test Gate: Clicking timeline clip loads video at trimStart position

---

## 7. Playback Controls (Play/Pause)

- [ ] Implement play() method in VideoPlayer
  - Call videoRef.current.play()
  - Update isPlaying state to true
  - Update App state isPlaying
  - Test Gate: play() starts video playback
- [ ] Implement pause() method in VideoPlayer
  - Call videoRef.current.pause()
  - Update isPlaying state to false
  - Update App state isPlaying
  - Test Gate: pause() stops video playback
- [ ] Implement togglePlayback() function
  - Toggles between play and pause
  - Called by Play/Pause button
  - Test Gate: Toggle function switches between play and pause correctly
- [ ] Handle video ended event (onEnded)
  - Pause playback when video reaches end
  - Reset isPlaying state
  - Test Gate: Video stops at end, doesn't loop automatically

---

## 8. Progress Bar & Seeking

- [ ] Implement seekToTime(time: number) function in VideoPlayer
  - Set videoRef.current.currentTime = time
  - Clamp time between 0 and duration
  - Update currentPlayheadPosition state
  - Test Gate: Seeking updates video position, playhead updates
- [ ] Wire progress bar onChange handler
  - Convert progress bar value (0-100%) to time in seconds
  - Call seekToTime with calculated time
  - Test Gate: Dragging progress bar seeks video to correct position
- [ ] Handle video currentTime updates during playback (onTimeUpdate)
  - Update currentPlayheadPosition state from video.currentTime
  - Update progress bar value
  - Throttle updates if needed for performance
  - Test Gate: Progress bar and playhead update smoothly during playback

---

## 9. Playhead Synchronization (Bidirectional)

- [ ] Implement playhead → video sync (external playhead changes)
  - useEffect watching currentPlayheadPosition prop
  - Update video.currentTime when playhead dragged on timeline
  - Avoid re-render loops (check if change is external vs internal)
  - Test Gate: Dragging playhead on timeline seeks video within 100ms
- [ ] Implement video → playhead sync (video playback updates)
  - onTimeUpdate event updates currentPlayheadPosition state
  - Pass update to App via onPlayheadChange callback
  - Update Timeline playhead position
  - Test Gate: Video playback moves timeline playhead smoothly
- [ ] Prevent sync loops (distinguish internal vs external updates)
  - Use ref flag or timestamp to detect source of change
  - Only sync when change is external (from timeline drag)
  - Test Gate: No infinite loops or jitter when syncing

---

## 10. Keyboard Shortcuts (Spacebar)

- [ ] Add keyboard event listener in VideoPlayer
  - Listen for keydown events on Spacebar key
  - Prevent default behavior (page scroll)
  - Test Gate: Spacebar events captured, default behavior prevented
- [ ] Implement Spacebar play/pause toggle
  - Check if player is focused or video element has focus
  - Call togglePlayback() on Spacebar press
  - Test Gate: Spacebar toggles playback when player focused
- [ ] Handle focus management (ensure player can receive keyboard input)
  - Make video element or container focusable (tabIndex)
  - Auto-focus on clip load (optional)
  - Test Gate: Player can receive focus and keyboard input

---

## 11. Sequence Preview (Calculate Sequence)

- [ ] Create sequence calculation utility
  - Implement calculateSequence() in sequenceCalculations.ts
  - Convert timeline clips to sequence items with start/end times
  - Handle trim points (trimStart, trimEnd)
  - Calculate cumulative start times for each clip
  - Test Gate: Sequence calculation returns correct array of clips with times
- [ ] Implement calculateSequenceDuration()
  - Sum of (trimEnd - trimStart) for all clips
  - Test Gate: Total duration matches sum of trimmed clip durations
- [ ] Add sequence state to VideoPlayer component
  - Store current sequence array
  - Store current clip index in sequence
  - Test Gate: Sequence state updates correctly when timeline changes

---

## 12. Sequence Preview (Playback Logic)

- [ ] Create SequencePreviewButton component
  - Button labeled "Preview Sequence"
  - Disabled if timeline is empty
  - Test Gate: Button renders, disabled when timeline empty
- [ ] Wire SequencePreviewButton in VideoPlayer
  - Place button in top-right of player
  - Connect onClick handler
  - Test Gate: Button positioned correctly, clickable when enabled
- [ ] Implement sequence preview start logic
  - Calculate sequence from timeline
  - Load first clip in sequence at its trimStart
  - Set playback mode to 'sequence'
  - Start playback
  - Test Gate: Clicking "Preview Sequence" starts first clip
- [ ] Handle clip end in sequence (onEnded event)
  - Detect when current clip reaches trimEnd
  - Move to next clip in sequence
  - Load next clip and seek to its trimStart
  - Continue playback
  - Test Gate: Sequence transitions to next clip when current ends
- [ ] Handle sequence end (last clip finished)
  - Stop playback when last clip ends
  - Reset playback mode
  - Show completion state
  - Test Gate: Sequence stops at end, doesn't loop
- [ ] Preload next clip during sequence playback (optimization)
  - Load next clip 2 seconds before current clip ends
  - Smooth transition with no gap
  - Test Gate: Sequence transitions smoothly, no stutter between clips

---

## 13. Trim Points in Preview

- [ ] Apply trim start when loading timeline clip
  - Set video.currentTime = trimStart when clip loads
  - Test Gate: Timeline clip preview starts at trimStart, not beginning
- [ ] Handle trim end during playback
  - Check if currentTime >= trimEnd during playback
  - Pause video when trim end reached
  - Test Gate: Timeline clip preview stops at trimEnd
- [ ] Apply trim points in sequence preview
  - Each clip plays from trimStart to trimEnd
  - No gaps between clips (clips snap together)
  - Test Gate: Sequence preview respects trim points, smooth transitions
- [ ] Update progress bar for trimmed clips
  - Progress bar shows progress within trimmed range (not full clip)
  - Time display shows time within trim range
  - Test Gate: Progress and time display correct for trimmed clips

---

## 14. Aspect Ratio & Video Display

- [ ] Implement 16:9 aspect ratio container
  - CSS container with aspect-ratio: 16/9
  - Video element with object-fit: contain
  - Test Gate: Video maintains 16:9 container, letterbox/pillarbox applied as needed
- [ ] Test with different aspect ratios (16:9, 4:3, 21:9)
  - Verify letterboxing for wider videos
  - Verify pillarboxing for taller videos
  - Test Gate: All aspect ratios display correctly with proper black bars

---

## 15. Error Handling & Edge Cases

- [ ] Handle missing video file error
  - Check if file exists before loading (optional, defer if complex)
  - Display error message: "Video file not found"
  - Don't crash app
  - Test Gate: Missing file shows error, app remains stable
- [ ] Handle corrupted video file error
  - Catch video onError event
  - Display error message: "Could not load video"
  - Don't crash app
  - Test Gate: Corrupted file shows error, app doesn't crash
- [ ] Handle empty Library state
  - Show empty state when no clips available
  - Disable preview functionality
  - Test Gate: Empty Library shows appropriate empty state
- [ ] Handle empty Timeline state
  - Disable "Preview Sequence" button
  - Test Gate: Sequence button disabled when timeline empty
- [ ] Handle rapid clip selection (avoid race conditions)
  - Cancel previous video load if new clip selected
  - Only load most recent selection
  - Test Gate: Rapid clicks only load last clicked clip

---

## 16. Performance Optimization

- [ ] Throttle playhead updates during scrubbing
  - Use requestAnimationFrame or throttle function
  - Limit updates to 60fps maximum
  - Test Gate: Scrubbing smooth, updates within 100ms
- [ ] Optimize video currentTime sync (prevent excessive updates)
  - Debounce or throttle internal state updates
  - Avoid setting currentTime unnecessarily
  - Test Gate: No jitter or performance issues during playback
- [ ] Test memory usage with video playback
  - Monitor memory with Activity Monitor (macOS)
  - Ensure no memory leaks during extended playback
  - Test Gate: Memory usage < 1GB with 10 clips, stable over 15min

---

## 17. Integration Testing

- [x] Test Library clip selection → preview
  - Import clips (PR-2)
  - Click clip → verify video plays
  - Test Gate: All Library clips preview correctly
- [x] Test Timeline clip selection → preview
  - Add clips to timeline (PR-3)
  - Click timeline clip → verify video plays
  - Test Gate: Timeline clips preview correctly
- [ ] Test playhead scrubbing integration
  - Drag playhead on timeline → verify preview updates
  - Test Gate: Playhead drag updates preview within 100ms
- [ ] Test sequence preview integration
  - Add 3 clips to timeline
  - Click "Preview Sequence" → verify all clips play in order
  - Test Gate: Sequence preview plays all clips correctly
- [ ] Test playback → playhead sync
  - Play video → verify timeline playhead moves
  - Test Gate: Playback moves playhead smoothly

---

## 18. Manual Testing

- [ ] Manual validation with real video files (MP4, MOV)
  - Import 3 different video files (different resolutions)
  - Test playback for each
  - Test Gate: All video files play correctly
- [ ] Performance verification
  - Test 1080p H.264 playback → verify 30fps minimum
  - Test scrubbing responsiveness → verify < 100ms updates
  - Test Gate: Performance targets met (see prd-v1.md)
- [ ] Cross-platform testing
  - Test on macOS (primary platform)
  - Test Gate: All features work on macOS
- [ ] Edge case testing
  - Very short clips (< 1 second)
  - Very long clips (> 10 minutes)
  - Different framerates (30fps, 60fps)
  - Different aspect ratios (16:9, 4:3, 21:9)
  - Test Gate: All edge cases handled gracefully
- [ ] Definition of done checklist
  - Review all items from PRD Section 13
  - Test Gate: All items verified

---

## 19. Performance Verification

- [ ] Verify playback smoothness (30fps minimum)
  - Test with 1080p H.264 MP4 video
  - Visual verification of smooth playback
  - Test Gate: Playback smooth, no stuttering
- [ ] Verify scrubbing responsiveness (< 100ms)
  - Drag playhead → measure time to preview update
  - Test Gate: Scrubbing updates within 100ms
- [ ] Verify memory usage (< 1GB with 10 clips)
  - Monitor with Activity Monitor during testing
  - Test Gate: Memory usage within target
- [ ] Verify UI responsiveness (no blocking)
  - Test controls respond immediately during playback
  - Test Gate: UI remains responsive, no blocking

---

## 20. Acceptance Gates

Check every gate from PRD Section 12:

**Happy Path**:
- [ ] Gate: Click clip in Library → video loads and plays within 500ms
- [ ] Gate: Click Play button → video starts, button changes to Pause
- [ ] Gate: Press Spacebar → playback toggles (play ↔ pause)
- [ ] Gate: Drag progress bar → video seeks within 100ms
- [ ] Gate: Drag playhead on timeline → preview updates within 100ms
- [ ] Gate: Video playing → progress bar and playhead update smoothly, audio synchronized
- [ ] Gate: Click "Preview Sequence" → all timeline clips play in order, trim points applied
- [ ] Gate: Sequence reaches end → playback stops, doesn't loop
- [ ] Gate: Playing 1080p H.264 → playback smooth at minimum 30fps
- [ ] Gate: Scrubbing → preview updates within 100ms

**Edge Cases**:
- [ ] Gate: Empty Library → player shows empty state, no errors
- [ ] Gate: Empty Timeline → "Preview Sequence" disabled, no errors
- [ ] Gate: Single clip on timeline → sequence preview works
- [ ] Gate: Very short clip → plays correctly, controls work
- [ ] Gate: Very long clip → playback smooth, scrubbing responsive
- [ ] Gate: Video file moved/deleted → error message, app doesn't crash
- [ ] Gate: Corrupted video file → error message, app doesn't crash
- [ ] Gate: Multiple rapid clicks → only last clicked clip loads

**Performance**:
- [ ] Gate: Playback smoothness → minimum 30fps for 1080p H.264
- [ ] Gate: Scrubbing responsiveness → updates within 100ms
- [ ] Gate: Memory usage → < 1GB RAM with 10 clips
- [ ] Gate: UI responsiveness → controls respond immediately

---

## 21. Documentation & PR

- [ ] Add inline code comments for complex logic
  - Video player state management
  - Sequence preview transition logic
  - Playhead sync logic
  - Test Gate: Code comments clarify complex sections
- [ ] Update README if needed
  - Document video preview features
  - Test Gate: README updated with preview functionality
- [ ] Create PR description (use format from agents/cody-agent-template.md)
  - Summary of changes
  - Link to PRD and TODO
  - Test results summary
  - Test Gate: PR description complete
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] VideoPlayer component implemented with HTML5 video element
- [ ] PlayerControls component with Play/Pause, progress bar, time display
- [ ] Click handlers on Library and Timeline clips
- [ ] Playhead synchronization (bidirectional) working
- [ ] Sequence preview functionality complete
- [ ] Keyboard shortcuts (Spacebar) working
- [ ] Error handling for missing/corrupted files
- [ ] Manual testing complete with real video files
- [ ] Performance targets met (30fps playback, <100ms scrubbing)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated
```

---

## Notes

- HTML5 video element file:// protocol may need testing on macOS
- Scrubbing performance may need throttling optimization
- Sequence preview transitions must be smooth (no gaps)
- Playhead sync must prevent infinite loops
- Test with various video formats early (MP4, MOV, different codecs)
- Memory usage should be monitored during extended playback
- Reference `prd-v1.md` Section 6 (Video Preview Player) and `.cursorrules` for patterns

