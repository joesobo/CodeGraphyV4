# Extension Organize Follow-up

## Goal

After the code-index rearchitecture PR lands, run a focused organization follow-up for `packages/extension`.

The goal is not to satisfy every mechanical organize hint. The goal is to make the extension package easier to navigate by moving obvious feature clusters into feature folders, mirroring source/test structure where useful, and replacing vague folder/file names with names that carry domain context.

## Scope

In:
- `packages/extension/src/core`
- `packages/extension/src/extension`
- `packages/extension/src/shared`
- `packages/extension/src/webview`
- matching `packages/extension/tests` moves when they clearly mirror source behavior

Out:
- `docs/`
- `examples/`
- `packages/extension/test-fixtures`
- generated output
- unrelated plugin packages
- broad quality-tools cleanup

## Working Rules

- Prefer feature folders over technical layers.
- Path carries feature context; filename carries role.
- Do not create folders named `file`, `model`, `get`, `index`, `default`, `low`, `max`, `alt`, or `auto`.
- Use better names when organize suggests generic names:
  - `auto` -> `autoFit` when the files are viewport fitting behavior.
  - `default` -> `dependencies` when the files wire default dependencies.
  - `single` -> `singleClick` when the files are click behavior.
  - `alt` -> `keyboardShortcuts` when the files handle Alt-key shortcuts.
  - `max` -> `limits` when the files handle maximum file/filter limits.
  - `index` -> `entrypoint` or `actions` depending on behavior.
  - `built` -> `builtin`.
  - `regular` -> `regularPolygon`.
  - `file` -> `sourceFile`, `fileInfo`, or `watcher` depending on context.
- Keep tests next to the behavior they cover. Multiple test files for one source file are fine.
- Move one feature area at a time and run targeted tests after each batch.
- Use `git mv` for renames/moves so history remains readable.

## Implementation Batches

### Batch 1: Webview Graph Model And Rendering

