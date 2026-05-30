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

## Risks

- VS Code webview inspection may require brittle selectors, frame lookup, or pixel/screenshot assertions.
- Canvas pixel assertions can be noisy across Electron, GPU, headless, and CI environments.
- Running real VS Code-window E2E in CI may increase flake rate and wall-clock time, but that cost is acceptable for product-visible Graph View regressions.
- Deleting the Chromium harness too early could lose coverage for 3D/WebGL fallback and plugin Graph View actions.
