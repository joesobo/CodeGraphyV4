# Root Folder Hygiene

## Goal

Clarify why root `tests/` and `test-fixtures/` exist. Remove or relocate low-value root clutter. Keep required publish/config files at root.

## Subtasks

- `S1` audit `tests/` + `test-fixtures/`; decide keep/move/delete; tests: update paths/config if moved, none if untouched
- `S2` audit root configs; identify low-risk consolidation/cleanup; tests: lint/typecheck for touched configs
- `S3` implement approved cleanup in isolated branch; tests: targeted + repo gates as feasible

## Notes

- Protected worktree stays untouched on `main`
- Branch: `chore/root-folder-hygiene`
- Worktree: local agent worktree

## Unresolved Questions

- None yet
