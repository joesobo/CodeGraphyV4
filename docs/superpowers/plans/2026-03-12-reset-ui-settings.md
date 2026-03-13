# Reset UI Settings Button — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global "Reset Settings" button to the settings panel that resets all settings to defaults, with full undo/redo support.

**Architecture:** New `ResetSettingsAction` (undoable) captures a full settings snapshot before resetting VS Code config keys to `undefined` (which reverts to `package.json` defaults). The action takes a `sendAllSettings` callback from `GraphViewProvider` to push all restored/default values to the webview in a single batch. The toolbar "Refresh Graph" icon changes from `mdiRefresh` to `mdiAutorenew`; `mdiRefresh` is reused for the reset button in the settings panel header.

**Tech Stack:** TypeScript, React, Zustand, VS Code Extension API, Vitest, @mdi/js

---

## Chunk 1: Types, Action, and Extension Wiring

### Task 1: Add message types to shared/types.ts

**Files:**
- Modify: `packages/extension/src/shared/types.ts:475-600`

- [ ] **Step 1: Add `RESET_ALL_SETTINGS` to `WebviewToExtensionMessage`**

In `packages/extension/src/shared/types.ts`, find the line:

```typescript
  | { type: 'RESET_PHYSICS_SETTINGS' }
```

Add below it:

```typescript
  | { type: 'RESET_ALL_SETTINGS'; payload: { nodeSizeMode: NodeSizeMode } }
```

- [ ] **Step 2: Add `NODE_SIZE_MODE_UPDATED` to `ExtensionToWebviewMessage`**

In `packages/extension/src/shared/types.ts`, find the line:

```typescript
  | { type: 'DAG_MODE_UPDATED'; payload: { dagMode: DagMode } }
```

Add below it:

```typescript
  | { type: 'NODE_SIZE_MODE_UPDATED'; payload: { nodeSizeMode: NodeSizeMode } }
```

- [ ] **Step 3: Add `ISettingsSnapshot` interface**

In `packages/extension/src/shared/types.ts`, add after the `IPhysicsSettings` interface (after line ~339):

```typescript
/**
 * Complete snapshot of all user-configurable settings.
 * Used by ResetSettingsAction for state-based undo/redo.
 */
export interface ISettingsSnapshot {
  physics: IPhysicsSettings;
  groups: IGroup[];
  filterPatterns: string[];
  showOrphans: boolean;
  bidirectionalMode: BidirectionalEdgeMode;
  directionMode: DirectionMode;
  directionColor: string;
  folderNodeColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  nodeSizeMode: NodeSizeMode;
}
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm run typecheck`
Expected: PASS (new types are additive, not yet consumed)

- [ ] **Step 5: Commit**

```bash
git add packages/extension/src/shared/types.ts
git commit -m "feat: add RESET_ALL_SETTINGS and ISettingsSnapshot types"
```

---

### Task 2: Create ResetSettingsAction

**Files:**
- Create: `packages/extension/src/extension/actions/ResetSettingsAction.ts`

- [ ] **Step 1: Write the unit test**

Create `packages/extension/tests/extension/actions/ResetSettingsAction.test.ts`:

