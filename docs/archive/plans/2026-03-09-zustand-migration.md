# Zustand State Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 22 useState calls in App.tsx with a single Zustand store, eliminating prop drilling and enabling selective re-renders.

**Architecture:** Create a single store (`src/webview/store.ts`) containing all webview state + actions. The extension message handler writes directly to the store. Components subscribe to only the slices they need via selectors. SearchBar remains a controlled component — its state lives in the store but is accessed via App.

**Tech Stack:** zustand (latest), React, TypeScript

---

### Task 1: Install zustand

**Step 1: Install the dependency**

Run: `npm install zustand`

**Step 2: Verify it installed**

Run: `npm ls zustand`
Expected: `zustand@5.x.x` (or latest)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add zustand dependency"
```

---

### Task 2: Create the Zustand store

**Files:**
- Create: `src/webview/store.ts`
- Test: `tests/webview/store.test.ts`

**Step 1: Write the failing test**

Create `tests/webview/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createGraphStore } from '../../src/webview/store';

describe('GraphStore', () => {
  let store: ReturnType<typeof createGraphStore>;

  beforeEach(() => {
    store = createGraphStore();
  });

  it('has correct initial state', () => {
    const state = store.getState();
    expect(state.graphData).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.searchQuery).toBe('');
    expect(state.favorites).toEqual(new Set());
    expect(state.showArrows).toBe(true);
    expect(state.showLabels).toBe(true);
    expect(state.graphMode).toBe('2d');
    expect(state.activePanel).toBe('none');
  });

  it('handles GRAPH_DATA_UPDATED message', () => {
    const data = {
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#93C5FD' }],
      edges: [],
    };
    store.getState().handleExtensionMessage({
      type: 'GRAPH_DATA_UPDATED',
      payload: data,
    });
    expect(store.getState().graphData).toEqual(data);
    expect(store.getState().isLoading).toBe(false);
  });

  it('handles FAVORITES_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FAVORITES_UPDATED',
      payload: { favorites: ['src/a.ts', 'src/b.ts'] },
    });
    expect(store.getState().favorites).toEqual(new Set(['src/a.ts', 'src/b.ts']));
  });

  it('handles SETTINGS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    });
    expect(store.getState().bidirectionalMode).toBe('combined');
    expect(store.getState().showOrphans).toBe(false);
  });

  it('handles SHOW_ARROWS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SHOW_ARROWS_UPDATED',
      payload: { showArrows: false },
    });
    expect(store.getState().showArrows).toBe(false);
  });

  it('handles SHOW_LABELS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
    expect(store.getState().showLabels).toBe(false);
  });

  it('handles GROUPS_UPDATED message', () => {
    const groups = [{ id: 'g1', pattern: 'src/**', color: '#ff0000' }];
    store.getState().handleExtensionMessage({
      type: 'GROUPS_UPDATED',
      payload: { groups },
    });
    expect(store.getState().groups).toEqual(groups);
  });

  it('handles FILTER_PATTERNS_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: { patterns: ['*.test.ts'], pluginPatterns: ['*.uid'] },
    });
    expect(store.getState().filterPatterns).toEqual(['*.test.ts']);
    expect(store.getState().pluginFilterPatterns).toEqual(['*.uid']);
  });

  it('handles VIEWS_UPDATED message', () => {
    const views = [{ id: 'v1', name: 'Connections', icon: 'graph', description: '', active: true }];
    store.getState().handleExtensionMessage({
      type: 'VIEWS_UPDATED',
      payload: { views, activeViewId: 'v1' },
    });
    expect(store.getState().availableViews).toEqual(views);
    expect(store.getState().activeViewId).toBe('v1');
  });

  it('handles PHYSICS_SETTINGS_UPDATED message', () => {
    const physics = { repelForce: 15, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
    store.getState().handleExtensionMessage({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: physics,
    });
    expect(store.getState().physicsSettings).toEqual(physics);
  });

  it('handles DEPTH_LIMIT_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 4 },
    });
    expect(store.getState().depthLimit).toBe(4);
  });

  it('handles PLUGINS_UPDATED message', () => {
    const plugins = [{ id: 'ts', name: 'TypeScript', version: '1.0', supportedExtensions: ['.ts'], status: 'active' as const, enabled: true, connectionCount: 5, sources: [] }];
    store.getState().handleExtensionMessage({
      type: 'PLUGINS_UPDATED',
      payload: { plugins },
    });
    expect(store.getState().pluginStatuses).toEqual(plugins);
  });

  it('handles MAX_FILES_UPDATED message', () => {
    store.getState().handleExtensionMessage({
      type: 'MAX_FILES_UPDATED',
      payload: { maxFiles: 1000 },
    });
    expect(store.getState().maxFiles).toBe(1000);
  });

  it('setSearchQuery updates search query', () => {
    store.getState().setSearchQuery('test');
    expect(store.getState().searchQuery).toBe('test');
  });

  it('setActivePanel updates active panel', () => {
    store.getState().setActivePanel('settings');
    expect(store.getState().activePanel).toBe('settings');
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/webview/store.test.ts`
Expected: FAIL — module `../../src/webview/store` not found

**Step 3: Write the store**

Create `src/webview/store.ts`:

```typescript
import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import type {
  IGraphData,
  IAvailableView,
  BidirectionalEdgeMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  IPluginStatus,
  ExtensionToWebviewMessage,
} from '../shared/types';
import type { SearchOptions } from './components/SearchBar';

const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};

export interface GraphState {
  // Graph data
  graphData: IGraphData | null;
  isLoading: boolean;

  // Search
  searchQuery: string;
  searchOptions: SearchOptions;

  // Favorites
  favorites: Set<string>;

  // Display
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  showArrows: boolean;
  showLabels: boolean;
  graphMode: '2d' | '3d';
  nodeSizeMode: NodeSizeMode;

  // Physics
  physicsSettings: IPhysicsSettings;
  depthLimit: number;

  // Groups/Filters
  groups: IGroup[];
  filterPatterns: string[];
  pluginFilterPatterns: string[];

  // Views
  availableViews: IAvailableView[];
  activeViewId: string;

  // Plugins
  pluginStatuses: IPluginStatus[];

  // UI
  activePanel: 'none' | 'settings' | 'plugins';
  maxFiles: number;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchOptions: (options: SearchOptions) => void;
  setActivePanel: (panel: 'none' | 'settings' | 'plugins') => void;
  setGraphMode: (mode: '2d' | '3d') => void;
  setNodeSizeMode: (mode: NodeSizeMode) => void;
  setPhysicsSettings: (settings: IPhysicsSettings) => void;
  setGroups: (groups: IGroup[]) => void;
  setFilterPatterns: (patterns: string[]) => void;
  setShowOrphans: (show: boolean) => void;
  setShowArrows: (show: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setActiveViewId: (id: string) => void;
  setMaxFiles: (max: number) => void;
  handleExtensionMessage: (message: ExtensionToWebviewMessage) => void;
}

export function createGraphStore() {
  return createStore<GraphState>((set) => ({
    // Initial state
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: DEFAULT_SEARCH_OPTIONS,
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    showArrows: true,
    showLabels: true,
    graphMode: '2d',
    nodeSizeMode: 'connections',
    physicsSettings: DEFAULT_PHYSICS,
    depthLimit: 1,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    pluginStatuses: [],
    activePanel: 'none',
    maxFiles: 500,

    // Actions
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchOptions: (options) => set({ searchOptions: options }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setGraphMode: (mode) => set({ graphMode: mode }),
    setNodeSizeMode: (mode) => set({ nodeSizeMode: mode }),
    setPhysicsSettings: (settings) => set({ physicsSettings: settings }),
    setGroups: (groups) => set({ groups }),
    setFilterPatterns: (patterns) => set({ filterPatterns: patterns }),
    setShowOrphans: (show) => set({ showOrphans: show }),
    setShowArrows: (show) => set({ showArrows: show }),
    setShowLabels: (show) => set({ showLabels: show }),
    setActiveViewId: (id) => set({ activeViewId: id }),
    setMaxFiles: (max) => set({ maxFiles: max }),

    handleExtensionMessage: (message) => {
      switch (message.type) {
        case 'GRAPH_DATA_UPDATED':
          set({ graphData: message.payload, isLoading: false });
          break;
        case 'FAVORITES_UPDATED':
          set({ favorites: new Set(message.payload.favorites) });
          break;
        case 'SETTINGS_UPDATED':
          set({
            bidirectionalMode: message.payload.bidirectionalEdges,
            showOrphans: message.payload.showOrphans,
          });
          break;
        case 'GROUPS_UPDATED':
          set({ groups: message.payload.groups });
          break;
        case 'FILTER_PATTERNS_UPDATED':
          set({
            filterPatterns: message.payload.patterns,
            pluginFilterPatterns: message.payload.pluginPatterns,
          });
          break;
        case 'VIEWS_UPDATED':
          set({
            availableViews: message.payload.views,
            activeViewId: message.payload.activeViewId,
          });
          break;
        case 'PHYSICS_SETTINGS_UPDATED':
          set({ physicsSettings: message.payload });
          break;
        case 'DEPTH_LIMIT_UPDATED':
          set({ depthLimit: message.payload.depthLimit });
          break;
        case 'SHOW_ARROWS_UPDATED':
          set({ showArrows: message.payload.showArrows });
          break;
        case 'SHOW_LABELS_UPDATED':
          set({ showLabels: message.payload.showLabels });
          break;
        case 'PLUGINS_UPDATED':
          set({ pluginStatuses: message.payload.plugins });
          break;
        case 'MAX_FILES_UPDATED':
          set({ maxFiles: message.payload.maxFiles });
          break;
      }
    },
  }));
}

// Default store instance for the app
const store = createGraphStore();

/**
 * Hook to access the graph store with a selector.
 * Usage: `const showArrows = useGraphStore(s => s.showArrows)`
 */
export function useGraphStore<T>(selector: (state: GraphState) => T): T {
  return useZustandStore(store, selector);
}

/** Direct access to store (for use outside React, e.g. message handlers) */
export { store as graphStore };
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/webview/store.test.ts`
Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/webview/store.ts tests/webview/store.test.ts
git commit -m "feat: create Zustand store with all webview state and message handler"
```

---

### Task 3: Refactor App.tsx to use the store

**Files:**
- Modify: `src/webview/App.tsx`
- Modify: `tests/webview/App.test.tsx`

**Step 1: Rewrite App.tsx**

Replace all 22 useState calls with store subscriptions. Move the message handler to use `graphStore.getState().handleExtensionMessage()`. Keep `filterNodesAdvanced` as a local utility (it's pure logic, not state). Keep the `filteredData` and `coloredData` useMemo calls since they derive from store state.

Key changes:
- Remove all useState except local-only UI concerns
- Replace `useEffect` message handler with one that delegates to the store
- SettingsPanel: instead of passing 17+ props, pass only `isOpen` and `onClose` (it will read from store internally)
- Graph: instead of passing 9 props, it reads from store internally
- SearchBar: keep as controlled component — App reads `searchQuery`/`searchOptions` from store and passes as props (SearchBar is a generic component that shouldn't know about the store)
- PluginsPanel: pass only `isOpen` and `onClose`

The `filteredData` and `coloredData` computations stay in App.tsx for now — they need `graphData`, `searchQuery`, `searchOptions`, and `groups` from the store. App subscribes to those and computes derived state.

**Step 2: Update App tests**

The App tests simulate sending messages via `window.addEventListener('message', ...)`. Since the store's message handler is now called from the App's useEffect, these tests should still work with minimal changes. The main difference: instead of checking that a callback was called, we verify the rendered output.

**Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass (some SettingsPanel tests may fail — that's expected, we fix those in Task 4)

**Step 4: Commit**

```bash
git add src/webview/App.tsx tests/webview/App.test.tsx
git commit -m "refactor: migrate App.tsx from 22 useState calls to Zustand store"
```

---

### Task 4: Refactor SettingsPanel to use the store

**Files:**
- Modify: `src/webview/components/SettingsPanel.tsx`
- Modify: `tests/webview/SettingsPanel.test.tsx`

**Step 1: Refactor SettingsPanel**

Remove the `SettingsPanelProps` interface (except `isOpen` and `onClose`). Replace all prop reads with `useGraphStore(s => s.xxx)` selectors. Replace all `onXxxChange(value)` callbacks with `useGraphStore(s => s.setXxx)` actions.

The component's local state (accordion open/close, form inputs for new group/filter, drag state) stays as local useState — these are ephemeral UI state that shouldn't be in the global store.

**Step 2: Update SettingsPanel tests**

Tests currently render `<SettingsPanel {...props} />` with mock callbacks. After migration, they need to:
1. Create a test store via `createGraphStore()`
2. Wrap the component to use the test store (or mock `useGraphStore`)
3. Assert against store state instead of callback mocks

Simplest approach: mock the `../store` module in tests, providing a test store instance.

**Step 3: Run tests**

Run: `npx vitest run tests/webview/SettingsPanel.test.tsx`
Expected: All pass

**Step 4: Commit**

```bash
git add src/webview/components/SettingsPanel.tsx tests/webview/SettingsPanel.test.tsx
git commit -m "refactor: migrate SettingsPanel from 17 props to Zustand store"
```

---

### Task 5: Refactor Graph component to use the store

**Files:**
- Modify: `src/webview/components/Graph.tsx`
- Modify: `tests/webview/Graph.test.tsx`

**Step 1: Refactor Graph.tsx**

Replace GraphProps with store subscriptions for: `favorites`, `bidirectionalMode`, `physicsSettings`, `nodeSizeMode`, `showArrows`, `showLabels`, `graphMode`. Keep `data` as a prop since it's the derived/filtered/colored data computed in App.tsx. Keep `theme` as a prop (comes from useTheme hook, not the store).

**Step 2: Update Graph tests**

Minimal changes — Graph tests mostly test rendering behavior. Mock the store module and set initial state as needed.

**Step 3: Run tests**

Run: `npx vitest run tests/webview/Graph.test.tsx`
Expected: All pass

**Step 4: Commit**

```bash
git add src/webview/components/Graph.tsx tests/webview/Graph.test.tsx
git commit -m "refactor: migrate Graph from props to Zustand store"
```

---

### Task 6: Refactor PluginsPanel to use the store

**Files:**
- Modify: `src/webview/components/PluginsPanel.tsx`

**Step 1: Refactor PluginsPanel**

Replace `PluginsPanelProps` (isOpen, onClose, plugins) — keep `isOpen` and `onClose` as props, read `pluginStatuses` from the store.

**Step 2: Run tests**

Run: `npm test`
Expected: All pass

**Step 3: Commit**

```bash
git add src/webview/components/PluginsPanel.tsx
git commit -m "refactor: migrate PluginsPanel to Zustand store"
```

---

### Task 7: Full test suite + typecheck + lint

**Step 1: Run the full verification suite**

Run: `npm test && npm run typecheck && npm run lint`
Expected: All pass with zero errors

**Step 2: Manual smoke test**

Press F5 in VS Code → Extension Development Host. Verify:
- Graph renders on workspace open
- Search works
- Settings panel opens, sliders work, toggles work
- Plugins panel shows plugins
- 2D/3D toggle works
- Groups/filters persist

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues from Zustand migration verification"
```
