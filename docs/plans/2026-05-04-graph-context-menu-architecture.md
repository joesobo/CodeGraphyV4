# Graph Context Menu Architecture Pass

## Setup

- Worktree: `/Users/poleski/Desktop/Projects/CodeGraphyV4-graph-context-menu-architecture`
- Branch: `codex/graph-context-menu-architecture`
- PR base branch: `main`
- Stacked on: PR 198, `Replace access-count sizing with Git history churn`
- Note: the branch starts from PR 198 so PR 199 includes those commits until PR 198 lands. The PR targets `main` because the repo CI workflow only runs for pull requests into `main`.
- Domain source: `CONTEXT.md`
- Related plan: `docs/plans/2026-05-04-issue-128-context-window-folder-create.md`

## Goal

Deepen the Graph Context Menu modules in five ordered slices:

1. Replace timeline-only mutation filtering with Graph Revision mutability.
2. Deepen Context Selection classification.
3. Route built-in context actions through resolved context facts.
4. Separate Graph Context Menu opening mechanics from the broader graph interaction runtime.
5. Move tests toward product scenarios.

Each slice should land with targeted tests, a commit, a push, and CI verification before moving to the next slice.

## Domain Constraints

- Use `Graph Context Menu` for the right-click menu opened from a `Context Selection`.
- Use `Context Selection` for the graph target or targets behind menu actions.
- Mutation actions remain enabled for the default Graph Revision, including current `HEAD` plus working tree state.
- Mutation actions are disabled, not hidden, for historical Timeline Snapshots.
- File Node menus must not offer child creation actions.
- Folder Node menus may offer child creation actions when the selected Graph Revision is mutable.
- Right-click selection mechanics stay separate from the menu decision model.

## Slice 2: Graph Revision Mutability

Problem:

- The Graph Context Menu already accepts `mutationAvailability`, but some entry modules still branch on `timelineActive`.
- Folder Node creation actions can be disabled for historical Timeline Snapshots, while background and generic File Node mutation actions can still be hidden outright.
- The menu is leaking Timeline View mechanics instead of consuming the product fact: whether the selected Graph Revision is mutable.

Direction:

- Make Graph Revision mutability the single input for mutation action availability.
- Use it consistently for background, File Node, Folder Node, and multi-node mutation entries.
- Preserve disabled actions for historical Timeline Snapshots so users can see why the action is unavailable.

Verification:

- Targeted Graph Context Menu model tests cover current Graph Revision, historical Timeline Snapshot, background, File Node, Folder Node, and multi-node mutation entries.
- Broader webview or extension tests run after the slice.
- Push the slice and confirm PR CI passes before continuing.

Status:

- Done in this branch.
- `buildGraphContextMenuEntries` now treats mutation availability as the single mutation input instead of deriving hidden actions from `timelineActive`.
- Background, File Node, Folder Node, and multi-node mutation entries consistently stay visible when disabled by a historical Timeline Snapshot.
- `timelineActive` still drives timeline-specific non-mutation behavior such as hiding `Reveal in Explorer`.
- Verified with:
  - `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/contextMenu/model.test.ts`
  - `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/contextMenu`
  - `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/viewport/model.test.tsx`

## Slice 1: Context Selection Classification

Problem:

- `Context Selection` carries raw target ids, while File Node, Folder Node, Package, Edge, and plugin eligibility are classified across several modules.
- The current decision model is shallow because deleting it would mostly move a few conditionals into the entry builder.

Direction:

- Make the Graph Context Menu decision model classify Context Selection into explicit product states.
- Keep right-click selection mechanics out of the decision model.
- Reuse the classification for menu entries and plugin target eligibility where it improves locality.

## Slice 3: Built-In Action Context

Problem:

- Built-in context actions receive `targetPaths: string[]`.
- Action effects rediscover positional meaning, edge endpoint meaning, root path behavior, and folder target behavior.

Direction:

- Route built-in actions through resolved context facts derived from the Graph Context Menu decision.
- Keep extension-side defensive checks, but make the webview action effect seam less string-position dependent.

## Slice 4: Opening Mechanics

Problem:

- Graph Context Menu opening mechanics are mixed into the broader graph interaction runtime.
- Context Selection updates, highlight timing, fallback events, pointer state, tooltip state, and menu action dispatch are hard to reason about together.

Direction:

- Extract a deeper module for Graph Context Menu opening mechanics.
- Keep menu decision and menu rendering separate from pointer and selection mechanics.

## Slice 5: Product Scenario Tests

Problem:

- Tests mostly mirror helper modules rather than product scenarios.
- Bugs are likely to appear in combinations of Context Selection, Graph Revision mutability, target classification, and action effects.

Direction:

- Add scenario-focused tests for background, File Node, Folder Node, Edge, mixed selection, current Graph Revision, and historical Timeline Snapshot behavior.
- Keep helper tests where they kill meaningful mutations.

## Quality Gates

- Run targeted tests after each slice.
- Run local quality tools after all slices:
  - `pnpm run lint`
  - `pnpm run typecheck`
  - `pnpm run test`
  - scoped mutation tests for changed Graph Context Menu modules where practical
- Fix failures and re-run the failing gate until it passes.
- Confirm GitHub CI passes after the final push.