```typescript
/**
 * @fileoverview Tests for ResetSettingsAction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ResetSettingsAction } from '../../../src/extension/actions/ResetSettingsAction';
import { getUndoManager, resetUndoManager } from '../../../src/extension/UndoManager';
import type { ISettingsSnapshot } from '../../../src/shared/types';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

/** Build a mock WorkspaceConfiguration that stores values in a plain object. */
function createMockConfig(store: Record<string, unknown>) {
  const get = vi.fn(<T>(key: string, defaultValue?: T): T => {
    return (key in store ? store[key] : defaultValue) as T;
  });
  const update = vi.fn(async (key: string, value: unknown) => {
    if (value === undefined) {
      delete store[key];
    } else {
      store[key] = value;
    }
  });
  const inspect = vi.fn(() => ({ workspaceValue: undefined }));
  return { get, update, inspect } as unknown as vscode.WorkspaceConfiguration;
}

describe('ResetSettingsAction', () => {
  let physicsStore: Record<string, unknown>;
  let codegraphyStore: Record<string, unknown>;
  let mockSendAllSettings: ReturnType<typeof vi.fn>;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  const NON_DEFAULT_SNAPSHOT: ISettingsSnapshot = {
    physics: { repelForce: 5, linkDistance: 200, linkForce: 0.5, damping: 0.3, centerForce: 0.5 },
    groups: [{ id: 'g1', pattern: '*.ts', color: '#FF0000' }],
    filterPatterns: ['**/*.test.ts'],
    showOrphans: false,
    bidirectionalMode: 'combined',
    directionMode: 'particles',
    directionColor: '#FF0000',
    folderNodeColor: '#00FF00',
    particleSpeed: 0.002,
    particleSize: 8,
    showLabels: false,
    nodeSizeMode: 'file-size',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetUndoManager();

    // Seed stores with non-default values
    physicsStore = {
      repelForce: 5, linkDistance: 200, linkForce: 0.5, damping: 0.3, centerForce: 0.5,
    };
    codegraphyStore = {
      groups: [{ id: 'g1', pattern: '*.ts', color: '#FF0000' }],
      filterPatterns: ['**/*.test.ts'],
      showOrphans: false,
      bidirectionalEdges: 'combined',
      directionMode: 'particles',
      directionColor: '#FF0000',
      folderNodeColor: '#00FF00',
      particleSpeed: 0.002,
      particleSize: 8,
      showLabels: false,
    };

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return createMockConfig(physicsStore);
      return createMockConfig(codegraphyStore);
    });

    mockSendAllSettings = vi.fn();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has descriptive description', () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );
    expect(action.description).toBe('Reset all settings');
  });

  it('execute resets physics config keys to undefined', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    const physicsConfig = vscode.workspace.getConfiguration('codegraphy.physics');
    // All physics keys should have been set to undefined (deleted from store)
    expect(physicsConfig.update).toHaveBeenCalledWith('repelForce', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkDistance', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkForce', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('damping', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('centerForce', undefined, vscode.ConfigurationTarget.Workspace);
  });

  it('execute resets codegraphy config keys to undefined/defaults', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    const config = vscode.workspace.getConfiguration('codegraphy');
    expect(config.update).toHaveBeenCalledWith('groups', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('filterPatterns', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showOrphans', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('bidirectionalEdges', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionMode', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionColor', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('folderNodeColor', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('particleSpeed', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('particleSize', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showLabels', undefined, vscode.ConfigurationTarget.Workspace);
  });

  it('execute calls sendAllSettings with default nodeSizeMode', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('undo restores all captured config values', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();
    vi.clearAllMocks();
    // Re-mock getConfiguration for undo calls
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return createMockConfig(physicsStore);
      return createMockConfig(codegraphyStore);
    });

    await action.undo();

    const physicsConfig = vscode.workspace.getConfiguration('codegraphy.physics');
    expect(physicsConfig.update).toHaveBeenCalledWith('repelForce', 5, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkDistance', 200, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('damping', 0.3, vscode.ConfigurationTarget.Workspace);

    const config = vscode.workspace.getConfiguration('codegraphy');
    expect(config.update).toHaveBeenCalledWith('groups', NON_DEFAULT_SNAPSHOT.groups, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showOrphans', false, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionMode', 'particles', vscode.ConfigurationTarget.Workspace);
  });

  it('undo calls sendAllSettings with original nodeSizeMode', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();
    vi.clearAllMocks();
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return createMockConfig(physicsStore);
      return createMockConfig(codegraphyStore);
    });

    await action.undo();

    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('works with UndoManager execute → undo → redo', async () => {
    const undoManager = getUndoManager();
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    // Execute via UndoManager
    await undoManager.execute(action);
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');

    vi.clearAllMocks();
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return createMockConfig(physicsStore);
      return createMockConfig(codegraphyStore);
    });

    // Undo
    const undoDesc = await undoManager.undo();
    expect(undoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');

    vi.clearAllMocks();
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return createMockConfig(physicsStore);
      return createMockConfig(codegraphyStore);
    });

    // Redo
    const redoDesc = await undoManager.redo();
    expect(redoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/actions/ResetSettingsAction.test.ts`
Expected: FAIL — `ResetSettingsAction` does not exist

