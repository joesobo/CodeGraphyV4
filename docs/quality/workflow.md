# Quality Workflow

Use the tools together, not in isolation.

Suggested order for a change:

0. run organize on the affected area before starting work
1. run boundaries on the affected package or subtree
2. write or update tests
3. run targeted mutation on the affected file or directory
4. keep mutation sites under `50`
5. run CRAP on the affected package or source subtree
6. run SCRAP on the affected test file or test directory

Dogfood rule:

- `packages/quality-tools` must meet the same standards it enforces for the rest of the repo
- Run all five tools (boundaries, organize, CRAP, mutation, and SCRAP) on quality-tools before shipping changes
