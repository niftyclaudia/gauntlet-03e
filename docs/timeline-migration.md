# Timeline Data Migration Guide

Migration from current timeline system to magnetic timeline system per `timeline-behavior.md`.

---

## Overview

**Current System**: Position-based (cumulative widths, order index)
- Clips positioned by summing widths of previous clips
- No time-based positioning
- No ripple behavior
- No gapless invariant enforcement

**Target System**: Time-based magnetic main track
- Clips have absolute `start` time in timeline
- Gapless invariant: `clip[i].start + clip[i].duration == clip[i+1].start`
- Ripple edits: downstream clips shift automatically
- Time-based positioning enables multitrack support

---

## Data Model Changes

### Current TimelineClip Interface

```typescript
interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;  // In-point in source (seconds)
  trimEnd: number;    // Out-point in source (seconds)
  order: number;      // Sequence position (0, 1, 2, ...)
}
```

### Target TimelineClip Interface

```typescript
interface TimelineClip {
  id: string;
  libraryClipId: string;
  trimStart: number;  // In-point in source (seconds)
  trimEnd: number;    // Out-point in source (seconds)
  order: number;      // Sequence position (0, 1, 2, ...)
  start: number;      // NEW: Absolute start time in timeline (seconds)
}
```

**Key Addition**: `start: number` - Absolute time position in timeline (0-based)

---

## Migration Algorithm

### Step 1: Calculate Start Times

For each clip in order, calculate cumulative start time:

```typescript
function migrateToMagneticTimeline(timeline: TimelineClip[]): TimelineClip[] {
  if (timeline.length === 0) return timeline;
  
  // Sort by order to ensure correct sequence
  const sorted = [...timeline].sort((a, b) => a.order - b.order);
  
  let currentStart = 0;
  return sorted.map((clip) => {
    const clipWithStart = {
      ...clip,
      start: currentStart,
    };
    // Calculate next clip's start (current clip's end)
    const clipDuration = clip.trimEnd - clip.trimStart;
    currentStart += clipDuration;
    return clipWithStart;
  });
}
```

### Step 2: Migration Logic

1. **Sort clips by `order`** - Ensures correct sequence
2. **Set first clip `start = 0`** - Timeline begins at 0
3. **For each subsequent clip**: `start = previousClip.start + previousClip.duration`
4. **Duration calculation**: `duration = trimEnd - trimStart`

**Invariant**: After migration, `clip[i].start + duration(clip[i]) == clip[i+1].start`

---

## Migration Points

### 1. Session Restore (Load Existing Projects)

**Location**: `src/hooks/useSessionRestore.ts`

```typescript
// After deserializing and validating timeline:
import { migrateToMagneticTimeline } from '../utils/magneticTimelineOperations';

const migratedTimeline = migrateToMagneticTimeline(validTimeline);
onRestore({
  library: validLibrary,
  timeline: migratedTimeline,  // Use migrated timeline
  // ... rest of state
});
```

### 2. Auto-Save Compatibility

**Current auto-saved projects**: May not have `start` property
**Migration strategy**: Add `start` on load, recalculate if missing

```typescript
// In projectStateUtils.ts or session restore
function ensureMagneticTimeline(timeline: TimelineClip[]): TimelineClip[] {
  // Check if already migrated (has start property)
  const needsMigration = timeline.some(clip => clip.start === undefined);
  if (needsMigration) {
    return migrateToMagneticTimeline(timeline);
  }
  // Validate invariant
  validateGaplessInvariant(timeline);
  return timeline;
}
```

### 3. Fresh Timeline (No Migration Needed)

When creating a new timeline from scratch, all operations should use magnetic behavior directly (no migration needed).

---

## Behavior Changes

### Before Migration (Current)

| Operation | Behavior |
|-----------|----------|
| Add clip | Inserts at index, updates order only |
| Delete clip | Removes clip, gaps remain |
| Trim clip | Updates trim points, no downstream shift |
| Reorder clip | Swaps positions, no time-based ripple |

### After Migration (Magnetic)

| Operation | Behavior |
|-----------|----------|
| Add clip | **Ripple insert**: Shifts downstream clips right by clip duration |
| Delete clip | **Ripple delete**: Shifts downstream clips left by removed clip duration |
| Trim clip | **Ripple trim**: Shortens/extends shifts downstream by duration delta |
| Reorder clip | **Ripple move**: Shifts intermediate clips to maintain gapless invariant |

---

## Backward Compatibility

### Loading Old Projects

**Strategy**: Detect missing `start` property and migrate automatically

```typescript
function isPreMagneticTimeline(timeline: TimelineClip[]): boolean {
  return timeline.length > 0 && timeline.some(clip => clip.start === undefined);
}

// On load:
if (isPreMagneticTimeline(loadedTimeline)) {
  console.log('[Migration] Migrating timeline to magnetic format');
  return migrateToMagneticTimeline(loadedTimeline);
}
```

### Version Detection

Add version field to `SavedProjectState`:

```typescript
interface SavedProjectState {
  version: string;  // e.g., "1.0" (pre-magnetic), "2.0" (magnetic)
  // ...
}

// Migration check:
if (savedState.version < "2.0") {
  timeline = migrateToMagneticTimeline(savedState.timeline);
}
```

---

## Implementation Checklist