- [ ] **Step 3: Implement ResetSettingsAction**

Create `packages/extension/src/extension/actions/ResetSettingsAction.ts`:

```typescript
/**
 * @fileoverview Undoable action for resetting all UI settings to defaults.
 * @module extension/actions/ResetSettingsAction
 */

import * as vscode from 'vscode';
import type { IUndoableAction } from '../UndoManager';
import type { ISettingsSnapshot, NodeSizeMode } from '../../shared/types';

/**
 * Action for resetting all settings to defaults.
 * Uses state-based undo — captures full settings snapshot before reset.
 *
 * On execute: resets all VS Code config keys to `undefined` (reverts to
 * package.json defaults) and tells the webview to reset nodeSizeMode.
 *
 * On undo: restores every captured config value and the original nodeSizeMode.
 */
export class ResetSettingsAction implements IUndoableAction {
  readonly description = 'Reset all settings';

  constructor(
    /** Full settings state captured *before* the reset. */
    private readonly _stateBefore: ISettingsSnapshot,
    /** VS Code config target (workspace vs global). */
    private readonly _configTarget: vscode.ConfigurationTarget,
    /**
     * Callback that sends all current settings to the webview.
     * Receives the nodeSizeMode to apply (webview-only state).
     */
    private readonly _sendAllSettings: (nodeSizeMode: NodeSizeMode) => void,
    /** Callback to re-analyse and re-render the graph after config changes. */
    private readonly _refreshGraph: () => Promise<void>,
  ) {}

  async execute(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;

    // Reset physics
    await physics.update('repelForce', undefined, target);
    await physics.update('linkDistance', undefined, target);
    await physics.update('linkForce', undefined, target);
    await physics.update('damping', undefined, target);
    await physics.update('centerForce', undefined, target);

    // Reset display / filter / group settings
    await config.update('groups', undefined, target);
    await config.update('filterPatterns', undefined, target);
    await config.update('showOrphans', undefined, target);
    await config.update('bidirectionalEdges', undefined, target);
    await config.update('directionMode', undefined, target);
    await config.update('directionColor', undefined, target);
    await config.update('folderNodeColor', undefined, target);
    await config.update('particleSpeed', undefined, target);
    await config.update('particleSize', undefined, target);
    await config.update('showLabels', undefined, target);

    this._sendAllSettings('connections');
    await this._refreshGraph();
  }

  async undo(): Promise<void> {
    const physics = vscode.workspace.getConfiguration('codegraphy.physics');
    const config = vscode.workspace.getConfiguration('codegraphy');
    const target = this._configTarget;
    const before = this._stateBefore;

    // Restore physics
    await physics.update('repelForce', before.physics.repelForce, target);
    await physics.update('linkDistance', before.physics.linkDistance, target);
    await physics.update('linkForce', before.physics.linkForce, target);
    await physics.update('damping', before.physics.damping, target);
    await physics.update('centerForce', before.physics.centerForce, target);

    // Restore display / filter / group settings
    await config.update('groups', before.groups, target);
    await config.update('filterPatterns', before.filterPatterns, target);
    await config.update('showOrphans', before.showOrphans, target);
    await config.update('bidirectionalEdges', before.bidirectionalMode, target);
    await config.update('directionMode', before.directionMode, target);
    await config.update('directionColor', before.directionColor, target);
    await config.update('folderNodeColor', before.folderNodeColor, target);
    await config.update('particleSpeed', before.particleSpeed, target);
    await config.update('particleSize', before.particleSize, target);
    await config.update('showLabels', before.showLabels, target);

    this._sendAllSettings(before.nodeSizeMode);
    await this._refreshGraph();
  }
}
```

- [ ] **Step 4: Export from actions/index.ts**

In `packages/extension/src/extension/actions/index.ts`, add:

```typescript
export { ResetSettingsAction } from './ResetSettingsAction';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/extension/actions/ResetSettingsAction.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/extension/src/extension/actions/ResetSettingsAction.ts \
       packages/extension/src/extension/actions/index.ts \
       packages/extension/tests/extension/actions/ResetSettingsAction.test.ts
git commit -m "feat: add ResetSettingsAction with full undo/redo support"
```

---

