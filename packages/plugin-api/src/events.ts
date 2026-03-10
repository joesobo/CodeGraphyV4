/**
 * @fileoverview Typed event payloads for the CodeGraphy event bus.
 * Plugins subscribe to events via `api.on(event, handler)`.
 *
 * Events are grouped into categories:
 * - **Graph interaction** (12) — user actions on the graph canvas
 * - **Analysis** (4) — workspace analysis lifecycle
 * - **Workspace** (6) — file system and settings changes
 * - **Views** (6) — view switching and lifecycle
 * - **Plugin** (6) — plugin system events
 * - **Timeline** (4) — git timeline feature events
 *
 * @module @codegraphy/plugin-api/events
 */

import type { IGraphData, IGraphNode, IGraphEdge } from './graph';
import type { NodeDecoration, EdgeDecoration } from './decorations';

// ============================================================================
// Graph Interaction Events (12)
// ============================================================================

/** Payload when a node is clicked. */
export interface NodeClickPayload {
  nodeId: string;
  node: IGraphNode;
}

/** Payload when a node is double-clicked (opens file). */
export interface NodeDoubleClickPayload {
  nodeId: string;
  node: IGraphNode;
}

/** Payload when a node is right-clicked. */
export interface NodeContextMenuPayload {
  nodeId: string;
  node: IGraphNode;
  /** Screen coordinates where the menu was triggered. */
  position: { x: number; y: number };
}

/** Payload when node hover begins. */
export interface NodeHoverPayload {
  nodeId: string;
  node: IGraphNode;
}

/** Payload when node hover ends. */
export interface NodeHoverEndPayload {
  nodeId: string;
}

/** Payload when an edge is clicked. */
export interface EdgeClickPayload {
  edgeId: string;
  edge: IGraphEdge;
}

/** Payload when an edge is hovered. */
export interface EdgeHoverPayload {
  edgeId: string;
  edge: IGraphEdge;
}

/** Payload when edge hover ends. */
export interface EdgeHoverEndPayload {
  edgeId: string;
}

/** Payload when the canvas (background) is clicked. */
export interface CanvasClickPayload {
  /** Canvas coordinates of the click. */
  position: { x: number; y: number };
}

/** Payload when a node is dragged to a new position. */
export interface NodeDragPayload {
  nodeId: string;
  position: { x: number; y: number };
}

/** Payload when the selection changes (one or more nodes). */
export interface SelectionChangePayload {
  /** IDs of all currently selected nodes. Empty if selection was cleared. */
  selectedNodeIds: string[];
}

/** Payload when the viewport zoom or pan changes. */
export interface ViewportChangePayload {
  /** Current zoom level (1 = 100%). */
  zoom: number;
  /** Center of the viewport in graph coordinates. */
  center: { x: number; y: number };
}

// ============================================================================
// Analysis Events (4)
// ============================================================================

/** Payload when analysis starts. */
export interface AnalysisStartPayload {
  /** Number of files to analyze. */
  fileCount: number;
}

/** Payload when analysis completes successfully. */
export interface AnalysisCompletePayload {
  /** The complete graph data produced by analysis. */
  graph: IGraphData;
  /** Analysis duration in milliseconds. */
  durationMs: number;
}

/** Payload when analysis encounters an error. */
export interface AnalysisErrorPayload {
  /** Error message. */
  message: string;
  /** Original error, if available. */
  error?: unknown;
}

/** Payload for incremental analysis progress. */
export interface AnalysisProgressPayload {
  /** Number of files analyzed so far. */
  current: number;
  /** Total files to analyze. */
  total: number;
  /** Phase label (e.g., 'discovering', 'analyzing', 'building graph'). */
  phase: string;
}

// ============================================================================
// Workspace Events (6)
// ============================================================================

/** Payload when a file is created, changed, or deleted. */
export interface FileChangePayload {
  /** Absolute path of the affected file. */
  filePath: string;
  /** Type of change. */
  changeType: 'created' | 'changed' | 'deleted';
}

/** Payload when a file is renamed. */
export interface FileRenamePayload {
  /** Previous absolute path. */
  oldPath: string;
  /** New absolute path. */
  newPath: string;
}

/** Payload when the active editor changes. */
export interface ActiveEditorChangePayload {
  /** Absolute path of the newly active file, or null if no editor is open. */
  filePath: string | null;
}

/** Payload when a CodeGraphy setting changes. */
export interface SettingChangePayload {
  /** The setting key that changed (e.g., 'codegraphy.showOrphans'). */
  key: string;
  /** The new value. */
  value: unknown;
  /** The previous value. */
  previousValue: unknown;
}

/** Payload when the workspace root changes. */
export interface WorkspaceChangePayload {
  /** New workspace root absolute path. */
  workspaceRoot: string;
}

/** Payload when the color theme changes. */
export interface ThemeChangePayload {
  /** New theme kind. */
  kind: 'light' | 'dark' | 'high-contrast';
}

// ============================================================================
// View Events (6)
// ============================================================================

/** Payload when the active view is about to change. */
export interface ViewWillChangePayload {
  /** Current view ID. */
  currentViewId: string;
  /** View ID being switched to. */
  nextViewId: string;
}