### Phase 1: Data Model Update
- [ ] Add `start: number` to `TimelineClip` interface
- [ ] Create `migrateToMagneticTimeline()` function
- [ ] Create `validateGaplessInvariant()` function

### Phase 2: Migration Hooks
- [ ] Update `useSessionRestore` to migrate on load
- [ ] Update `useAutoSave` to detect pre-magnetic projects
- [ ] Add version field to `SavedProjectState`

### Phase 3: Operation Updates
- [ ] Update `addClipToTimeline` → `addClipToTimelineMagnetic` (ripple insert)
- [ ] Update `removeClipFromTimeline` → `removeClipFromTimelineMagnetic` (ripple delete)
- [ ] Update `reorderTimelineClip` → `reorderTimelineClipMagnetic` (ripple move)
- [ ] Update `trimClip` → `trimClipMagnetic` (ripple trim)
- [ ] Update `splitClipAtPlayhead` → `splitClipAtPlayheadMagnetic`

### Phase 4: Calculation Updates
- [ ] Update `calculateClipPosition` to use `start` time
- [ ] Update `calculateTotalDuration` (already uses trim durations, should work)
- [ ] Update sequence calculations to use `start` time

### Phase 5: Testing
- [ ] Test migration of existing saved projects
- [ ] Test invariant validation after each operation
- [ ] Test backward compatibility (load old projects)
- [ ] Test ripple behavior visually

---

## Example Migration

### Before (Current Format)

```json
{
  "timeline": [
    {
      "id": "clip-1",
      "libraryClipId": "lib-1",
      "trimStart": 0,
      "trimEnd": 10,
      "order": 0
    },
    {
      "id": "clip-2",
      "libraryClipId": "lib-2",
      "trimStart": 2,
      "trimEnd": 8,
      "order": 1
    }
  ]
}
```

### After (Magnetic Format)

```json
{
  "timeline": [
    {
      "id": "clip-1",
      "libraryClipId": "lib-1",
      "trimStart": 0,
      "trimEnd": 10,
      "order": 0,
      "start": 0
    },
    {
      "id": "clip-2",
      "libraryClipId": "lib-2",
      "trimStart": 2,
      "trimEnd": 8,
      "order": 1,
      "start": 10
    }
  ]
}
```

**Calculation**:
- `clip-1`: `start = 0`, `duration = 10 - 0 = 10`
- `clip-2`: `start = 0 + 10 = 10`, `duration = 8 - 2 = 6`

**Invariant check**: `clip-1.start (0) + clip-1.duration (10) == clip-2.start (10)` ✓

---

## Rollback Plan

If migration causes issues:

1. **Keep old operations**: Don't delete `timelineOperations.ts`, keep as fallback
2. **Feature flag**: Use feature flag to toggle magnetic behavior
3. **Version detection**: Auto-detect and use appropriate operations
4. **Data backup**: Always backup before migration

```typescript
// Feature flag approach
const USE_MAGNETIC_TIMELINE = true;

if (USE_MAGNETIC_TIMELINE) {
  timeline = addClipToTimelineMagnetic(...);
} else {
  timeline = addClipToTimeline(...);
}
```

---

## Performance Considerations

### Migration Cost

- **Time complexity**: O(n) where n = number of clips
- **Space complexity**: O(n) (new array)
- **One-time cost**: Only runs on load for old projects

### Validation Cost

- **Invariant validation**: O(n) - can be expensive for large timelines
- **Recommendation**: Run validation in development, skip in production (trust operations)

```typescript
// Development-only validation
if (process.env.NODE_ENV === 'development') {
  if (!validateGaplessInvariant(newTimeline)) {
    console.error('Invariant violation detected');
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **Migration function**
   - Empty timeline
   - Single clip
   - Multiple clips with varying durations
   - Clips with non-zero trimStart

2. **Invariant validation**
   - Valid gapless timeline
   - Timeline with gaps
   - Timeline with overlaps

3. **Ripple operations**
   - Insert at start/middle/end
   - Delete first/middle/last clip
   - Trim start/end of clip
   - Reorder forward/backward

### Integration Tests

1. **Load old project** → Verify migration runs
2. **Save project** → Verify `start` property included
3. **Load migrated project** → Verify no double migration
4. **Edit operations** → Verify invariant maintained

### Manual Testing

1. Open existing saved project → Verify clips positioned correctly
2. Add clip → Verify downstream clips shift right
3. Delete clip → Verify downstream clips shift left
4. Trim clip → Verify downstream clips shift by duration delta
5. Reorder clip → Verify intermediate clips shift appropriately

---

## Next Steps

After successful single-track migration:

1. **Multitrack data model**: Add `Track` and `Lane` structures
2. **Track policies**: Implement `isMagnetic`, `defaultMode`, etc.
3. **Overlay tracks**: Non-magnetic, gap-friendly tracks
4. **Linked A/V**: Audio/video group synchronization
5. **Undo/redo**: Command pattern for magnetic operations

---

## References

- `timeline-behavior.md` - Specification for magnetic timeline behavior
- `src/types/video.ts` - Data type definitions
- `src/utils/timelineOperations.ts` - Current operations
- `src/hooks/useSessionRestore.ts` - Session restore hook
- `src/hooks/useAutoSave.ts` - Auto-save hook