### Task 3: Wire up GraphViewProvider to handle RESET_ALL_SETTINGS

**Files:**
- Modify: `packages/extension/src/extension/GraphViewProvider.ts`

- [ ] **Step 1: Add imports for ResetSettingsAction, ISettingsSnapshot, and NodeSizeMode**

In `packages/extension/src/extension/GraphViewProvider.ts`, update the types import (lines 10-26) to add `NodeSizeMode` and `ISettingsSnapshot`:

```typescript
import {
  IGraphData,
  IAvailableView,
  BidirectionalEdgeMode,
  DirectionMode,
  DagMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  ISettingsSnapshot,
  ExtensionToWebviewMessage,
  WebviewToExtensionMessage,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  IPluginContextMenuItem,
  DEFAULT_DIRECTION_COLOR,
  DEFAULT_FOLDER_NODE_COLOR,
  normalizeHexColor,
} from '../shared/types';
```

Also update the actions import (line ~33-38):

```typescript
import {
  ToggleFavoriteAction,
  AddToExcludeAction,
  DeleteFilesAction,
  RenameFileAction,
  CreateFileAction,
  ResetSettingsAction,
} from './actions';
```

- [ ] **Step 2: Add `_sendAllSettings` helper method**

Add a new private method near the existing `_sendPhysicsSettings()` method (around line ~2303):

```typescript
  /**
   * Sends all current settings to the webview in a single batch.
   * Used after reset/undo to ensure the webview is fully in sync.
   * @param nodeSizeMode - The node size mode to apply (webview-only state)
   */
  private _sendAllSettings(nodeSizeMode: NodeSizeMode): void {
    const config = vscode.workspace.getConfiguration('codegraphy');
    const physicsSettings = this._getPhysicsSettings();

    this._sendMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: physicsSettings });
    this._sendMessage({ type: 'SETTINGS_UPDATED', payload: {
      bidirectionalEdges: config.get<BidirectionalEdgeMode>('bidirectionalEdges', 'separate'),
      showOrphans: config.get<boolean>('showOrphans', true),
    }});
    this._sendMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: {
      directionMode: config.get<string>('directionMode', 'arrows') as DirectionMode,
      particleSpeed: config.get<number>('particleSpeed', 0.005),
      particleSize: config.get<number>('particleSize', 4),
      directionColor: normalizeDirectionColor(config.get<string>('directionColor', DEFAULT_DIRECTION_COLOR)),
    }});
    this._sendMessage({ type: 'SHOW_LABELS_UPDATED', payload: {
      showLabels: config.get<boolean>('showLabels', true),
    }});

    const folderColor = normalizeFolderNodeColor(config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR));
    this._viewContext.folderNodeColor = folderColor;
    this._sendMessage({ type: 'FOLDER_NODE_COLOR_UPDATED', payload: { folderNodeColor: folderColor } });

    // Update internal groups state and send to webview
    this._userGroups = config.get<IGroup[]>('groups', []);
    this._computeMergedGroups();
    this._sendGroupsUpdated();

    // Update internal filter patterns and send to webview
    this._filterPatterns = config.get<string[]>('filterPatterns', []);
    this._sendMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: {
      patterns: this._filterPatterns,
      pluginPatterns: this._analyzer?.getPluginFilterPatterns() ?? [],
    }});

    // nodeSizeMode is webview-only state
    this._sendMessage({ type: 'NODE_SIZE_MODE_UPDATED', payload: { nodeSizeMode } });
  }
```

- [ ] **Step 3: Add `_captureSettingsSnapshot` helper**

Add near `_sendAllSettings`:

```typescript
  /**
   * Captures the current settings state as a snapshot.
   * @param nodeSizeMode - Current webview-only nodeSizeMode value
   */
  private _captureSettingsSnapshot(nodeSizeMode: NodeSizeMode): ISettingsSnapshot {
    const config = vscode.workspace.getConfiguration('codegraphy');
    return {
      physics: this._getPhysicsSettings(),
      groups: config.get<IGroup[]>('groups', []),
      filterPatterns: config.get<string[]>('filterPatterns', []),
      showOrphans: config.get<boolean>('showOrphans', true),
      bidirectionalMode: config.get<BidirectionalEdgeMode>('bidirectionalEdges', 'separate'),
      directionMode: config.get<string>('directionMode', 'arrows') as DirectionMode,
      directionColor: normalizeDirectionColor(config.get<string>('directionColor', DEFAULT_DIRECTION_COLOR)),
      folderNodeColor: normalizeFolderNodeColor(config.get<string>('folderNodeColor', DEFAULT_FOLDER_NODE_COLOR)),
      particleSpeed: config.get<number>('particleSpeed', 0.005),
      particleSize: config.get<number>('particleSize', 4),
      showLabels: config.get<boolean>('showLabels', true),
      nodeSizeMode,
    };
  }
```