This is the highest-value first batch because graph webview files are dense and already have clear feature clusters.

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/webview/components/graph/model/timeline/` | `timelinePositionSeedNeighbor.ts`, `timelinePositionSeeding.ts` | Timeline layout seeding is its own graph-model behavior and now already split from generic graph model building. |
| `packages/extension/src/webview/components/graph/model/link/assignment/` | `assignment.ts` | Link assignment is independent from link construction, curvature, and grouping. |
| `packages/extension/src/webview/components/graph/model/node/build/` | `build.ts` | Node construction deserves its own local build feature folder if more helpers keep accumulating. |
| `packages/extension/src/webview/components/graph/model/sizing/access/` | `accessCount.ts` | Access-count sizing is one sizing strategy, separate from file size/range/calculations. |
| `packages/extension/src/webview/components/graph/rendering/bidirectional/arrow/` | `arrowGeometry.ts` | Arrow geometry is the arrow-specific part of bidirectional rendering. |
| `packages/extension/src/webview/components/graph/rendering/link/colors/` | `colors.ts` | Link colors are a separate rendering policy from metrics/contracts. |
| `packages/extension/src/webview/components/graph/rendering/shapes/draw/` | `draw2d.ts`, `draw3d.ts` | 2D/3D drawing implementations belong together and should not sit beside shape definitions. |
| `packages/extension/src/webview/components/graph/rendering/surface/view/` | `view2d.tsx`, `view3d.tsx`, `fallbackBoundary.tsx` | Surface view rendering is separate from shared surface props. |
| `packages/extension/src/webview/components/graph/runtime/physicsLifecycle/init/` | `init.ts` | Physics initialization is a lifecycle phase, separate from readiness/updates. |
| `packages/extension/src/webview/components/graph/runtime/use/indicators/` | `indicators.ts`, `labelVisibility.ts`, `meshHighlights.ts`, `nodeAppearance.ts` | These files all derive visual runtime indicators from graph state. |
| `packages/extension/src/webview/components/graph/runtime/use/events/` | `events.ts` | Runtime event hookup should be isolated from rendering/state hooks. |
| `packages/extension/src/webview/components/graph/runtime/use/physics/hook/init/` | `init.ts`, `refs.ts` | Physics hook initialization/ref setup is a distinct setup phase. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/webview/graph/model/timeline/` | `timelinePositionSeedNeighbor.test.ts`, `timelinePositionSeeding.test.ts`, `timelinePositionSeeding.mutations.test.ts`, `timelinePositionSeeding.mutations2.test.ts` | Mirrors `src/.../graph/model/timeline/` and keeps mutation tests with the behavior. |
| `packages/extension/tests/webview/graph/model/node/display/` | `display.test.ts`, `display.mutations.test.ts`, `display.mutations2.test.ts` | Multiple tests cover one display source behavior; keep them grouped under `display/`. |
| `packages/extension/tests/webview/graph/model/node/sizing/` | `sizing.test.ts`, `sizing.mutations.test.ts`, `sizing.mutations2.test.ts` | Multiple tests cover node sizing; keep them grouped under `sizing/`. |
| `packages/extension/tests/webview/graph/messages/effects/` | `effects.fileInfo.test.ts`, `effects.modules.test.ts`, `effects.runtime.test.ts` | Mirrors message effect behavior and removes repeated filename prefixes. |
| `packages/extension/tests/webview/graph/runtime/use/physics/hook/` | `hook.test.ts`, `hook.controlFlow.test.tsx`, `hook.integration.test.tsx` | Physics hook tests should live with the hook behavior. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/model tests/webview/graph/messages tests/webview/graph/runtime/use/physics`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 2: Webview Graph Interaction And Menus

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/webview/components/graph/contextActions/builtin/` | `builtinEffects.ts` | Built-in context actions are separate from plugin effects and prompt plumbing. |
| `packages/extension/src/webview/components/graph/contextMenu/build/` | `buildEntries.ts` | Menu entry construction is a build step, separate from selection/target classification. |
| `packages/extension/src/webview/components/graph/contextMenu/node/destructive/` | `destructiveBlock.ts`, `favoritesDestructiveBlocks.ts` | Destructive node actions are a distinct node-menu group. |
| `packages/extension/src/webview/components/graph/contextMenuRuntime/fallback/` | `fallback.ts`, `fallbackEvent.ts` | Fallback menu behavior belongs together. |
| `packages/extension/src/webview/components/graph/debug/contracts/` | `contracts.ts` | Debug contracts should not sit beside install/options/snapshot behavior. |
| `packages/extension/src/webview/components/graph/interaction/node/singleClick/` | `singleClick.ts`, `singleClickSelection.ts` | Single-click behavior is distinct from double-click and lower-level selection/click plumbing. |
| `packages/extension/src/webview/components/graph/interactionRuntime/fit/api/` | `api.ts`, `view.ts` | Fit runtime public entrypoints should be separate from bounds/measurement/transform calculations. |
| `packages/extension/src/webview/components/graph/keyboard/command/` | `commandBuilders.ts`, `commandLookup.ts` | Keyboard command modeling is separate from listeners/effects/shortcut resolving. |
| `packages/extension/src/webview/components/graph/messages/effects/fileInfo/` | `fileInfo.ts` | Use `fileInfo/`, not generic `file/`, because the effect handles file-info messages. |
| `packages/extension/src/webview/components/graph/support/contracts/` | `contracts.ts` | Support contracts should be isolated from DOM guards and link-target helpers. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/webview/graph/rendering/image/` | `imageCache.test.ts`, `imageCache.mutations.test.ts`, `imageCache.deps.test.ts` | Groups image cache tests and removes repeated filename prefix. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/graph/contextMenu tests/webview/graph/contextMenuRuntime tests/webview/graph/interaction tests/webview/graph/keyboard tests/webview/graph/rendering`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 3: Webview UI Components

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/webview/app/rulePrompt/dialog/` | `Dialog.tsx`, `handlers.ts` | Dialog view and handlers are one rule-prompt subfeature. |
| `packages/extension/src/webview/app/shell/derived/` | `derivedState.ts`, `storeSelectors.ts` | Derived shell state/selectors are separate from message handling and shell view. |
| `packages/extension/src/webview/components/export/panel/` | `Panel.tsx`, `sections.tsx` | Export panel view should be grouped separately from export actions/model. |
| `packages/extension/src/webview/components/graph/autoFit/` | `autoFit.ts` | Use `autoFit/`, not `auto/`; this is viewport fitting behavior. |
| `packages/extension/src/webview/components/icons/dag/` | `DagDefaultIcon.tsx`, `DagLeftRightIcon.tsx`, `DagRadialIcon.tsx`, `DagTopDownIcon.tsx` | DAG layout icons are a cohesive icon family. |
| `packages/extension/src/webview/components/legends/panel/messages/` | `messages.ts` | Legend panel message protocol is separate from state/view. |
| `packages/extension/src/webview/components/legends/panel/section/builtin/` | `builtInRow.tsx`, `displayRules.ts` | Use `builtin/`, not `built/`; these are built-in legend section rows/rules. |
| `packages/extension/src/webview/components/nodeTooltip/content/` | `content.tsx`, `formatters.ts` | Tooltip content building is separate from the tooltip view shell. |
| `packages/extension/src/webview/components/searchBar/field/` | `Field.tsx`, `ToggleButton.tsx` | Search field UI should own its field and button pieces. |
| `packages/extension/src/webview/components/searchBar/field/keyboardShortcuts/` | `altShortcuts.ts`, `keyboard.ts`, `useKeyboard.ts` | Use `keyboardShortcuts/`, not `alt/`; this is keyboard behavior. |
| `packages/extension/src/webview/components/settingsPanel/display/color/` | `ColorField.tsx` | Color controls are their own display settings behavior. |
| `packages/extension/src/webview/components/settingsPanel/display/state/mode/` | `modeOptions.ts` | Display mode options should be separate from state timers/selectors. |
| `packages/extension/src/webview/components/settingsPanel/filters/limits/` | `MaxFilesControl.tsx` | Use `limits/`, not `max/`; this is filter limit UI. |
| `packages/extension/src/webview/components/timeline/use/controller/cleanup/` | `cleanup.ts` | Timeline cleanup is a controller phase. |
| `packages/extension/src/webview/components/toolbar/dag/` | `DagModeToggle.tsx` | DAG toolbar behavior should be separate from dimension/node-size controls. |
| `packages/extension/src/webview/components/toolbar/actions/entrypoint/` | `indexAction.tsx` | Use `entrypoint/`, not `index/`; this action launches index/build behavior. |
| `packages/extension/src/webview/components/ui/button/` | `button.tsx` | Button primitive should own its local UI primitive folder. |
| `packages/extension/src/webview/components/ui/context/items/` | `items.tsx` | Context menu item definitions should be separate from layout/menu/triggers. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/webview/components/searchBar/field/` | `Field.test.tsx`, `Field.mutations.test.tsx`, `Field.css.test.tsx` | Mirrors `components/searchBar/field/`. |
| `packages/extension/tests/webview/searchBar/field/toggle/` | `ToggleButton.test.tsx`, `ToggleButton.mutations.test.tsx`, `ToggleButton.deps.test.tsx` | Groups ToggleButton tests under the button behavior. |
| `packages/extension/tests/webview/nodeTooltip/view/` | `view.test.tsx`, `view.mutations.test.tsx`, `view.css.test.tsx` | Multiple view tests cover one tooltip view behavior. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/components tests/webview/searchBar tests/webview/nodeTooltip tests/webview/toolbar`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 4: Webview Export, Plugin Host, Store, Theme

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/webview/export/json/build/` | `build.ts`, `edges.ts`, `nodes.ts`, `legend.ts` | JSON export building is one pipeline separate from export command entrypoint. |
| `packages/extension/src/webview/export/markdown/edge/` | `edgeEntries.ts` | Edge markdown entries are separate from node/legend/summary rendering. |
| `packages/extension/src/webview/export/svg/link/element/` | `element.ts` | Link element construction is separate from document/layout/node-id helpers. |
| `packages/extension/src/webview/export/svg/node/image/` | `imageOverlay.ts` | Node image overlay generation is separate from node markup. |
| `packages/extension/src/webview/export/svg/shape/regularPolygon/` | `regularPolygonPath.ts` | Use `regularPolygon/`, not `regular/`; the behavior is specific. |
| `packages/extension/src/webview/pluginHost/api/contracts/` | `contracts.ts` | Plugin host API contracts should be isolated from drawing/messages/tooltip access. |
| `packages/extension/src/webview/pluginHost/api/registration/cleanup/` | `cleanup.ts` | Registration cleanup is a lifecycle behavior. |
| `packages/extension/src/webview/store/actions/` | `actions.ts`, `displayActions.ts` | Store action creators should not live beside defaults/state/message types. |
| `packages/extension/src/webview/store/messageHandlers/equality/` | `equality.ts` | Equality helpers are cross-message-handler support, not a handler. |
| `packages/extension/src/webview/store/optimistic/groups/` | `groups.ts` | Optimistic group updates are a distinct optimistic-update behavior. |
| `packages/extension/src/webview/theme/brightness/` | `brightness.ts`, `detection.ts` | Theme brightness detection is separate from message guard and React hook. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/webview/store/optimistic/` | `optimisticGroups.test.ts`, `optimisticGroupsPending.test.ts`, `optimisticGroupsUser.test.ts` | Mirrors `store/optimistic/groups/`; multiple tests for the same behavior stay grouped. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/export tests/webview/pluginHost tests/webview/store tests/webview/theme`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 5: Extension Host Graph View

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/extension/graphView/analysis/execution/` | `execution.ts` | Analysis execution is a subfeature of graph view analysis. |
| `packages/extension/src/extension/graphView/analysis/execution/initialize/` | `initialize.ts`, `prepare.ts`, `load.ts` | Initialization/preparation should be separate from run/publish/refresh phases. |
| `packages/extension/src/extension/graphView/controls/send/definitions/contracts/` | `contracts.ts` | Definition contracts should be separate from guards/registry/snapshot. |
| `packages/extension/src/extension/graphView/files/info/loader/` | `loader.ts` | File-info loading is separate from request/message/payload shaping. |
| `packages/extension/src/extension/graphView/files/visits/counts/` | `counts.ts` | Visit count calculation is separate from storage/tracking. |
| `packages/extension/src/extension/graphView/presentation/contracts/` | `contracts.ts` | Presentation contracts should be isolated from transforms. |
| `packages/extension/src/extension/graphView/provider/analysis/delegates/` | `delegates.ts` | Analysis provider delegate wiring is separate from request/state/methods. |
| `packages/extension/src/extension/graphView/provider/plugin/broadcasts/` | `broadcasts.ts` | Plugin provider broadcast behavior is distinct from methods/resources. |
| `packages/extension/src/extension/graphView/provider/runtime/state/bootstrap/` | `bootstrap.ts` | Runtime state bootstrap is distinct from flags/data/visibility updates. |
| `packages/extension/src/extension/graphView/provider/timeline/behavior/` | `behavior.ts` | Timeline provider behavior should be isolated from cache/contracts/default deps. |
| `packages/extension/src/extension/graphView/provider/webview/dependencies/` | `defaultDependencies.ts` | Use `dependencies/`, not `default/`; this file wires default webview dependencies. |
| `packages/extension/src/extension/graphView/settings/disabled/` | `disabled.ts` | Disabled-settings behavior should live separately from lifecycle/reader/sender/sync. |
| `packages/extension/src/extension/graphView/timeline/indexing/defaults/` | `defaults.ts` | Timeline indexing defaults are separate from filtering/run/setup. |
| `packages/extension/src/extension/graphView/timeline/provider/commit/` | `commitData.ts` | Commit data loading is separate from indexing/jump/repository. |
| `packages/extension/src/extension/graphView/webview/dispatch/primary/` | `primary.ts`, `primaryState.ts` | Primary webview dispatch state/entrypoint are distinct from plugin/routed/stateful dispatch. |
| `packages/extension/src/extension/graphView/webview/messages/commands/dispatch/` | `dispatch.ts` | Command dispatch is separate from command history/mode models. |
| `packages/extension/src/extension/graphView/webview/nodeFile/edit/` | `edit.ts` | Node-file edit behavior should be separate from navigation/open/router. |
| `packages/extension/src/extension/graphView/webview/plugins/registration/followUp/` | `followUp.ts` | Use `followUp/`, not `follow/`; this is post-registration follow-up behavior. |
| `packages/extension/src/extension/graphView/webview/providerMessages/plugin/` | `pluginApis.ts`, `pluginContext.ts`, `pluginState.ts` | Plugin provider messages should be grouped by plugin concern. |
| `packages/extension/src/extension/graphView/webview/providerMessages/settingsContext/create/` | `create.ts` | Settings-context creation is separate from persistence/pluginFiles. |
| `packages/extension/src/extension/graphView/webview/settingsMessages/direction/` | `direction.ts` | Settings message direction model is separate from router/toggle. |
| `packages/extension/src/extension/graphView/webview/settingsMessages/updates/apply/` | `apply.ts` | Settings update application is separate from per-setting update handlers. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/extension/graphView/analysis/execution/fixtures/` | `fixtures.ts` | Test fixtures should not sit beside behavior tests. |
| `packages/extension/tests/extension/graphView/provider/plugin/broadcasts/` | `broadcasts.test.ts` | Mirrors provider plugin broadcast behavior. |
| `packages/extension/tests/extension/graphView/webview/dispatch/context/` | `context.ts` | Dispatch test context should be separated from test cases. |
| `packages/extension/tests/extension/graphView/webview/providerMessages/plugin/` | `pluginApis.test.ts`, `pluginContext.test.ts`, `pluginState.test.ts` | Mirrors plugin provider-message behavior. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/graphView tests/extension/graphViewProvider`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 6: Extension Host Pipeline And Tree-sitter

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/extension/pipeline/abort/` | `abort.ts` | Abort behavior is cross-pipeline control flow and should be isolated. |
| `packages/extension/src/extension/pipeline/database/cache/io/connection/` | `connection.ts` | Cache connection handling is distinct from load/save/path operations. |
| `packages/extension/src/extension/pipeline/database/cache/records/contracts/` | `contracts.ts` | Record contracts should not sit beside record serializers. |
| `packages/extension/src/extension/pipeline/database/cache/relation/descriptor/` | `descriptorProperties.ts` | Relation descriptor property behavior is distinct from endpoint/identity/statement behavior. |
| `packages/extension/src/extension/pipeline/graph/edge/` | `edges.ts`, `edgeSources.ts`, `edgeTargets.ts` | Edge construction/source/target behavior belongs in an edge subfeature. |
| `packages/extension/src/extension/pipeline/graph/packageSpecifiers/match/` | `match.ts` | Package-specifier matching is separate from name/node-id helpers. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyze/existing/` | `existingFile.ts` | Existing-file analysis should be separate from generic analyze model/results/walk. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyze/model/` | `model.ts` | Analyze model contracts should be isolated. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeCSharp/namespace/` | `namespace.ts`, `namespaceNames.ts` | C# namespace parsing/resolution is a cohesive language feature. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeGo/sourceFile/` | `file.ts`, `handlers.ts` | Use `sourceFile/`, not `file/`; this is Go source-file analysis. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/bindings/` | `bindings.ts`, `namedBindings.ts` | Import binding collection/resolution is a subfeature. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJava/sourceFile/` | `file.ts`, `handlers.ts`, `sourceInfo.ts` | Use `sourceFile/`, not `file/`; this is Java file-level analysis. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/call/` | `calls.ts`, `callImports.ts` | JavaScript call/import-call analysis belongs together. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzePython/import/` | `imports.ts`, `importFrom.ts`, `importFromNodes.ts`, `importFromPath.ts` | Python import parsing is a cohesive language feature. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/analyzeRust/bindings/` | `bindings.ts` | Rust binding extraction should be separate from file/import/path behavior. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/nodes/` | `nodes.ts` | C# index node extraction is separate from resolve/store/text/tree. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/languages/catalog/` | `catalog.ts` | Language catalog data should be separate from load/parser behavior. |
| `packages/extension/src/extension/pipeline/plugins/treesitter/runtime/projectRoots/python/` | `python.ts` | Python project-root detection is separate from Java/Rust/search/workspace bounds. |
| `packages/extension/src/extension/pipeline/service/discovery/` | `discoveryFacade.ts` | Pipeline service discovery facade is distinct from lifecycle/refresh facades. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/extension/pipeline/treesitter/csharpIndex/fixtures/` | `fixtures.ts` | Test fixtures should be separate from C# index behavior tests. |
| `packages/extension/tests/extension/pipeline/treesitter/projectRoots/workspace/` | `workspace.ts`, `workspaceBounds.test.ts` | Workspace-bound project-root behavior belongs together. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/pipeline`
- `pnpm --filter @codegraphy/extension typecheck`

