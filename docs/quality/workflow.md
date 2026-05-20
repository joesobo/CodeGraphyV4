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

Tool ownership:

- `@poleski/quality-tools` owns the analyzer implementation in its own repository.
- CodeGraphy owns the local `quality.config.json` policy and uses the root scripts to run the linked package.
