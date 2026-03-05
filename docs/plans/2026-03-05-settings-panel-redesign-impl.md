# Settings Panel Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the floating PhysicsSettings panel and header ViewSwitcher with a single 4-section accordion settings panel (Forces / Groups / Filters / Display), add a groups color system that makes all nodes grey by default, and surface filter patterns as an extension-side exclude list.

**Architecture:** Groups are client-side (webview applies `minimatch` color overrides, no re-analysis). Filter patterns are extension-side (merged with hardcoded excludes in `WorkspaceAnalyzer`, triggers re-analysis on change). Both persist to workspace state with VS Code settings as the priority override layer.

**Tech Stack:** React + Tailwind, Vis Network, VS Code extension API, `minimatch` (already a dep), `crypto.randomUUID()`

**Design doc:** `docs/plans/2026-03-05-settings-panel-redesign.md`

---

### Task 1: Add `IGroup` and new message types to `shared/types.ts`

**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/shared/types.test.ts`

**Step 1: Write the failing test**

Open `tests/shared/types.test.ts` and add at the bottom:

```typescript
describe('IGroup', () => {
  it('should be a valid interface with required fields', () => {
    const group: IGroup = { id: 'abc', pattern: 'src/**', color: '#3B82F6' };
    expect(group.id).toBe('abc');
    expect(group.pattern).toBe('src/**');
    expect(group.color).toBe('#3B82F6');
  });
});
```

You'll also need to import `IGroup` at the top of the test file:
```typescript
import { ..., IGroup } from '../../src/shared/types';
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/shared/types.test.ts
```
Expected: FAIL — `IGroup` is not exported

**Step 3: Add `IGroup` to `src/shared/types.ts`**

Add after the `IPhysicsSettings` interface (around line 255):

```typescript
/**
 * A user-defined color group — matches files by glob pattern and assigns a color.
 */
export interface IGroup {
  /** Unique identifier (crypto.randomUUID()) */
  id: string;
  /** Glob pattern, e.g. "src/**", "*.test.ts" */
  pattern: string;
  /** Hex color string, e.g. "#3B82F6" */
  color: string;
}
```

**Step 4: Add new message types**

In `ExtensionToWebviewMessage`, add two new variants:
```typescript
  | { type: 'GROUPS_UPDATED'; payload: { groups: IGroup[] } }
  | { type: 'FILTER_PATTERNS_UPDATED'; payload: { patterns: string[] } }
```

In `WebviewToExtensionMessage`, add:
```typescript
  | { type: 'UPDATE_GROUPS'; payload: { groups: IGroup[] } }
  | { type: 'UPDATE_FILTER_PATTERNS'; payload: { patterns: string[] } }
  | { type: 'UPDATE_SHOW_ORPHANS'; payload: { show: boolean } }
```

Also update `SETTINGS_UPDATED` in `ExtensionToWebviewMessage` to include `showOrphans`:
```typescript
  | { type: 'SETTINGS_UPDATED'; payload: { bidirectionalEdges: BidirectionalEdgeMode; showOrphans: boolean } }
```

Remove `nodeSizeMode` from `IGraphData` — delete the line:
```typescript
  /** Node sizing mode setting */
  nodeSizeMode?: NodeSizeMode;