### Batch 7: Core, Shared, Settings, Commands

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/src/core/discovery/file/defaults/` | `defaults.ts` | Discovery defaults should be isolated from filter/service/walk behavior. |
| `packages/extension/src/core/plugins/api/instance/runtime/access/collections/` | `collections.ts` | Collection access is one API access concern. |
| `packages/extension/src/core/plugins/decoration/contracts/` | `contracts.ts` | Decoration contracts should be separate from entries/manager. |
| `packages/extension/src/core/plugins/lifecycle/contracts/` | `contracts.ts` | Lifecycle contracts should be separate from initialize/replay. |
| `packages/extension/src/core/plugins/registry/runtime/registration/api/` | `apiSetup.ts` | Registration API setup is separate from compatibility/configure/register/unregister. |
| `packages/extension/src/core/plugins/registry/runtime/state/collection/` | `collection.ts` | Registry state collection behavior should be isolated from lifecycle/store. |
| `packages/extension/src/core/views/availability/` | `availability.ts` | View availability policy is separate from catalog/contracts/registry. |
| `packages/extension/src/core/views/depth/graph/` | `graph.ts` | Depth graph transform model is separate from limits/transform. |
| `packages/extension/src/extension/commands/definitions/` | `definitions.ts` | Command definitions should be separate from registration/navigation/export groups. |
| `packages/extension/src/extension/config/actions/` | `actions.ts` | Config actions are a subfeature separate from classify/defaults/listener/reader. |
| `packages/extension/src/extension/export/save/` | `fileSave.ts`, `pluginSave.ts`, `saveJpeg.ts`, `saveJson.ts`, `saveMarkdown.ts`, `savePng.ts`, `saveSvg.ts` | All save/export format handlers are one export save pipeline. |
| `packages/extension/src/extension/export/symbols/build/counts/` | `counts.ts` | Symbol count aggregation is separate from data/paths/relations. |
| `packages/extension/src/extension/gitHistory/analyzer/` | `analyzer.ts`, `fullCommitAnalysis.ts`, `graphConnections.ts`, `indexer.ts`, `reanalyzeGraphFile.ts` | Git-history analysis/indexing is one feature area distinct from exec/files. |
| `packages/extension/src/extension/gitHistory/diff/analysis/` | `analysis.ts` | Diff analysis should be separate from changes/snapshot/state. |
| `packages/extension/src/extension/repoSettings/store/model/changed/` | `changedKeys.ts` | Changed-key detection is one model concern. |
| `packages/extension/src/extension/workspaceFiles/editor/` | `editorSync.ts`, `visibleEditor.ts` | Editor-derived workspace file state should be separate from ignore/focused clear. |
| `packages/extension/src/shared/graphControls/defaults/definitions/` | `definitions.ts` | Graph control default definitions are separate from maps/node/edge types. |
| `packages/extension/src/shared/graphControls/packages/edges/` | `edges.ts` | Package edge control behavior is separate from nodes/roots/workspace. |
| `packages/extension/src/shared/mock/components/` | `components.ts` | Mock components should be separate from mock entry points/transforms/config. |
| `packages/extension/src/shared/settings/groups/` | `groups.ts` | Settings group definitions should be separate from modes/physics/snapshot. |

Mirror tests:

| Create folder | Move files | Why |
| --- | --- | --- |
| `packages/extension/tests/core/plugins/api/instance/runtime/access/collections/` | `collections.test.ts` | Mirrors collection access behavior. |
| `packages/extension/tests/core/plugins/decoration/manager/` | `decorationManager.edge.test.ts`, `decorationManager.node.test.ts`, `decorationManager.notifications.test.ts` | Use `manager/`, not `decoration/`; these test decoration manager behavior. |
| `packages/extension/tests/core/plugins/registry/pluginRegistry/` | `pluginRegistry.analysis.test.ts`, `pluginRegistry.collection.test.ts`, `pluginRegistry.register.test.ts`, `pluginRegistry.unregister.test.ts`, `pluginRegistry.testSupport.ts` | Use `pluginRegistry/`, not `plugin/`; these files test the registry. |
| `packages/extension/tests/core/views/registry/access/` | `get.test.ts`, `list.test.ts`, `size.test.ts` | Use `access/`, not `get/`; this covers registry read/size operations. |
| `packages/extension/tests/extension/config/actions/` | `configActions.test.ts` | Mirrors config actions source folder. |
| `packages/extension/tests/extension/export/save/` | `fileSave.test.ts`, `pluginSave.test.ts`, `saveJpeg.test.ts`, `saveJson.test.ts`, `saveMarkdown.test.ts`, `savePng.test.ts`, `saveSvg.test.ts` | Mirrors export save handlers. |
| `packages/extension/tests/extension/workspaceFiles/watcher/` | `fileSystemListeners.test.ts`, `fileWatcherSetup.test.ts`, `fileWatcherSetupMutants.test.ts` | Use `watcher/`, not `file/`; these test watcher setup/listeners. |

Targeted verification:
- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/core tests/extension/config tests/extension/export tests/extension/gitHistory tests/extension/workspaceFiles tests/shared`
- `pnpm --filter @codegraphy/extension typecheck`

