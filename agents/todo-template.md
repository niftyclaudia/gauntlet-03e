# PR-{N} TODO — [Feature Name]

**Branch**: `feat/pr-{n}-{feature-slug}`  
**Source PRD**: `docs/prds/pr-{n}-prd.md`  
**Owner (Agent)**: [Pete/Cody]

---

## 0. Clarifying Questions & Assumptions

- Questions: [unanswered items from PRD]
- Assumptions (confirm in PR if needed):
  - [assumption 1]
  - [assumption 2]

---

## 1. Setup

- [ ] Create branch `feat/pr-{n}-{feature-slug}` from develop
- [ ] Read PRD thoroughly
- [ ] Read `.cursorrules` for patterns and requirements
- [ ] Read `prd-v1.md` for project context
- [ ] Confirm environment and Electron dev server work

---

## 2. Service Layer

Implement deterministic Electron IPC handlers from PRD.

- [ ] Implement [IPC handler name] in main process
  - Test Gate: Handler works for valid/invalid cases
- [ ] Implement [IPC handler name] in main process
  - Test Gate: Handler returns expected values
- [ ] Add validation logic
  - Test Gate: Edge cases handled correctly

---

## 3. Data Model & File Operations

- [ ] Define new types/interfaces in TypeScript
- [ ] Update project state schema (if needed)
- [ ] Add validation rules
  - Test Gate: Reads/writes succeed with rules applied

---

## 4. UI Components

Create/modify React components per PRD Section 10.

- [ ] Create/modify [Component name]
  - Test Gate: React component renders; zero console errors
- [ ] Wire up state management (useState, useEffect, etc.)
  - Test Gate: Interaction updates state correctly
- [ ] Add loading/error/empty states
  - Test Gate: All states render correctly

---

## 5. Integration & Video Processing

Reference requirements from `prd-v1.md` and `.cursorrules`.

- [ ] Electron IPC integration
  - Test Gate: IPC calls work from renderer to main process
- [ ] Video processing operations working
  - Test Gate: FFmpeg operations complete successfully
- [ ] Auto-save functionality
  - Test Gate: Project state saves and restores correctly
- [ ] File system operations (if applicable)
  - Test Gate: File operations work correctly

---

## 6. Manual Testing

Follow manual testing protocol from `prd-v1.md`.

- [ ] Manual validation with real video files
  - Test Gate: All features work with actual MP4/MOV files
  
- [ ] Performance verification
  - Test Gate: Timeline UI responsive, video playback smooth 30fps
  
- [ ] Cross-platform testing
  - Test Gate: Works on macOS (primary) and Windows (secondary)
  
- [ ] Edge case testing
  - Test Gate: Large files, corrupted files, invalid formats handled
  
- [ ] Definition of done checklist
  - Test Gate: All items from prd-v1.md and .cursorrules verified

---

## 7. Performance

Verify targets from `prd-v1.md`.

- [ ] App load time < 5 seconds
  - Test Gate: Cold start to interactive UI measured
- [ ] Timeline UI responsive
  - Test Gate: Drag operations < 50ms response time
- [ ] Video playback smooth 30fps minimum
  - Test Gate: 1080p H.264 playback verified
- [ ] Memory usage < 1GB with 10 clips
  - Test Gate: Memory monitored during testing

---

## 8. Acceptance Gates

Check every gate from PRD Section 12:
- [ ] All happy path gates pass
- [ ] All edge case gates pass
- [ ] All video processing gates pass
- [ ] All performance gates pass

---

## 9. Documentation & PR

- [ ] Add inline code comments for complex logic
- [ ] Update README if needed
- [ ] Create PR description (use format from agents/cody-agent-template.md)
- [ ] Verify with user before creating PR
- [ ] Open PR targeting develop branch
- [ ] Link PRD and TODO in PR description

---

## Copyable Checklist (for PR description)

```markdown
- [ ] Branch created from develop
- [ ] All TODO tasks completed
- [ ] Electron IPC handlers implemented in main process
- [ ] React components implemented with state management
- [ ] Video processing integration tested with FFmpeg
- [ ] Manual testing complete with real video files
- [ ] Performance targets met (see prd-v1.md)
- [ ] All acceptance gates pass
- [ ] Code follows .cursorrules patterns
- [ ] No console warnings
- [ ] Documentation updated
```

---

## Notes

- Break tasks into <30 min chunks
- Complete tasks sequentially
- Check off after completion
- Document blockers immediately
- Reference `prd-v1.md` and `.cursorrules` for common patterns and solutions