/** Payload when the active view has changed. */
export interface ViewDidChangePayload {
  /** Previous view ID. */
  previousViewId: string;
  /** New active view ID. */
  activeViewId: string;
}

/** Payload when a new view is registered. */
export interface ViewRegisteredPayload {
  /** The registered view's ID. */
  viewId: string;
  /** Human-readable name. */
  name: string;
}

/** Payload when a view is unregistered. */
export interface ViewUnregisteredPayload {
  viewId: string;
}

/** Payload when the depth limit changes (depth graph view). */
export interface DepthLimitChangePayload {
  depthLimit: number;
}

/** Payload when the focused file changes (depth graph view). */
export interface FocusedFileChangePayload {
  /** Relative path of the focused file, or null if cleared. */
  filePath: string | null;
}

// ============================================================================
// Plugin Events (6)
// ============================================================================

/** Payload when a plugin is loaded. */
export interface PluginLoadedPayload {
  pluginId: string;
  pluginName: string;
  version: string;
}

/** Payload when a plugin is unloaded. */
export interface PluginUnloadedPayload {
  pluginId: string;
}

/** Payload when a plugin is enabled or disabled. */
export interface PluginTogglePayload {
  pluginId: string;
  enabled: boolean;
}

/** Payload when a plugin rule is toggled. */
export interface RuleTogglePayload {
  /** Qualified ID: "pluginId:ruleId". */
  qualifiedId: string;
  enabled: boolean;
}

/** Payload when a node decoration is applied. */
export interface DecorationAppliedPayload {
  nodeId?: string;
  edgeId?: string;
  decoration: NodeDecoration | EdgeDecoration;
  pluginId: string;
}

/** Payload when decorations are cleared. */
export interface DecorationsClearedPayload {
  pluginId: string;
}

// ============================================================================
// Timeline Events (4)
// ============================================================================

/** Payload when timeline indexing progress updates. */
export interface TimelineIndexProgressPayload {
  phase: string;
  current: number;
  total: number;
}

/** Payload when timeline indexing completes. */
export interface TimelineReadyPayload {
  /** Total number of commits indexed. */
  commitCount: number;
  /** SHA of the current (HEAD) commit. */
  currentSha: string;
}

/** Payload when the timeline jumps to a specific commit. */
export interface TimelineCommitChangePayload {
  /** SHA of the commit being displayed. */
  sha: string;
  /** Graph data for that commit snapshot. */
  graph: IGraphData;
}

/** Payload when timeline playback starts, pauses, or ends. */
export interface TimelinePlaybackPayload {
  state: 'playing' | 'paused' | 'ended';
  /** Current playback speed multiplier. */
  speed: number;
}

// ============================================================================
// EventPayloads — master event→payload map
// ============================================================================

/**
 * Master mapping from event names to their payload types.
 * Used by `api.on<E>()` / `api.once<E>()` for full type safety.
 */
export interface EventPayloads {
  // Graph interaction (12)
  nodeClick: NodeClickPayload;
  nodeDoubleClick: NodeDoubleClickPayload;
  nodeContextMenu: NodeContextMenuPayload;
  nodeHover: NodeHoverPayload;
  nodeHoverEnd: NodeHoverEndPayload;
  edgeClick: EdgeClickPayload;
  edgeHover: EdgeHoverPayload;
  edgeHoverEnd: EdgeHoverEndPayload;
  canvasClick: CanvasClickPayload;
  nodeDrag: NodeDragPayload;
  selectionChange: SelectionChangePayload;
  viewportChange: ViewportChangePayload;

  // Analysis (4)
  analysisStart: AnalysisStartPayload;
  analysisComplete: AnalysisCompletePayload;
  analysisError: AnalysisErrorPayload;
  analysisProgress: AnalysisProgressPayload;

  // Workspace (6)
  fileChange: FileChangePayload;
  fileRename: FileRenamePayload;
  activeEditorChange: ActiveEditorChangePayload;
  settingChange: SettingChangePayload;
  workspaceChange: WorkspaceChangePayload;
  themeChange: ThemeChangePayload;

  // Views (6)
  viewWillChange: ViewWillChangePayload;
  viewDidChange: ViewDidChangePayload;
  viewRegistered: ViewRegisteredPayload;
  viewUnregistered: ViewUnregisteredPayload;
  depthLimitChange: DepthLimitChangePayload;
  focusedFileChange: FocusedFileChangePayload;

  // Plugin (6)
  pluginLoaded: PluginLoadedPayload;
  pluginUnloaded: PluginUnloadedPayload;
  pluginToggle: PluginTogglePayload;
  ruleToggle: RuleTogglePayload;
  decorationApplied: DecorationAppliedPayload;
  decorationsCleared: DecorationsClearedPayload;

  // Timeline (4)
  timelineIndexProgress: TimelineIndexProgressPayload;
  timelineReady: TimelineReadyPayload;
  timelineCommitChange: TimelineCommitChangePayload;
  timelinePlayback: TimelinePlaybackPayload;
}