## Naming Fixes To Include

These should be done as part of the move batches when touching the relevant files.

| Current path/name | Proposed change | Why |
| --- | --- | --- |
| `src/webview/components/graph/auto/` suggestion | Use `autoFit/` | `auto` is vague; the behavior is viewport fitting. |
| `src/extension/graphView/provider/webview/default/` suggestion | Use `dependencies/` | `default` is vague; the file wires default dependencies. |
| `src/webview/components/graph/interaction/node/single/` suggestion | Use `singleClick/` | The behavior is click-specific. |
| `src/webview/components/searchBar/field/alt/` suggestion | Use `keyboardShortcuts/` | Alt-key behavior is keyboard shortcut behavior. |
| `src/webview/components/settingsPanel/filters/max/` suggestion | Use `limits/` | The feature is filter limits, not generic max. |
| `src/webview/components/toolbar/actions/index/` suggestion | Use `entrypoint/` | Avoid folder name collision with index/barrel semantics. |
| `src/webview/components/legends/panel/section/built/` suggestion | Use `builtin/` | Matches existing vocabulary and avoids awkward past-tense folder name. |
| `src/webview/export/svg/shape/regular/` suggestion | Use `regularPolygon/` | The behavior is specifically regular polygon paths. |
| `src/extension/pipeline/plugins/treesitter/runtime/analyzeGo/file/` suggestion | Use `sourceFile/` | `file` is too generic. |
| `src/extension/pipeline/plugins/treesitter/runtime/analyzeJava/file/` suggestion | Use `sourceFile/` | `file` is too generic. |
| `tests/core/plugins/decoration/decoration/` suggestion | Use `manager/` | The clustered files test `decorationManager.*`. |
| `tests/core/plugins/registry/plugin/` suggestion | Use `pluginRegistry/` | The clustered files test plugin registry behavior. |
| `tests/core/views/registry/get/` suggestion | Use `access/` | Covers get/list/size, not only get. |
| `tests/extension/workspaceFiles/file/` suggestion | Use `watcher/` | The clustered files test watcher/listener setup. |