- [ ] **Step 4: Handle `RESET_ALL_SETTINGS` message**

In the message handler switch statement in `_handleMessage` (near line ~1426 where `RESET_PHYSICS_SETTINGS` is handled), add a new case:

```typescript
        case 'RESET_ALL_SETTINGS': {
          const snapshot = this._captureSettingsSnapshot(message.payload.nodeSizeMode);
          const action = new ResetSettingsAction(
            snapshot,
            this._getConfigTarget(),
            (nodeSizeMode) => this._sendAllSettings(nodeSizeMode),
            () => this._analyzeAndSendData(),
          );
          await getUndoManager().execute(action);
          break;
        }
```

- [ ] **Step 5: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/extension/src/extension/GraphViewProvider.ts
git commit -m "feat: handle RESET_ALL_SETTINGS with undoable action in GraphViewProvider"
```

---

### Task 4: Handle NODE_SIZE_MODE_UPDATED in webview store

**Files:**
- Modify: `packages/extension/src/webview/store.ts`

- [ ] **Step 1: Add import for NodeSizeMode**

In `packages/extension/src/webview/store.ts`, `NodeSizeMode` is already imported (line 8 area). Verify it's there.

- [ ] **Step 2: Add case to handleExtensionMessage**

In the `handleExtensionMessage` switch statement (around line ~296-301 area), add a new case after `FOLDER_NODE_COLOR_UPDATED`:

```typescript
        case 'NODE_SIZE_MODE_UPDATED':
          set({ nodeSizeMode: message.payload.nodeSizeMode });
          break;
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/webview/store.ts
git commit -m "feat: handle NODE_SIZE_MODE_UPDATED in webview store"
```

---

## Chunk 2: UI Changes and Tests

### Task 5: Swap Toolbar refresh icon to mdiAutorenew

**Files:**
- Modify: `packages/extension/src/webview/components/Toolbar.tsx`

- [ ] **Step 1: Update import — replace mdiRefresh with mdiAutorenew**

In `packages/extension/src/webview/components/Toolbar.tsx` (line 6), change:

```typescript
  mdiRefresh,
```

to:

```typescript
  mdiAutorenew,
```

- [ ] **Step 2: Update the toolbar button icon and label**

Find the refresh button block (lines ~148-161):

```typescript
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
              title="Reset Graph"
            >
              <MdiIcon path={mdiRefresh} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Reset Graph</TooltipContent>
        </Tooltip>
```

Replace with:

```typescript
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-popover/80 backdrop-blur-sm"
              onClick={() => postMessage({ type: 'REFRESH_GRAPH' })}
              title="Refresh Graph"
            >
              <MdiIcon path={mdiAutorenew} size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Refresh Graph</TooltipContent>
        </Tooltip>
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/webview/components/Toolbar.tsx
git commit -m "refactor: swap toolbar refresh icon to mdiAutorenew"
```

---

### Task 6: Add reset button to SettingsPanel header

**Files:**
- Modify: `packages/extension/src/webview/components/SettingsPanel.tsx`

- [ ] **Step 1: Add mdiRefresh to imports**

In `packages/extension/src/webview/components/SettingsPanel.tsx` (line 18), add `mdiRefresh` to the `@mdi/js` import:

```typescript
import { mdiChevronRight, mdiClose, mdiDrag, mdiEyeOutline, mdiEyeOffOutline, mdiMinus, mdiPlus, mdiLockOutline, mdiRefresh } from '@mdi/js';
```

- [ ] **Step 2: Add Tooltip imports**

Add this import near the top (after the existing UI imports):

```typescript
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
```

- [ ] **Step 3: Read nodeSizeMode from store for the reset payload**

In the component body (around line ~121 where `nodeSizeMode` is already read from the store), verify it's available. It should already be there:

```typescript
  const nodeSizeMode = useGraphStore(s => s.nodeSizeMode);
