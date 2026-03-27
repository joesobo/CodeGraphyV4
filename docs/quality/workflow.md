# Quality Workflow

Use the tools together, not in isolation.

Suggested order for a change:

1. write or update tests
2. run targeted mutation on the affected file or directory
3. keep mutation sites under `50`
4. run CRAP on the affected package or source subtree
5. run SCRAP on the affected test file or test directory

Dogfood rule:

- `packages/quality-tools` must meet the same standards it enforces for the rest of the repo
