# Settings Panel Redesign

**Date:** 2026-03-05
**Status:** Approved

## Overview

Expand the existing physics settings panel into a full-featured settings panel with four collapsible accordion sections: Forces, Groups, Filters, and Display. Modelled after Obsidian's graph settings panel. Replaces the standalone `PhysicsSettings` component and absorbs the `ViewSwitcher` and `DepthSlider` from the header.

## Goals

- Single settings entry point for all graph configuration
- Groups system for user-defined glob → color mappings, replacing auto-generated node colors
- Filters section for show/hide orphans and a regex/glob blacklist applied at file discovery
- Display section for node size mode and view switching
- All nodes grey by default; color only via user-defined groups

## Architecture Decision

**Hybrid client/extension split:**
- Groups are applied client-side (instant recolor, no re-analysis)
- Filter patterns are applied extension-side (triggers re-analysis, files not discovered at all)
- This gives each feature the right performance profile

## Persistence Layering

Both `codegraphy.groups` and `codegraphy.filterPatterns` follow the same priority order:
1. VS Code settings (`settings.json`) — for users who want a default theme across all projects
2. Workspace state — for per-project UI-driven configuration (default path)

## New Shared Types

```typescript
// src/shared/types.ts

export interface IGroup {
  id: string;      // crypto.randomUUID() — for React keys and deletion
  pattern: string; // glob pattern, e.g. "src/**", "*.test.ts"
  color: string;   // hex color, e.g. "#3B82F6"
}

// Added to ExtensionToWebviewMessage:
| { type: 'GROUPS_UPDATED'; payload: { groups: IGroup[] } }
| { type: 'FILTER_PATTERNS_UPDATED'; payload: { patterns: string[] } }

// Added to WebviewToExtensionMessage:
| { type: 'UPDATE_GROUPS'; payload: { groups: IGroup[] } }
| { type: 'UPDATE_FILTER_PATTERNS'; payload: { patterns: string[] } }
```

Pattern matching uses `minimatch` (already a dependency).

`nodeSizeMode` becomes client-side state in `App.tsx` — all required data (`fileSize`, `accessCount`) is already present on every node from the extension, so switching mode is instant with no round-trip.

## Extension Changes

### `GraphViewProvider`

- Two new workspace state storage keys: `codegraphy.groups` and `codegraphy.filterPatterns`
- On `WEBVIEW_READY`, send groups and filter patterns alongside existing favorites/settings/physics
- Handle `UPDATE_GROUPS` → save to workspace state → send `GROUPS_UPDATED` (no re-analysis)
- Handle `UPDATE_FILTER_PATTERNS` → save to workspace state → call `_analyzeAndSendData()` (re-analysis)
- Read VS Code settings first, fall back to workspace state for both

### `WorkspaceAnalyzer`

- `analyze()` reads filter patterns from config/workspace state and merges them into the `exclude` array passed to `FileDiscovery` (same mechanism as `codegraphy.exclude`)
- `_buildGraphData()` replaces `this._colorPalette.getColorForFile(filePath)` with `DEFAULT_NODE_COLOR` for all nodes — color assignment moves entirely to the client-side groups system

### `package.json` contributions

Add two new configuration properties, remove `codegraphy.exclude` and `codegraphy.fileColors`:
```json
"codegraphy.groups": {
  "type": "array",
  "default": [],
  "description": "Color groups for matching files. Each entry has a glob pattern and a hex color."
},
"codegraphy.filterPatterns": {
  "type": "array",
  "default": [],
  "description": "Glob patterns for files to exclude from the graph (applied at discovery time). Replaces codegraphy.exclude."
}
```

## Webview Changes

### `SettingsPanel` component (new, replaces `PhysicsSettings`)

Floating bottom-right, same gear button entry point. Width: `w-72`. Four independently collapsible accordion sections with open/closed state in React local state.

**Forces**
- Existing physics sliders verbatim
- Reset to Defaults button

**Groups**
- List: `[color swatch] [pattern] [× delete]`
- Add form: glob pattern text input + `<input type="color">` + Add button
- Adding generates a UUID, appends to list, sends `UPDATE_GROUPS` with full updated array
- Deleting sends same message minus the removed entry

**Filters**
- Show Orphans toggle at top (sends `UPDATE_FILTER_PATTERNS` or reuses existing config path)
- Blacklist patterns list: `[pattern] [× delete]`
- Add pattern input + Add button
- Adding/removing sends `UPDATE_FILTER_PATTERNS` → triggers re-analysis in extension

**Display**
- *Node Size* radio group: Connections / File Size / Access Count / Uniform
  - Updates `nodeSizeMode` state in `App.tsx` directly, no message sent
- *View* radio group: Connections / Depth Graph / Subfolder
  - Sends existing `CHANGE_VIEW` message
  - `DepthSlider` appears inline below the radio group when Depth Graph is selected

### `App.tsx`

- New state: `groups: IGroup[]`, `filterPatterns: string[]`, `nodeSizeMode: NodeSizeMode`
- Handle `GROUPS_UPDATED` and `FILTER_PATTERNS_UPDATED` messages
- New `useMemo` (`coloredData`) runs after the existing search filter — walks nodes, checks each against groups in order using `minimatch`, assigns first matching group's color, leaves non-matching nodes as `DEFAULT_NODE_COLOR`
- Remove `ViewSwitcher` from header
- Remove `DepthSlider` from header
- Header becomes search bar only
- Pass `nodeSizeMode` directly to `Graph` as a prop

## What Stays the Same

- All existing message types, undo/redo, view registry, position persistence
- `ColorPaletteManager` — kept but no longer called for default node colors; may be used in future for palette suggestions in the Groups UI

## Breaking Changes

- `codegraphy.fileColors` setting removed — replaced by Groups. No migration path; users should recreate their color rules as Groups entries.
- `codegraphy.exclude` setting removed — consolidated into `codegraphy.filterPatterns`. The Filters section is now the single place for all file exclusions. Default exclusion patterns (node_modules, dist, etc.) are baked into `WorkspaceAnalyzer` as hardcoded defaults, not from config.

## Files Changed

| File | Change |
|------|--------|
| `src/shared/types.ts` | Add `IGroup`, new message types |
| `src/extension/GraphViewProvider.ts` | Handle groups/filter messages, send on ready |
| `src/extension/WorkspaceAnalyzer.ts` | Merge filter patterns into exclude, use `DEFAULT_NODE_COLOR` |
| `package.json` | Add `codegraphy.groups` and `codegraphy.filterPatterns` config |
| `src/webview/App.tsx` | Groups/filters state, `coloredData` memo, remove ViewSwitcher/DepthSlider from header |
| `src/webview/components/PhysicsSettings.tsx` | Absorbed into SettingsPanel, deleted |
| `src/webview/components/SettingsPanel.tsx` | New — four-section accordion panel |
| `src/webview/components/ViewSwitcher.tsx` | Moved into SettingsPanel Display section |
| `src/webview/components/DepthSlider.tsx` | Moved into SettingsPanel Display section |