```

- [ ] **Step 4: Add handleResetSettings function**

Add after the existing `handleShowLabelsChange` function (around line ~489):

```typescript
  const handleResetSettings = () => {
    postMessage({ type: 'RESET_ALL_SETTINGS', payload: { nodeSizeMode } });
  };
```

- [ ] **Step 5: Add reset button to panel header**

Find the panel header (lines ~493-499):

```typescript
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
        <span className="text-sm font-medium">Settings</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
          <MdiIcon path={mdiClose} size={16} />
        </Button>
      </div>
```

Replace with:

```typescript
      {/* Panel header */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
          <span className="text-sm font-medium">Settings</span>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleResetSettings} title="Reset Settings">
                  <MdiIcon path={mdiRefresh} size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Reset all settings to defaults</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} title="Close">
                  <MdiIcon path={mdiClose} size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/extension/src/webview/components/SettingsPanel.tsx
git commit -m "feat: add reset settings button to SettingsPanel header"
```

---

### Task 7: Add SettingsPanel reset button test

**Files:**
- Modify: `packages/extension/tests/webview/SettingsPanel.test.tsx`

- [ ] **Step 1: Add test for reset button rendering and message**

Add a new describe block at the end of the existing test file (`packages/extension/tests/webview/SettingsPanel.test.tsx`):

```typescript
// ── Reset All Settings ──────────────────────────────────────────────────────