## Items To Skip Or Defer

- Do not move `docs/archive`, `examples`, or `test-fixtures` in this follow-up.
- Do not create a folder just because a single file shares a prefix. Require either clear domain value or multiple files likely to grow together.
- Do not treat public API barrels as automatically wrong. Review any barrel warning separately.
- Do not move files into `contracts/` if that creates a tiny one-file folder with no likely growth; prefer renaming the file if the surrounding folder remains clear.
- Do not use this PR to refactor behavior; keep changes to moves, import updates, and small naming corrections.

## Suggested PR Breakdown

1. `extension-organize-webview-graph`
   - Batches 1 and 2.
   - Highest impact and highest test coverage.
2. `extension-organize-webview-ui`
   - Batches 3 and 4.
   - Mostly UI/export/store moves.
3. `extension-organize-host`
   - Batches 5 and 6.
   - Extension host, pipeline, tree-sitter.
4. `extension-organize-core-shared`
   - Batch 7.
   - Lower-risk core/shared moves and mirrored tests.

## Quality Gates

After each batch:
- targeted Vitest command listed in the batch
- `pnpm --filter @codegraphy/extension typecheck`
- `pnpm run organize`

Before each PR is done:
- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run boundaries`
- `pnpm run reachability`
- `pnpm run crap`

## Unresolved Questions

- Should organize treat `contracts.ts` as a valid role file in-place, or should contract files always move into `contracts/` folders?
- Should public API barrels be exempted explicitly from organize barrel warnings?
- Should `packages/extension/src/shared/mock` be held to the same naming rules as production source?
- Do we want a package-level organize allowlist for intentionally shallow directories like plugin entrypoints?
