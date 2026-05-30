# VS Code Playwright Extension E2E

## Goal

Move CodeGraphy's browser-level graph rendering E2E confidence closer to the actual product surface: the VS Code Extension running in a VS Code window with the Graph View webview open.

## Current Shape

- `test:playwright` builds the extension webview and runs Playwright against a standalone Chromium harness served by `packages/extension/tests/playwright/webview-server.mjs`.
- `test:vscode` launches VS Code through `@vscode/test-electron` and runs Mocha tests with access to the real `vscode` API.
- The VS Code E2E suite currently proves activation, commands, workspace discovery, Indexing, Graph Cache behavior, Graph View messages, Visible Graph state, rendered node bounds, Depth Mode, and 3D mode through the extension API and webview protocol.
- The standalone Playwright suite currently proves browser-visible canvas/container behavior, fit-to-view bounds, 3D fallback behavior, WebGL pixels, and Graph View plugin menu behavior in Chromium, outside VS Code.

## Proposed Direction

- Treat VS Code Extension E2E as the only E2E lane for product UI behavior.
- Retire the standalone Chromium webview harness once the important assertions move into VS Code-window tests.
- Keep Vitest for unit/component/model behavior, including Graph View message routing and rendering callbacks that are cheaper and clearer outside Electron.
- Use Playwright only where it can inspect or drive the real VS Code window and its Graph View webview.

## Decisions

- Standalone Chromium Playwright is not a product E2E lane. It should be retired after its product-critical assertions move into VS Code-window E2E. Future E2E tests for Graph View behavior should launch the VS Code Extension and inspect or drive the real Graph View webview in the VS Code window.
- VS Code-window Playwright is the E2E runner. Do not keep a parallel Mocha `@vscode/test-electron` extension-host suite as a long-term lane. Unit and integration tests in the owning packages should cover extension API, Graph View message routing, Graph Cache behavior, and other lower-level contracts. E2E should be reserved for user-perspective scenarios in the running VS Code Extension.
- VS Code-window Playwright E2E runs in CI and should block merges. A visual break in the real Graph View is product breakage, so the CI gate must prove the VS Code Extension can launch, open the Graph View, render the Graph Stage, and show visible Nodes and Edges before a PR merges.
- Before Indexing performs analysis, File Discovery should populate the Graph View with File Nodes for the open CodeGraphy Workspace. The user should already have a live graph while processing runs. Indexing enriches that existing graph with Edges and any updated graph metadata rather than replacing an empty loading state with the final graph.
- The first E2E progress assertion is intentionally narrow: when Indexing starts, the progress bar renders; after Indexing completes, the progress bar disappears.
- VS Code-window Playwright E2E should use Playwright-observable product behavior only. Do not add a Graph View debug bridge or internal test API for locating Nodes or Edges. Tests should interact with the VS Code window and Graph View the way a user would, using visible UI, browser frames, canvas pixels, screenshots, accessibility where available, and real pointer/keyboard actions.
- Stable accessibility labels are the preferred way for Playwright to locate real Graph View UI. Adding labels is product work, not just test work, because it improves accessibility while giving tests durable handles for user-visible controls and state.

## First Questions To Resolve

1. Which assertions are product-critical enough for E2E: Node render, Edge render, Graph Stage fit, Depth Mode, 3D fallback, plugin Graph View actions, theme rendering, or all of them?
2. What selectors, labels, or accessible names should production UI expose so Playwright can find user-visible Graph View controls without internal debug hooks?

## Candidate First Slice

Start with the basic user-perspective flow:

1. Launch VS Code with the TypeScript example folder open.
2. Open the CodeGraphy Graph View.
3. Assert Nodes render before Indexing.
4. Trigger Indexing.
5. Assert graph-local progress is visible while Indexing runs.
6. Assert Nodes update after Indexing completes.
7. Assert Edges render after Indexing.
8. Assert a specific File Node and specific Edge are visible.
9. Drag a Node and assert that its rendered position changes.
10. Click a File Node and assert the matching file opens in VS Code.

Only after that is green should we migrate the richer standalone Playwright coverage.

## Research Notes

- Sigma.js uses Playwright E2E for short graph scenarios followed by screenshot comparison against committed reference snapshots. Its test package keeps datasets, a minimal app, E2E specs, and snapshots together.
- JointJS recommends Playwright locators for normal DOM/SVG UI, real mouse dragging/linking interactions, and screenshot-based visual regression for visual state.
- Cytoscape.js documents browser and Node test execution for its public API, but the obvious public testing guidance is model/API-heavy rather than a product-style visual E2E pattern.
- CodeGraphy should not add ARIA labels merely to make canvas-rendered Nodes and Edges queryable. Add accessibility labels for real controls and state such as Graph Stage, Index Graph, and Indexing progress. For the rendered graph itself, prefer real pointer actions, canvas pixel/screenshot assertions, and user-observable VS Code effects such as opening a file.
- Deterministic visual assertions need a spike. The force graph physics may make stable screenshots or specific pixel-region assertions difficult unless the E2E fixture, layout, viewport, and fit behavior are controlled tightly.
- It is acceptable to add accessibility labels to real hover or Graph Context Menu UI that appears from user interaction with a Node or Edge. That can help confirm a specific File Node or Edge was reached without adding hidden debug APIs or fake accessibility semantics to every canvas primitive.

## Risks

- VS Code webview inspection may require brittle selectors, frame lookup, or pixel/screenshot assertions.
- Canvas pixel assertions can be noisy across Electron, GPU, headless, and CI environments.
- Running real VS Code-window E2E in CI may increase flake rate and wall-clock time, but that cost is acceptable for product-visible Graph View regressions.
- Deleting the Chromium harness too early could lose coverage for 3D/WebGL fallback and plugin Graph View actions.