describe('SettingsPanel: Reset All Settings', () => {
  beforeEach(() => sentMessages.length = 0);

  it('renders a reset button in the header', () => {
    renderPanel();
    const resetButton = screen.getByTitle('Reset Settings');
    expect(resetButton).toBeInTheDocument();
  });

  it('sends RESET_ALL_SETTINGS with current nodeSizeMode when clicked', () => {
    renderPanel({ nodeSizeMode: 'file-size' });
    const resetButton = screen.getByTitle('Reset Settings');
    fireEvent.click(resetButton);

    const msg = sentMessages.find(
      (m: unknown) => (m as { type: string }).type === 'RESET_ALL_SETTINGS',
    ) as { type: string; payload: { nodeSizeMode: string } } | undefined;

    expect(msg).toBeDefined();
    expect(msg!.payload.nodeSizeMode).toBe('file-size');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/extension/tests/webview/SettingsPanel.test.tsx
git commit -m "test: add SettingsPanel reset button tests"
```

---

### Task 8: Update Toolbar test for new icon label

**Files:**
- Modify: `packages/extension/tests/webview/Toolbar.test.tsx`

- [ ] **Step 1: Update "Reset Graph" references in Toolbar tests**

In `packages/extension/tests/webview/Toolbar.test.tsx`:

On line 122, update the comment:
```typescript
      // Find it by process of elimination: not in view/dag group, not title="Refresh Graph"
```

On line 174, update the title query:
```typescript
      fireEvent.click(screen.getByTitle('Refresh Graph'));
```

- [ ] **Step 2: Run the Toolbar tests**

Run: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/Toolbar.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/extension/tests/webview/Toolbar.test.tsx
git commit -m "test: update Toolbar tests for refreshed icon label"
```

---

### Task 9: Integration test — change settings, reset, undo, verify

**Files:**
- Create: `packages/extension/tests/webview/ResetSettingsFlow.test.tsx`

This test verifies the full user flow: change settings → see changes in store → click reset → store shows defaults → simulate undo → store shows original values.

- [ ] **Step 1: Write the integration test**

Create `packages/extension/tests/webview/ResetSettingsFlow.test.tsx`:

```typescript
/**
 * @fileoverview Integration test for the full reset-settings flow.
 * Verifies: change settings → reset → defaults applied → undo → original values restored.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsPanel from '../../src/webview/components/SettingsPanel';
import { graphStore } from '../../src/webview/store';
import type { IPhysicsSettings, ExtensionToWebviewMessage } from '../../src/shared/types';
import { DEFAULT_DIRECTION_COLOR, DEFAULT_FOLDER_NODE_COLOR } from '../../src/shared/types';

// Capture postMessage calls
const sentMessages: unknown[] = [];
vi.mock('../../src/webview/lib/vscodeApi', () => ({
  postMessage: (msg: unknown) => sentMessages.push(msg),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

/** Defaults matching package.json / store defaults */
const DEFAULTS = {
  physics: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 } as IPhysicsSettings,
  directionMode: 'arrows' as const,
  directionColor: DEFAULT_DIRECTION_COLOR,
  showLabels: true,
  showOrphans: true,
  bidirectionalMode: 'separate' as const,
  folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
  particleSpeed: 0.005,
  particleSize: 4,
  nodeSizeMode: 'connections' as const,
  groups: [] as unknown[],
  filterPatterns: [] as string[],
};

/** Non-default values representing user changes */
const MODIFIED = {
  physics: { repelForce: 3, linkDistance: 300, linkForce: 0.8, damping: 0.2, centerForce: 0.9 } as IPhysicsSettings,
  directionMode: 'particles' as const,
  directionColor: '#FF0000',
  showLabels: false,
  showOrphans: false,
  bidirectionalMode: 'combined' as const,
  folderNodeColor: '#00FF00',
  particleSpeed: 0.001,
  particleSize: 10,
  nodeSizeMode: 'file-size' as const,
  groups: [{ id: 'g1', pattern: '*.ts', color: '#3B82F6' }],
  filterPatterns: ['**/*.test.ts'],
};

/** Helper to simulate an extension message arriving */
function simulateExtensionMessage(msg: ExtensionToWebviewMessage) {
  graphStore.getState().handleExtensionMessage(msg);
}

function setModifiedState() {
  graphStore.setState({
    physicsSettings: MODIFIED.physics,
    groups: MODIFIED.groups,
    filterPatterns: MODIFIED.filterPatterns,
    pluginFilterPatterns: [],
    showOrphans: MODIFIED.showOrphans,
    nodeSizeMode: MODIFIED.nodeSizeMode,
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    depthLimit: 1,
    directionMode: MODIFIED.directionMode,
    directionColor: MODIFIED.directionColor,
    particleSpeed: MODIFIED.particleSpeed,
    particleSize: MODIFIED.particleSize,
    showLabels: MODIFIED.showLabels,
    graphMode: '2d',
    maxFiles: 500,
    bidirectionalMode: MODIFIED.bidirectionalMode,
    folderNodeColor: MODIFIED.folderNodeColor,
  });
}

describe('Reset Settings Flow: change → reset → undo', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('user changes settings, clicks reset, then undoes reset', () => {
    // ── STEP 1: Start with modified (non-default) settings ─────────────────
    setModifiedState();
    const onClose = vi.fn();
    render(<SettingsPanel isOpen={true} onClose={onClose} />);

    // Verify store reflects the modified settings
    let state = graphStore.getState();
    expect(state.physicsSettings.repelForce).toBe(3);
    expect(state.directionMode).toBe('particles');
    expect(state.showLabels).toBe(false);
    expect(state.showOrphans).toBe(false);
    expect(state.nodeSizeMode).toBe('file-size');
    expect(state.groups).toHaveLength(1);
    expect(state.filterPatterns).toEqual(['**/*.test.ts']);

    // ── STEP 2: Click the Reset button ─────────────────────────────────────
    const resetButton = screen.getByTitle('Reset Settings');
    fireEvent.click(resetButton);

    // Verify RESET_ALL_SETTINGS was sent with current nodeSizeMode
    const resetMsg = sentMessages.find(
      (m: unknown) => (m as { type: string }).type === 'RESET_ALL_SETTINGS',
    ) as { type: string; payload: { nodeSizeMode: string } } | undefined;
    expect(resetMsg).toBeDefined();
    expect(resetMsg!.payload.nodeSizeMode).toBe('file-size');

    // ── STEP 3: Simulate extension responding with default settings ────────
    // (In real flow, ResetSettingsAction calls _sendAllSettings + _analyzeAndSendData)
    act(() => {
      simulateExtensionMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: DEFAULTS.physics });
      simulateExtensionMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges: DEFAULTS.bidirectionalMode, showOrphans: DEFAULTS.showOrphans } });
      simulateExtensionMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: {
        directionMode: DEFAULTS.directionMode,
        particleSpeed: DEFAULTS.particleSpeed,
        particleSize: DEFAULTS.particleSize,
        directionColor: DEFAULTS.directionColor,
      }});
      simulateExtensionMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels: DEFAULTS.showLabels } });
      simulateExtensionMessage({ type: 'FOLDER_NODE_COLOR_UPDATED', payload: { folderNodeColor: DEFAULTS.folderNodeColor } });
      simulateExtensionMessage({ type: 'GROUPS_UPDATED', payload: { groups: [] } });
      simulateExtensionMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: [], pluginPatterns: [] } });
      simulateExtensionMessage({ type: 'NODE_SIZE_MODE_UPDATED', payload: { nodeSizeMode: 'connections' } });
    });

    // Verify store now has defaults
    state = graphStore.getState();
    expect(state.physicsSettings).toEqual(DEFAULTS.physics);
    expect(state.directionMode).toBe('arrows');
    expect(state.showLabels).toBe(true);
    expect(state.showOrphans).toBe(true);
    expect(state.nodeSizeMode).toBe('connections');
    expect(state.groups).toEqual([]);
    expect(state.filterPatterns).toEqual([]);
    expect(state.bidirectionalMode).toBe('separate');
    expect(state.folderNodeColor).toBe(DEFAULT_FOLDER_NODE_COLOR);

    // ── STEP 4: Simulate Undo — extension sends back original values ───────
    act(() => {
      simulateExtensionMessage({ type: 'PHYSICS_SETTINGS_UPDATED', payload: MODIFIED.physics });
      simulateExtensionMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges: MODIFIED.bidirectionalMode, showOrphans: MODIFIED.showOrphans } });
      simulateExtensionMessage({ type: 'DIRECTION_SETTINGS_UPDATED', payload: {
        directionMode: MODIFIED.directionMode,
        particleSpeed: MODIFIED.particleSpeed,
        particleSize: MODIFIED.particleSize,
        directionColor: MODIFIED.directionColor,
      }});
      simulateExtensionMessage({ type: 'SHOW_LABELS_UPDATED', payload: { showLabels: MODIFIED.showLabels } });
      simulateExtensionMessage({ type: 'FOLDER_NODE_COLOR_UPDATED', payload: { folderNodeColor: MODIFIED.folderNodeColor } });
      simulateExtensionMessage({ type: 'GROUPS_UPDATED', payload: { groups: MODIFIED.groups } });
      simulateExtensionMessage({ type: 'FILTER_PATTERNS_UPDATED', payload: { patterns: MODIFIED.filterPatterns, pluginPatterns: [] } });
      simulateExtensionMessage({ type: 'NODE_SIZE_MODE_UPDATED', payload: { nodeSizeMode: MODIFIED.nodeSizeMode } });
    });

    // Verify store is back to the modified (pre-reset) values
    state = graphStore.getState();
    expect(state.physicsSettings).toEqual(MODIFIED.physics);
    expect(state.directionMode).toBe('particles');
    expect(state.showLabels).toBe(false);
    expect(state.showOrphans).toBe(false);
    expect(state.nodeSizeMode).toBe('file-size');
    expect(state.groups).toHaveLength(1);
    expect(state.filterPatterns).toEqual(['**/*.test.ts']);
    expect(state.bidirectionalMode).toBe('combined');
    expect(state.folderNodeColor).toBe('#00FF00');
    expect(state.directionColor).toBe('#FF0000');
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts tests/webview/ResetSettingsFlow.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/extension/tests/webview/ResetSettingsFlow.test.tsx
git commit -m "test: add integration test for reset → undo settings flow"
```

---

### Task 10: Run full test suite and typecheck

- [ ] **Step 1: Run typecheck**

Run: `pnpm run typecheck`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `pnpm run test`
Expected: All tests PASS

- [ ] **Step 3: Run lint**

Run: `pnpm run lint`
Expected: PASS (fix any issues if found)

- [ ] **Step 4: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix: address lint/type issues from reset settings feature"
```