```

**Step 5: Run tests to verify passing**

```bash
npm test -- tests/shared/types.test.ts
```
Expected: PASS. Then run `npm run typecheck` — it will show errors in Graph.tsx and WorkspaceAnalyzer referencing `data.nodeSizeMode`. That is expected and will be fixed in later tasks.

**Step 6: Commit**

```bash
git add src/shared/types.ts tests/shared/types.test.ts
git commit -m "feat: add IGroup type and settings panel message types"
```

---

### Task 2: Update `package.json` contributions

**Files:**
- Modify: `package.json`

No test for this task — verified by `npm run typecheck` at end.

**Step 1: Remove deprecated settings from `package.json`**

In the `contributes.configuration.properties` section, delete the entire blocks for:
- `codegraphy.exclude`
- `codegraphy.fileColors`
- `codegraphy.nodeSizeBy`

**Step 2: Add new settings**

Add these two property blocks in the same section:

```json
"codegraphy.groups": {
  "type": "array",
  "default": [],
  "description": "Color groups for matching files. Each entry has a glob pattern and a hex color. Takes priority over workspace state groups.",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "pattern": { "type": "string" },
      "color": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" }
    }
  }
},
"codegraphy.filterPatterns": {
  "type": "array",
  "items": { "type": "string" },
  "default": [],
  "description": "Glob patterns for files to exclude from the graph (applied at discovery). Replaces codegraphy.exclude."
}
```

**Step 3: Verify**

```bash
npm run typecheck
```
Expected: same errors as before (Graph.tsx, WorkspaceAnalyzer) — no new errors from package.json.

**Step 4: Commit**

```bash
git add package.json
git commit -m "chore: update package.json — remove fileColors/exclude/nodeSizeBy, add groups/filterPatterns"
```

---

### Task 3: Update `Configuration.ts`

**Files:**
- Modify: `src/extension/Configuration.ts`
- Modify: `tests/extension/Configuration.test.ts`

**Step 1: Update the failing tests first**

Open `tests/extension/Configuration.test.ts`. The test for `exclude`, `fileColors`, and `nodeSizeBy` getters need to be removed since those settings are being deleted. Also update `getAll()` tests.

Remove these test cases:
- `'should return default exclude patterns'` (tests `config.exclude`)
- `'should return default fileColors as empty object'` (if present)
- `'should return nodeSizeBy as connections'` (if present)
- Any `getAll()` test that checks for `exclude`, `fileColors`, or `nodeSizeBy` in the returned object

In the `beforeEach` `mockConfig`, remove `exclude`, `fileColors` keys.

Update the `ICodeGraphyConfig` import check if there is one.

Add a test that `DEFAULT_EXCLUDE_PATTERNS` is exported and non-empty:
```typescript
it('should export DEFAULT_EXCLUDE_PATTERNS with node_modules excluded', () => {
  expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/node_modules/**');
  expect(DEFAULT_EXCLUDE_PATTERNS.length).toBeGreaterThan(0);
});
```

**Step 2: Run tests to confirm they fail for the right reason**

```bash
npm test -- tests/extension/Configuration.test.ts
```

**Step 3: Update `src/extension/Configuration.ts`**

In `ICodeGraphyConfig`, remove the fields:
```typescript
// DELETE these three lines:
  exclude: string[];
  fileColors: Record<string, string>;
  nodeSizeBy: NodeSizeMode;
```

Remove the `NodeSizeMode` import from line 8 (no longer needed here).

Remove the getter methods:
- Delete `get exclude(): string[]` block (lines ~99-101)
- Delete `get fileColors(): Record<string, string>` block (lines ~142-144)
- Delete `get nodeSizeBy(): NodeSizeMode` block (lines ~151-153)

Update `getAll()` to remove those three fields from the returned object:
```typescript
getAll(): ICodeGraphyConfig {
  return {
    maxFiles: this.maxFiles,
    include: this.include,
    respectGitignore: this.respectGitignore,
    showOrphans: this.showOrphans,
    bidirectionalEdges: this.bidirectionalEdges,
    plugins: this.plugins,
  };
}
```

Keep `DEFAULT_EXCLUDE_PATTERNS` exported — it's referenced by tests and will be used directly by `WorkspaceAnalyzer`.

**Step 4: Run tests**

```bash
npm test -- tests/extension/Configuration.test.ts
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/extension/Configuration.ts tests/extension/Configuration.test.ts
git commit -m "refactor: remove fileColors/exclude/nodeSizeBy from Configuration"
```

---

### Task 4: Update `WorkspaceAnalyzer`

**Files:**
- Modify: `src/extension/WorkspaceAnalyzer.ts`

**Step 1: Update `analyze()` to accept filter patterns**

Change the signature of `analyze()`:
```typescript
async analyze(filterPatterns: string[] = []): Promise<IGraphData>
```

At the top of `analyze()`, replace the block that builds `mergedExclude`:
```typescript
// OLD — remove these lines:
const pluginExcludes = this._collectPluginExcludes();
const mergedExclude = [...new Set([...pluginExcludes, ...config.exclude])];

// NEW — replace with:
const pluginExcludes = this._collectPluginExcludes();
const mergedExclude = [...new Set([
  ...DEFAULT_EXCLUDE_PATTERNS,
  ...pluginExcludes,
  ...filterPatterns,
])];
```

Add the import for `DEFAULT_EXCLUDE_PATTERNS` at the top of the file:
```typescript
import { Configuration, DEFAULT_EXCLUDE_PATTERNS } from './Configuration';
```

**Step 2: Remove color palette from `_buildGraphData`**

In `_buildGraphData()`, find the line:
```typescript
const color = this._colorPalette.getColorForFile(filePath);
```

Replace it with:
```typescript
const color = DEFAULT_NODE_COLOR;
```

Add the `DEFAULT_NODE_COLOR` import — it's already in `shared/types.ts`:
```typescript
import { IGraphData, IGraphNode, IGraphEdge, DEFAULT_NODE_COLOR } from '../shared/types';
```

**Step 3: Remove `nodeSizeMode` from returned graph data**

In `_buildGraphData()`, the return statement currently includes `nodeSizeMode`. Change:
```typescript
// OLD:
return { nodes, edges: filteredEdges, nodeSizeMode };

// NEW:
return { nodes, edges: filteredEdges };
```

Also remove the line that reads `nodeSizeMode` from config:
```typescript
// DELETE:
const nodeSizeMode = this._config.nodeSizeBy;
```

**Step 4: Remove color palette setup from `analyze()`**

In `analyze()`, delete these three lines (color palette setup is no longer needed for default colors):
```typescript
// DELETE these lines:
const extensions = discoveryResult.files.map(f => path.extname(f.relativePath).toLowerCase());
this._colorPalette.generateForExtensions(extensions);
this._colorPalette.setUserColors(config.fileColors);
```

You can also remove `config.fileColors` usage since `getAll()` no longer returns it. The `_colorPalette` field and `ColorPaletteManager` import can stay (for future use in group color suggestions) — just don't call it during analysis.

**Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: errors only in Graph.tsx (still uses `data.nodeSizeMode`) — fixed in Task 6.

**Step 6: Run tests**

```bash
npm test
```
Expected: most tests pass. Some plugin integration tests may fail if they check returned node colors — update any that assert `color !== DEFAULT_NODE_COLOR` to accept `DEFAULT_NODE_COLOR`.

**Step 7: Commit**

```bash
git add src/extension/WorkspaceAnalyzer.ts
git commit -m "refactor: use DEFAULT_NODE_COLOR for all nodes, accept filterPatterns in analyze()"
```

---

### Task 5: Update `GraphViewProvider`

**Files:**
- Modify: `src/extension/GraphViewProvider.ts`
- Test: `tests/extension/GraphViewProvider.test.ts`

**Step 1: Write failing tests**

Open `tests/extension/GraphViewProvider.test.ts`. Add a new describe block:

```typescript
describe('Groups and filter patterns', () => {
  it('should save groups to workspace state on UPDATE_GROUPS', async () => {
    let savedKey = '';
    let savedValue: unknown;
    mockContext.workspaceState.update = vi.fn((key, value) => {
      savedKey = key;
      savedValue = value;
      return Promise.resolve();
    });

    provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );

    const groups = [{ id: '1', pattern: 'src/**', color: '#3B82F6' }];
    await (provider as unknown as { _handleMessage: (m: unknown) => Promise<void> })
      ._handleMessage?.({ type: 'UPDATE_GROUPS', payload: { groups } });

    expect(savedKey).toBe('codegraphy.groups');
    expect(savedValue).toEqual(groups);
  });
});
```

Note: `_setWebviewMessageListener` is private, but we can test it indirectly via the existing mock pattern in the test file. Look at how existing tests call message handlers and follow the same pattern.

**Step 2: Run to confirm failure**

```bash
npm test -- tests/extension/GraphViewProvider.test.ts
```

**Step 3: Add new storage keys**

At the top of `GraphViewProvider.ts`, add after the existing storage key constants:
```typescript
const GROUPS_KEY = 'codegraphy.groups';
const FILTER_PATTERNS_KEY = 'codegraphy.filterPatterns';
```

**Step 4: Add helper methods to `GraphViewProvider`**

Add these two private methods (place them near `_sendSettings()`):

```typescript
private _getGroups(): IGroup[] {
  const settingsGroups = vscode.workspace
    .getConfiguration('codegraphy')
    .get<IGroup[]>('groups', []);
  if (settingsGroups.length > 0) return settingsGroups;
  return this._context.workspaceState.get<IGroup[]>(GROUPS_KEY) ?? [];
}

private _getFilterPatterns(): string[] {
  const settingsPatterns = vscode.workspace
    .getConfiguration('codegraphy')
    .get<string[]>('filterPatterns', []);
  if (settingsPatterns.length > 0) return settingsPatterns;
  return this._context.workspaceState.get<string[]>(FILTER_PATTERNS_KEY) ?? [];
}

private _sendGroups(): void {
  this._sendMessage({ type: 'GROUPS_UPDATED', payload: { groups: this._getGroups() } });
}

private _sendFilterPatterns(): void {
  this._sendMessage({
    type: 'FILTER_PATTERNS_UPDATED',
    payload: { patterns: this._getFilterPatterns() },
  });
}
```

**Step 5: Update `_sendSettings()` to include `showOrphans`**

Find `_sendSettings()` and update:
```typescript
private _sendSettings(): void {
  const config = vscode.workspace.getConfiguration('codegraphy');
  const bidirectionalEdges = config.get<BidirectionalEdgeMode>('bidirectionalEdges', 'separate');
  const showOrphans = config.get<boolean>('showOrphans', true);
  this._sendMessage({ type: 'SETTINGS_UPDATED', payload: { bidirectionalEdges, showOrphans } });
}
```

**Step 6: Update `_analyzeAndSendData()` to pass filter patterns to analyze()**

Find the line:
```typescript
this._rawGraphData = await this._analyzer.analyze();
```
Change to:
```typescript
this._rawGraphData = await this._analyzer.analyze(this._getFilterPatterns());
```

**Step 7: Add new message handlers to `_setWebviewMessageListener()`**

In the `switch` statement, add these cases (place them after `REFRESH_GRAPH`):

```typescript
case 'UPDATE_GROUPS': {
  await this._context.workspaceState.update(GROUPS_KEY, message.payload.groups);
  this._sendGroups();
  break;
}

case 'UPDATE_FILTER_PATTERNS': {
  await this._context.workspaceState.update(FILTER_PATTERNS_KEY, message.payload.patterns);
  this._sendFilterPatterns();
  await this._analyzeAndSendData();
  break;
}

case 'UPDATE_SHOW_ORPHANS': {
  const config = vscode.workspace.getConfiguration('codegraphy');
  const target = vscode.workspace.workspaceFolders?.length
    ? vscode.ConfigurationTarget.Workspace
    : vscode.ConfigurationTarget.Global;
  await config.update('showOrphans', message.payload.show, target);
  // Config change listener handles re-analysis
  break;
}
```

**Step 8: Update `WEBVIEW_READY` handler to send groups and filter patterns**

Find the `WEBVIEW_READY` case and add:
```typescript
case 'WEBVIEW_READY':
  this._analyzeAndSendData();
  this._sendFavorites();
  this._sendSettings();
  this._sendPhysicsSettings();
  this._sendGroups();        // ADD
  this._sendFilterPatterns(); // ADD
  break;
```

**Step 9: Add `IGroup` to the imports at the top of the file**

```typescript
import {
  IGraphData,
  IGroup,           // ADD
  IAvailableView,
  // ... rest unchanged
} from '../shared/types';
```

**Step 10: Run tests**

```bash
npm test -- tests/extension/GraphViewProvider.test.ts
```
Expected: PASS (adjust the new test if the message handler access pattern differs from what's writable — look at how existing tests invoke message handlers).

**Step 11: Commit**

```bash
git add src/extension/GraphViewProvider.ts tests/extension/GraphViewProvider.test.ts
git commit -m "feat: add groups and filter pattern storage and messaging to GraphViewProvider"
```

---

### Task 6: Update `Graph.tsx` — add `nodeSizeMode` prop

**Files:**
- Modify: `src/webview/components/Graph.tsx`
- Test: `tests/webview/Graph.test.tsx`

**Step 1: Add `nodeSizeMode` to `GraphProps`**

Find the `GraphProps` interface (around line 35) and add:
```typescript
interface GraphProps {
  data: IGraphData;
  favorites?: Set<string>;
  onFavoritesChange?: (favorites: Set<string>) => void;
  theme?: ThemeKind;
  bidirectionalMode?: BidirectionalEdgeMode;
  physicsSettings?: IPhysicsSettings;
  nodeSizeMode?: NodeSizeMode;  // ADD
}
```

**Step 2: Destructure the new prop in the component function**

Find the component function signature and add `nodeSizeMode = 'connections'`:
```typescript
export default function Graph({
  data,
  favorites,
  onFavoritesChange,
  theme,
  bidirectionalMode,
  physicsSettings,
  nodeSizeMode = 'connections',  // ADD with default
}: GraphProps): React.ReactElement {
```

**Step 3: Replace all `data.nodeSizeMode` references**

`data.nodeSizeMode` appears in 7 places in Graph.tsx (lines ~540, 749, 886, 1004, 1056, 1063, 1148). Replace every occurrence of `data.nodeSizeMode ?? 'connections'` with just `nodeSizeMode`. Replace any occurrence of `data.nodeSizeMode` alone with `nodeSizeMode`. Check line 1063 — it's likely in a `useEffect` dependency array; change `data.nodeSizeMode` to `nodeSizeMode` there too.

Verify with:
```bash
grep -n "data\.nodeSizeMode" src/webview/components/Graph.tsx
```
Expected: no output (all replaced).

**Step 4: Run typecheck**

```bash
npm run typecheck
```
Expected: clean — `IGraphData.nodeSizeMode` was removed in Task 1 so there are no remaining references to it.

**Step 5: Run tests**

```bash
npm test -- tests/webview/Graph.test.tsx
```
Expected: PASS (existing tests don't pass `nodeSizeMode` so the default `'connections'` applies).

**Step 6: Commit**

```bash
git add src/webview/components/Graph.tsx
git commit -m "refactor: move nodeSizeMode from graph data to direct Graph prop"
```

---

### Task 7: Update `App.tsx`

**Files:**
- Modify: `src/webview/App.tsx`
- Test: `tests/webview/App.test.tsx`

**Step 1: Write failing tests**

Open `tests/webview/App.test.tsx`. Add:

```typescript
it('should apply group colors when GROUPS_UPDATED received', async () => {
  render(<App />);

  // First send graph data with grey nodes
  await act(async () => {
    messageListeners.forEach(l => l(new MessageEvent('message', {
      data: {
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'src/App.ts', label: 'App.ts', color: '#A1A1AA' }],
          edges: [],
        },
      },
    })));
  });

  // Then send a group that should color src/ files blue
  await act(async () => {
    messageListeners.forEach(l => l(new MessageEvent('message', {
      data: {
        type: 'GROUPS_UPDATED',
        payload: { groups: [{ id: '1', pattern: 'src/**', color: '#3B82F6' }] },
      },
    })));
  });

  // The graph receives coloredData — we can't easily inspect the Graph prop
  // but we can verify no crash and loading state is gone
  expect(screen.queryByText('Loading graph...')).not.toBeInTheDocument();
});
```

**Step 2: Run to confirm structure is valid**

```bash
npm test -- tests/webview/App.test.tsx
```

**Step 3: Add new state and imports to `App.tsx`**

At the top, add the `minimatch` import:
```typescript
import { minimatch } from 'minimatch';
```

Add `IGroup` to the shared types import:
```typescript
import { IGraphData, IGraphNode, IAvailableView, BidirectionalEdgeMode, IPhysicsSettings, IGroup, ExtensionToWebviewMessage } from '../shared/types';
```

Remove `NodeSizeMode` from the import if it was there (it's still in shared/types, just add it):
```typescript
import { ..., NodeSizeMode, IGroup, ... } from '../shared/types';
```

Add new state inside the `App` component function (after the existing `const [depthLimit, ...]`):
```typescript
const [groups, setGroups] = useState<IGroup[]>([]);
const [filterPatterns, setFilterPatterns] = useState<string[]>([]);
const [nodeSizeMode, setNodeSizeMode] = useState<NodeSizeMode>('connections');
const [showOrphans, setShowOrphans] = useState(true);
```

**Step 4: Add new message handlers to the `switch` in `useEffect`**

```typescript
case 'GROUPS_UPDATED':
  setGroups(message.payload.groups);
  break;
case 'FILTER_PATTERNS_UPDATED':
  setFilterPatterns(message.payload.patterns);
  break;
case 'SETTINGS_UPDATED':
  setBidirectionalMode(message.payload.bidirectionalEdges);
  setShowOrphans(message.payload.showOrphans);  // ADD
  break;
```

**Step 5: Add `coloredData` memo**

Add this `useMemo` after the existing `filteredData` memo:

```typescript
const coloredData = useMemo((): IGraphData | null => {
  if (!filteredData) return null;
  if (groups.length === 0) return filteredData;
  return {
    ...filteredData,
    nodes: filteredData.nodes.map(node => {
      const match = groups.find(g => minimatch(node.id, g.pattern));
      return match ? { ...node, color: match.color } : node;
    }),
  };
}, [filteredData, groups]);
```

**Step 6: Update the JSX**

In the header `div`, remove `<ViewSwitcher ... />` and `<DepthSlider ... />`. The header should now only contain `<SearchBar ... />`:

```tsx
<div className="flex-shrink-0 p-2 border-b border-[var(--vscode-panel-border,#3c3c3c)] flex items-center gap-2">
  <div className="flex-1">
    <SearchBar
      value={searchQuery}
      onChange={setSearchQuery}
      options={searchOptions}
      onOptionsChange={handleSearchOptionsChange}
      resultCount={filteredData?.nodes.length}
      totalCount={graphData.nodes.length}
      placeholder="Search files... (Ctrl+F)"
      regexError={regexError}
    />
  </div>
</div>
```

Update the `<Graph>` call to pass `nodeSizeMode` and use `coloredData`:
```tsx
<Graph
  data={coloredData || graphData}
  favorites={favorites}
  theme={theme}
  bidirectionalMode={bidirectionalMode}
  physicsSettings={physicsSettings}
  nodeSizeMode={nodeSizeMode}
/>
```

Replace `<PhysicsSettings ... />` with `<SettingsPanel ... />` — this component doesn't exist yet, so temporarily keep `<PhysicsSettings ... />` until Task 11.

Remove unused imports: `ViewSwitcher`, `DepthSlider`.

**Step 7: Run tests**

```bash
npm test -- tests/webview/App.test.tsx
```
Expected: PASS

**Step 8: Commit**

```bash
git add src/webview/App.tsx tests/webview/App.test.tsx
git commit -m "feat: add groups/filters state and coloredData memo to App"
```

---

### Task 8: `SettingsPanel` — shell and Forces section

**Files:**
- Create: `src/webview/components/SettingsPanel.tsx`
- Create: `tests/webview/SettingsPanel.test.tsx`

**Step 1: Write failing tests**

Create `tests/webview/SettingsPanel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPanel from '../../src/webview/components/SettingsPanel';
import { IGroup, IPhysicsSettings, NodeSizeMode, IAvailableView } from '../../src/shared/types';

const DEFAULT_PHYSICS: IPhysicsSettings = {
  gravitationalConstant: -50,
  springLength: 100,
  springConstant: 0.08,
  damping: 0.4,
  centralGravity: 0.01,
};

const defaultProps = {
  physicsSettings: DEFAULT_PHYSICS,
  onPhysicsSettingChange: vi.fn(),
  onPhysicsReset: vi.fn(),
  groups: [] as IGroup[],
  onGroupsChange: vi.fn(),
  filterPatterns: [] as string[],
  onFilterPatternsChange: vi.fn(),
  showOrphans: true,
  onShowOrphansChange: vi.fn(),
  nodeSizeMode: 'connections' as NodeSizeMode,
  onNodeSizeModeChange: vi.fn(),
  availableViews: [] as IAvailableView[],
  activeViewId: 'codegraphy.connections',
  onViewChange: vi.fn(),
  depthLimit: 1,
  onDepthLimitChange: vi.fn(),
};

describe('SettingsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the gear button when collapsed', () => {
    render(<SettingsPanel {...defaultProps} />);
    expect(screen.getByTitle('Settings')).toBeInTheDocument();
  });

  it('shows all four sections when opened', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Settings'));
    expect(screen.getByText('Forces')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
  });

  it('toggles a section open on click', () => {
    render(<SettingsPanel {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Settings'));
    // Forces section content should be hidden initially
    expect(screen.queryByText('Gravity')).not.toBeInTheDocument();
    // Click Forces to open it
    fireEvent.click(screen.getByText('Forces'));
    expect(screen.getByText('Gravity')).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify it fails**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```
Expected: FAIL — module not found

**Step 3: Create `src/webview/components/SettingsPanel.tsx`**

```tsx
import React, { useState } from 'react';
import { IGroup, IPhysicsSettings, NodeSizeMode, IAvailableView } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';

// ── Props ────────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
  physicsSettings: IPhysicsSettings;
  onPhysicsSettingChange: (key: keyof IPhysicsSettings, value: number) => void;
  onPhysicsReset: () => void;
  groups: IGroup[];
  onGroupsChange: (groups: IGroup[]) => void;
  filterPatterns: string[];
  onFilterPatternsChange: (patterns: string[]) => void;
  showOrphans: boolean;
  onShowOrphansChange: (show: boolean) => void;
  nodeSizeMode: NodeSizeMode;
  onNodeSizeModeChange: (mode: NodeSizeMode) => void;
  availableViews: IAvailableView[];
  activeViewId: string;
  onViewChange: (viewId: string) => void;
  depthLimit: number;
  onDepthLimitChange: (limit: number) => void;
}

// ── Accordion ────────────────────────────────────────────────────────────────

function AccordionSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-zinc-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:text-zinc-200"
      >
        {title}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// ── Forces ───────────────────────────────────────────────────────────────────

const SLIDERS: { key: keyof IPhysicsSettings; label: string; min: number; max: number; step: number }[] = [
  { key: 'gravitationalConstant', label: 'Gravity',       min: -500, max: 0,   step: 10   },
  { key: 'springLength',          label: 'Link Distance', min: 10,   max: 500, step: 10   },
  { key: 'springConstant',        label: 'Link Strength', min: 0.01, max: 1,   step: 0.01 },
  { key: 'centralGravity',        label: 'Center Pull',   min: 0,    max: 1,   step: 0.01 },
  { key: 'damping',               label: 'Damping',       min: 0,    max: 1,   step: 0.05 },
];

function ForcesSection({
  settings,
  onChange,
  onReset,
}: {
  settings: IPhysicsSettings;
  onChange: (key: keyof IPhysicsSettings, value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-3">
      {SLIDERS.map(({ key, label, min, max, step }) => (
        <div key={key} className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-300">{label}</label>
            <span className="text-xs text-zinc-500 font-mono">
              {(settings[key] as number).toFixed(step < 1 ? 2 : 0)}
            </span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={settings[key]}
            onChange={e => onChange(key, parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      ))}
      <button
        onClick={onReset}
        className="w-full text-xs text-zinc-400 hover:text-zinc-200 py-1.5 border border-zinc-600 rounded hover:border-zinc-500 transition-colors"
      >
        Reset to Defaults
      </button>
    </div>
  );
}

// ── Main component (stub — Groups/Filters/Display added in Tasks 9–11) ───────

export default function SettingsPanel({
  physicsSettings,
  onPhysicsSettingChange,
  onPhysicsReset,
  groups,
  onGroupsChange,
  filterPatterns,
  onFilterPatternsChange,
  showOrphans,
  onShowOrphansChange,
  nodeSizeMode,
  onNodeSizeModeChange,
  availableViews,
  activeViewId,
  onViewChange,
  depthLimit,
  onDepthLimitChange,
}: SettingsPanelProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  // Suppress unused-variable warnings for props filled in later tasks
  void groups; void onGroupsChange; void filterPatterns; void onFilterPatternsChange;
  void showOrphans; void onShowOrphansChange; void nodeSizeMode; void onNodeSizeModeChange;
  void availableViews; void activeViewId; void onViewChange; void depthLimit; void onDepthLimitChange;

  return (
    <div className="absolute bottom-2 right-2 z-10">
      {isOpen ? (
        <div className="bg-zinc-800/95 backdrop-blur-sm rounded-lg border border-zinc-700 w-72 shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
            <span className="text-sm font-medium text-zinc-200">Settings</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <AccordionSection title="Forces">
            <ForcesSection
              settings={physicsSettings}
              onChange={onPhysicsSettingChange}
              onReset={onPhysicsReset}
            />
          </AccordionSection>

          <AccordionSection title="Groups">
            <p className="text-xs text-zinc-500">Coming soon</p>
          </AccordionSection>

          <AccordionSection title="Filters">
            <p className="text-xs text-zinc-500">Coming soon</p>
          </AccordionSection>

          <AccordionSection title="Display">
            <p className="text-xs text-zinc-500">Coming soon</p>
          </AccordionSection>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-zinc-800/80 hover:bg-zinc-700/90 backdrop-blur-sm rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

**Step 4: Run tests**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add src/webview/components/SettingsPanel.tsx tests/webview/SettingsPanel.test.tsx
git commit -m "feat: add SettingsPanel shell with accordion and Forces section"
```

---

### Task 9: `SettingsPanel` — Groups section

**Files:**
- Modify: `src/webview/components/SettingsPanel.tsx`
- Modify: `tests/webview/SettingsPanel.test.tsx`

**Step 1: Write failing tests**

Add to `tests/webview/SettingsPanel.test.tsx`:

```typescript
describe('Groups section', () => {
  function openGroups() {
    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByText('Groups'));
  }

  it('shows existing groups', () => {
    const groups: IGroup[] = [{ id: '1', pattern: 'src/**', color: '#3B82F6' }];
    render(<SettingsPanel {...defaultProps} groups={groups} />);
    openGroups();
    expect(screen.getByText('src/**')).toBeInTheDocument();
  });

  it('calls onGroupsChange when a group is deleted', () => {
    const onGroupsChange = vi.fn();
    const groups: IGroup[] = [{ id: '1', pattern: 'src/**', color: '#3B82F6' }];
    render(<SettingsPanel {...defaultProps} groups={groups} onGroupsChange={onGroupsChange} />);
    openGroups();
    fireEvent.click(screen.getByTitle('Remove src/**'));
    expect(onGroupsChange).toHaveBeenCalledWith([]);
  });

  it('calls onGroupsChange with new group when Add is clicked', () => {
    const onGroupsChange = vi.fn();
    render(<SettingsPanel {...defaultProps} groups={[]} onGroupsChange={onGroupsChange} />);
    openGroups();
    fireEvent.change(screen.getByPlaceholderText('Pattern, e.g. src/**'), {
      target: { value: '*.test.ts' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(onGroupsChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ pattern: '*.test.ts' })])
    );
  });

  it('does not add a group with empty pattern', () => {
    const onGroupsChange = vi.fn();
    render(<SettingsPanel {...defaultProps} groups={[]} onGroupsChange={onGroupsChange} />);
    openGroups();
    fireEvent.click(screen.getByText('Add'));
    expect(onGroupsChange).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```

**Step 3: Replace the Groups stub with the real implementation**

Find the `<AccordionSection title="Groups">` block in `SettingsPanel.tsx` and replace it with a call to a new `GroupsSection` component. Add the component above `SettingsPanel`:

```tsx
function GroupsSection({
  groups,
  onChange,
}: {
  groups: IGroup[];
  onChange: (groups: IGroup[]) => void;
}) {
  const [newPattern, setNewPattern] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');

  const handleAdd = () => {
    if (!newPattern.trim()) return;
    onChange([...groups, { id: crypto.randomUUID(), pattern: newPattern.trim(), color: newColor }]);
    setNewPattern('');
  };

  const handleRemove = (id: string) => {
    onChange(groups.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-2">
      {groups.length > 0 && (
        <ul className="space-y-1">
          {groups.map(group => (
            <li key={group.id} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-sm flex-shrink-0 border border-zinc-600"
                style={{ backgroundColor: group.color }}
              />
              <span className="flex-1 text-xs text-zinc-300 truncate">{group.pattern}</span>
              <button
                onClick={() => handleRemove(group.id)}
                title={`Remove ${group.pattern}`}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Pattern, e.g. src/**"
          className="flex-1 text-xs bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
        />
        <input
          type="color"
          value={newColor}
          onChange={e => setNewColor(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer bg-transparent border border-zinc-600"
        />
        <button
          onClick={handleAdd}
          className="text-xs text-zinc-300 hover:text-white px-2 py-1 border border-zinc-600 rounded hover:border-zinc-400"
        >
          Add
        </button>
      </div>
    </div>
  );
}
```

Update the accordion:
```tsx
<AccordionSection title="Groups">
  <GroupsSection groups={groups} onChange={onGroupsChange} />
</AccordionSection>
```

Remove `void groups; void onGroupsChange;` from the suppression lines.

**Step 4: Run tests**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```
Expected: all Groups tests PASS

**Step 5: Commit**

```bash
git add src/webview/components/SettingsPanel.tsx tests/webview/SettingsPanel.test.tsx
git commit -m "feat: add Groups section to SettingsPanel"
```

---

### Task 10: `SettingsPanel` — Filters section

**Files:**
- Modify: `src/webview/components/SettingsPanel.tsx`
- Modify: `tests/webview/SettingsPanel.test.tsx`

**Step 1: Write failing tests**

Add to `tests/webview/SettingsPanel.test.tsx`:

```typescript
describe('Filters section', () => {
  function openFilters() {
    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByText('Filters'));
  }

  it('shows Show Orphans toggle checked when showOrphans is true', () => {
    render(<SettingsPanel {...defaultProps} showOrphans={true} />);
    openFilters();
    const toggle = screen.getByLabelText('Show orphan nodes');
    expect((toggle as HTMLInputElement).checked).toBe(true);
  });

  it('calls onShowOrphansChange when toggle clicked', () => {
    const onShowOrphansChange = vi.fn();
    render(<SettingsPanel {...defaultProps} onShowOrphansChange={onShowOrphansChange} />);
    openFilters();
    fireEvent.click(screen.getByLabelText('Show orphan nodes'));
    expect(onShowOrphansChange).toHaveBeenCalledWith(false);
  });

  it('shows existing filter patterns', () => {
    render(<SettingsPanel {...defaultProps} filterPatterns={['*.png', '*.jpg']} />);
    openFilters();
    expect(screen.getByText('*.png')).toBeInTheDocument();
    expect(screen.getByText('*.jpg')).toBeInTheDocument();
  });

  it('calls onFilterPatternsChange when pattern removed', () => {
    const onFilterPatternsChange = vi.fn();
    render(<SettingsPanel {...defaultProps} filterPatterns={['*.png']} onFilterPatternsChange={onFilterPatternsChange} />);
    openFilters();
    fireEvent.click(screen.getByTitle('Remove *.png'));
    expect(onFilterPatternsChange).toHaveBeenCalledWith([]);
  });

  it('calls onFilterPatternsChange when pattern added', () => {
    const onFilterPatternsChange = vi.fn();
    render(<SettingsPanel {...defaultProps} filterPatterns={[]} onFilterPatternsChange={onFilterPatternsChange} />);
    openFilters();
    fireEvent.change(screen.getByPlaceholderText('Pattern, e.g. *.png'), {
      target: { value: '*.svg' },
    });
    fireEvent.click(screen.getByText('Exclude'));
    expect(onFilterPatternsChange).toHaveBeenCalledWith(['*.svg']);
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```

**Step 3: Add `FiltersSection` to `SettingsPanel.tsx`**

Add the component above `SettingsPanel`:

```tsx
function FiltersSection({
  filterPatterns,
  onChange,
  showOrphans,
  onShowOrphansChange,
}: {
  filterPatterns: string[];
  onChange: (patterns: string[]) => void;
  showOrphans: boolean;
  onShowOrphansChange: (show: boolean) => void;
}) {
  const [newPattern, setNewPattern] = useState('');

  const handleAdd = () => {
    if (!newPattern.trim()) return;
    onChange([...filterPatterns, newPattern.trim()]);
    setNewPattern('');
  };

  const handleRemove = (pattern: string) => {
    onChange(filterPatterns.filter(p => p !== pattern));
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          id="show-orphans"
          aria-label="Show orphan nodes"
          checked={showOrphans}
          onChange={e => onShowOrphansChange(e.target.checked)}
          className="accent-blue-500"
        />
        <span className="text-xs text-zinc-300">Show orphan nodes</span>
      </label>

      {filterPatterns.length > 0 && (
        <ul className="space-y-1 pt-1">
          {filterPatterns.map(pattern => (
            <li key={pattern} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-zinc-300 font-mono truncate">{pattern}</span>
              <button
                onClick={() => handleRemove(pattern)}
                title={`Remove ${pattern}`}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Pattern, e.g. *.png"
          className="flex-1 text-xs bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
        />
        <button
          onClick={handleAdd}
          className="text-xs text-zinc-300 hover:text-white px-2 py-1 border border-zinc-600 rounded hover:border-zinc-400"
        >
          Exclude
        </button>
      </div>
    </div>
  );
}
```

Replace the Filters stub:
```tsx
<AccordionSection title="Filters">
  <FiltersSection
    filterPatterns={filterPatterns}
    onChange={onFilterPatternsChange}
    showOrphans={showOrphans}
    onShowOrphansChange={onShowOrphansChange}
  />
</AccordionSection>
```

Remove `void filterPatterns; void onFilterPatternsChange; void showOrphans; void onShowOrphansChange;` from suppression lines.

**Step 4: Run tests**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```
Expected: all Filters tests PASS

**Step 5: Commit**

```bash
git add src/webview/components/SettingsPanel.tsx tests/webview/SettingsPanel.test.tsx
git commit -m "feat: add Filters section to SettingsPanel"
```

---

### Task 11: `SettingsPanel` — Display section

**Files:**
- Modify: `src/webview/components/SettingsPanel.tsx`
- Modify: `tests/webview/SettingsPanel.test.tsx`

**Step 1: Write failing tests**

Add to `tests/webview/SettingsPanel.test.tsx`:

```typescript
describe('Display section', () => {
  const views: IAvailableView[] = [
    { id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: '', active: true },
    { id: 'codegraphy.depth-graph', name: 'Depth Graph', icon: 'target', description: '', active: false },
  ];

  function openDisplay() {
    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByText('Display'));
  }

  it('shows node size options', () => {
    render(<SettingsPanel {...defaultProps} />);
    openDisplay();
    expect(screen.getByLabelText('Connections')).toBeInTheDocument();
    expect(screen.getByLabelText('File Size')).toBeInTheDocument();
  });

  it('calls onNodeSizeModeChange when option selected', () => {
    const onNodeSizeModeChange = vi.fn();
    render(<SettingsPanel {...defaultProps} onNodeSizeModeChange={onNodeSizeModeChange} />);
    openDisplay();
    fireEvent.click(screen.getByLabelText('File Size'));
    expect(onNodeSizeModeChange).toHaveBeenCalledWith('file-size');
  });

  it('shows view options from availableViews', () => {
    render(<SettingsPanel {...defaultProps} availableViews={views} />);
    openDisplay();
    expect(screen.getByLabelText('Connections')).toBeInTheDocument();
    expect(screen.getByLabelText('Depth Graph')).toBeInTheDocument();
  });

  it('calls onViewChange when view selected', () => {
    const onViewChange = vi.fn();
    render(<SettingsPanel {...defaultProps} availableViews={views} onViewChange={onViewChange} />);
    openDisplay();
    fireEvent.click(screen.getByLabelText('Depth Graph'));
    expect(onViewChange).toHaveBeenCalledWith('codegraphy.depth-graph');
  });

  it('shows depth slider only when depth-graph view is active', () => {
    render(<SettingsPanel {...defaultProps} availableViews={views} activeViewId="codegraphy.depth-graph" depthLimit={2} />);
    openDisplay();
    expect(screen.getByLabelText('Depth')).toBeInTheDocument();
  });

  it('does not show depth slider for connections view', () => {
    render(<SettingsPanel {...defaultProps} availableViews={views} activeViewId="codegraphy.connections" />);
    openDisplay();
    expect(screen.queryByLabelText('Depth')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run to confirm failure**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```

**Step 3: Add `DisplaySection` to `SettingsPanel.tsx`**

Note: "Connections" and "File Size" labels appear in both node size options and view options. To avoid `getByLabelText` collisions in the tests, wrap each group in a `<fieldset>` with a `<legend>`. The test uses `getByLabelText` which matches `<label>` elements — multiple labels with same text will cause ambiguity. Looking at the tests: `screen.getByLabelText('Connections')` appears in both groups in the same test, so they need to be distinguishable. Use `getAllByLabelText` or ensure the test only queries one group at a time. The tests as written will work if there's only one label named "Connections" visible — but both groups show at once. Adjust the node size labels to be slightly different: `'Connections'` stays, but the view radio also has `'Connections'`.

**Solution:** prefix the IDs to ensure uniqueness (`size-connections` vs `view-codegraphy.connections`), but use `aria-label` on the radio inputs instead of `<label>` elements for the view group, so `getByLabelText('Connections')` only finds the node size radio. Alternatively rename the Display section groups to avoid ambiguity.

Simpler: use `getByRole('radio', { name: 'Connections' })` in tests would pick up multiple — just use `getAllByRole`. For the implementation, use standard `<label>` for everything, and accept that there may be duplicate label text — the tests above are written expecting specific behavior. Adjust the tests in Step 1 if needed when you see which labels conflict, or use `within()` to scope queries.

```tsx
const NODE_SIZE_OPTIONS: { value: NodeSizeMode; label: string }[] = [
  { value: 'connections',   label: 'Connections'  },
  { value: 'file-size',     label: 'File Size'    },
  { value: 'access-count',  label: 'Access Count' },
  { value: 'uniform',       label: 'Uniform'      },
];

function DisplaySection({
  nodeSizeMode,
  onNodeSizeModeChange,
  availableViews,
  activeViewId,
  onViewChange,
  depthLimit,
  onDepthLimitChange,
}: {
  nodeSizeMode: NodeSizeMode;
  onNodeSizeModeChange: (mode: NodeSizeMode) => void;
  availableViews: IAvailableView[];
  activeViewId: string;
  onViewChange: (id: string) => void;
  depthLimit: number;
  onDepthLimitChange: (limit: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Node Size */}
      <div>
        <p className="text-xs text-zinc-500 mb-1">Node Size</p>
        <div className="space-y-1">
          {NODE_SIZE_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="nodeSizeMode"
                value={value}
                checked={nodeSizeMode === value}
                onChange={() => onNodeSizeModeChange(value)}
                className="accent-blue-500"
                aria-label={label}
              />
              <span className="text-xs text-zinc-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* View */}
      {availableViews.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">View</p>
          <div className="space-y-1">
            {availableViews.map(view => (
              <label key={view.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="activeView"
                  value={view.id}
                  checked={activeViewId === view.id}
                  onChange={() => onViewChange(view.id)}
                  className="accent-blue-500"
                  aria-label={view.name}
                />
                <span className="text-xs text-zinc-300">{view.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Depth slider — only visible when depth-graph is active */}
      {activeViewId === 'codegraphy.depth-graph' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="depth-limit" className="text-xs text-zinc-300">
              Depth
            </label>
            <span className="text-xs text-zinc-500 font-mono">{depthLimit}</span>
          </div>
          <input
            id="depth-limit"
            aria-label="Depth"
            type="range"
            min={1}
            max={10}
            step={1}
            value={depthLimit}
            onChange={e => onDepthLimitChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      )}
    </div>
  );
}
```

Replace the Display stub:
```tsx
<AccordionSection title="Display">
  <DisplaySection
    nodeSizeMode={nodeSizeMode}
    onNodeSizeModeChange={onNodeSizeModeChange}
    availableViews={availableViews}
    activeViewId={activeViewId}
    onViewChange={onViewChange}
    depthLimit={depthLimit}
    onDepthLimitChange={onDepthLimitChange}
  />
</AccordionSection>
```

Remove remaining `void` suppressions for these props.

**Step 4: Run tests**

```bash
npm test -- tests/webview/SettingsPanel.test.tsx
```
Expected: all Display tests PASS. If label ambiguity causes failures, scope assertions with `within(screen.getByRole('group', { name: 'Node Size' }))` or adjust aria-labels to be unique.

**Step 5: Commit**

```bash
git add src/webview/components/SettingsPanel.tsx tests/webview/SettingsPanel.test.tsx
git commit -m "feat: add Display section to SettingsPanel"
```

---

### Task 12: Wire up, connect messages, and remove `PhysicsSettings`

**Files:**
- Modify: `src/webview/App.tsx`
- Delete: `src/webview/components/PhysicsSettings.tsx`
- Delete: `tests/webview/PhysicsSettings.test.tsx`
- Modify: `tests/webview/PhysicsUpdateFlow.test.tsx` (check imports)

**Step 1: Replace PhysicsSettings with SettingsPanel in `App.tsx`**

Remove the import:
```typescript
// DELETE:
import PhysicsSettings from './components/PhysicsSettings';
```

Add the import:
```typescript
import SettingsPanel from './components/SettingsPanel';
```

Replace the `<PhysicsSettings ... />` JSX with `<SettingsPanel>`, wiring all props:

```tsx
<SettingsPanel
  physicsSettings={physicsSettings}
  onPhysicsSettingChange={(key, value) => {
    setPhysicsSettings(prev => ({ ...prev, [key]: value }));
    postMessage({ type: 'UPDATE_PHYSICS_SETTING', payload: { key, value } });
  }}
  onPhysicsReset={() => postMessage({ type: 'RESET_PHYSICS_SETTINGS' })}
  groups={groups}
  onGroupsChange={(newGroups) => {
    setGroups(newGroups);
    postMessage({ type: 'UPDATE_GROUPS', payload: { groups: newGroups } });
  }}
  filterPatterns={filterPatterns}
  onFilterPatternsChange={(patterns) => {
    setFilterPatterns(patterns);
    postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns } });
  }}
  showOrphans={showOrphans}
  onShowOrphansChange={(show) => {
    setShowOrphans(show);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { show } });
  }}
  nodeSizeMode={nodeSizeMode}
  onNodeSizeModeChange={setNodeSizeMode}
  availableViews={availableViews}
  activeViewId={activeViewId}
  onViewChange={(viewId) => {
    setActiveViewId(viewId);
    postMessage({ type: 'CHANGE_VIEW', payload: { viewId } });
  }}
  depthLimit={depthLimit}
  onDepthLimitChange={(limit) => {
    setDepthLimit(limit);
    postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: limit } });
  }}
/>
```

**Step 2: Delete old files**

```bash
rm src/webview/components/PhysicsSettings.tsx
rm tests/webview/PhysicsSettings.test.tsx
```

**Step 3: Check PhysicsUpdateFlow tests**

Open `tests/webview/PhysicsUpdateFlow.test.tsx`. If it imports `PhysicsSettings`, update it to test through `SettingsPanel` instead, or delete it if fully redundant with the new SettingsPanel tests. The core physics update flow (messages to extension) is now covered by SettingsPanel.test.tsx.

**Step 4: Run full test suite**

```bash
npm test
```
Expected: all tests pass. Fix any remaining import errors (e.g. if PhysicsSettings is imported anywhere else).

**Step 5: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```
Expected: clean.

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: wire up SettingsPanel in App, remove PhysicsSettings component"
```
