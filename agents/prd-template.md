# PRD: [Feature Name]

**Feature**: [short name]

**Version**: 1.0

**Status**: Draft | Ready for Development | In Progress | Shipped

**Agent**: [Pete/Cody]

**Target Release**: [date or sprint]

**Links**: [PR Brief], [TODO], [Designs], [Tracking Issue]

---

## 1. Summary

One or two sentences: problem and outcome. Focus on minimum vertical slice that delivers user value independently for video editing workflow.

---

## 2. Problem & Goals

- What video editing problem are we solving?
- Why now?
- Goals (ordered, measurable):
  - [ ] G1 — [clear goal]
  - [ ] G2 — [clear goal]

---

## 3. Non-Goals / Out of Scope

Call out what's intentionally excluded to avoid scope creep.

- [ ] Not doing X (why)
- [ ] Not doing Y (why)

---

## 4. Success Metrics

Reference `prd-v1.md` for metric templates:
- User-visible: [time to complete video editing task, clicks, export completion]
- System: [See performance requirements in prd-v1.md]
- Quality: [0 blocking bugs, all gates pass, crash-free >99%]

---

## 5. Users & Stories

- As a [video editor], I want [action] so that [outcome].
- As a [content creator], I want [video editing feature] so that [workflow improvement].

---

## 6. Experience Specification (UX)

- Entry points and flows: [where in app, how triggered]
- Visual behavior: [buttons, gestures, empty states, animations]
- Loading/disabled/error states: [what user sees]
- Performance: See targets in `prd-v1.md`

---

## 7. Functional Requirements (Must/Should)

- MUST: [deterministic Electron IPC handler for each action]
- MUST: [video processing per prd-v1.md requirements]
- MUST: [auto-save functionality]
- SHOULD: [responsive UI during video operations]

Acceptance gates per requirement:
- [Gate] When user imports video → metadata extracted in <2 seconds
- [Gate] When user trims clip → preview updates in real-time
- [Gate] Error case: invalid file shows alert; no partial processing

---

## 8. Data Model

Describe new/changed data structures, schemas, invariants.

Reference examples in `prd-v1.md` for common patterns.

```typescript
// Define your specific data model here
```

- Validation rules: [file format constraints, data validation]
- File operations: [local file system, auto-save patterns]

---

## 9. API / Service Contracts

Specify concrete Electron IPC handlers. Reference examples in `prd-v1.md`.

```typescript
// Example:
window.electron.extractVideoMetadata(filePath: string): Promise<VideoMetadata>
```

- Pre/post-conditions for each method
- Error handling strategy
- Parameters and types
- Return values

---

## 10. UI Components to Create/Modify

List React components/files with one-line purpose each.

- `src/components/[Name].tsx` — [purpose]
- `src/hooks/[Name].ts` — [purpose]
- `src/services/[Name].ts` — [purpose]

---

## 11. Integration Points

- Electron IPC integration
- Local file system
- State management (React patterns)
- FFmpeg for video processing
- Cross-platform compatibility (macOS primary, Windows secondary)

---

## 12. Test Plan & Acceptance Gates

Define BEFORE implementation. Use checkboxes.

Reference testing standards from `prd-v1.md`.

- Happy Path
  - [ ] User action succeeds
  - [ ] Gate: [specific measurable outcome]
  
- Edge Cases
  - [ ] Empty/invalid input handled
  - [ ] Large files handled correctly
  
- Video Processing
  - [ ] FFmpeg operations complete successfully
  - [ ] Performance targets met
  
- Performance (see prd-v1.md)
  - [ ] App load < 5s
  - [ ] Timeline UI responsive
  - [ ] Video playback smooth 30fps

---

## 13. Definition of Done

See standards in `prd-v1.md` and `.cursorrules`:
- [ ] Electron IPC handlers implemented in main process
- [ ] React components with all states
- [ ] Video processing verified with FFmpeg
- [ ] Auto-save functionality tested
- [ ] All acceptance gates pass
- [ ] Cross-platform testing done (macOS primary)
- [ ] Performance targets met
- [ ] Documentation updated

---

## 14. Risks & Mitigations

- Risk: [video processing] → Mitigation: [FFmpeg optimization, error handling]
- Risk: [performance/UI responsiveness] → Mitigation: [async operations, progress indicators]

---

## 15. Rollout & Telemetry

- Feature flag? [yes/no]
- Metrics: [usage, errors, processing time]
- Manual validation steps

---

## 16. Open Questions

- Q1: [decision needed]
- Q2: [dependency/owner]

---

## 17. Appendix: Out-of-Scope Backlog

Items deferred for future:
- [ ] Future X
- [ ] Future Y

---

## Preflight Questionnaire

Answer these to drive vertical slice and acceptance gates:

1. Smallest end-to-end user outcome for this PR?
2. Primary user and critical action?
3. Must-have vs nice-to-have?
4. Video processing requirements? (see prd-v1.md)
5. Performance constraints? (see prd-v1.md)
6. Error/edge cases to handle?
7. Data model changes?
8. Electron IPC handlers required?
9. UI entry points and states?
10. File system implications?
11. Dependencies or blocking integrations?
12. Rollout strategy and metrics?
13. What is explicitly out of scope?

---

## Authoring Notes

- Write Test Plan before coding
- Favor vertical slice that ships standalone
- Keep Electron IPC handlers deterministic
- React components are thin wrappers
- Test video processing thoroughly with real video files
- Reference `prd-v1.md` and `.cursorrules` throughout