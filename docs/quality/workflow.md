# Quality Workflow

Use the tools together, not in isolation.

Suggested order for a change:

0. run organize on the affected area before starting work
1. run boundaries on the affected package or subtree
2. run reachability on the affected package or subtree
3. write or update tests
4. run targeted mutation on the affected file or directory
5. keep mutation sites under `50`
6. run CRAP on the affected package or source subtree
7. run SCRAP on the affected test file or test directory

Dogfood rule:

- CodeGraphy should continue to dogfood the external `@poleski/quality-tools` package through the root scripts.
- Run the focused tool set on any CodeGraphy wrapper changes before shipping changes.
