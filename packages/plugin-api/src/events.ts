/**
 * @fileoverview Canonical event payload contract for the CodeGraphy plugin API.
 * Event keys and payloads mirror the extension host runtime exactly.
 * @module @codegraphy-vscode/plugin-api/events
 */

/** Lightweight graph node reference used in event payloads. */
export interface GraphNodeRef {
  id: string;
  label?: string;
}

/** Lightweight graph edge reference used in event payloads. */
export interface GraphEdgeRef {
  id: string;
  from?: string;
  to?: string;
}

/** Shared 2D coordinate payload. */
export interface Point2D {
  x: number;
  y: number;
}

// ============================================================================
// Graph Interaction Events (12)
// ============================================================================

export interface NodeClickPayload {
  node: { id: string; label: string };
  event: Point2D;
}

export interface NodeDoubleClickPayload {
  node: { id: string; label: string };
  event: Point2D;
}

/**
 * Hover payload mirrors runtime behavior:
 * when hover ends, `node` is `null`.
 */
export interface NodeHoverPayload {
  node: { id: string; label: string } | null;
}

export interface NodeHoverEndPayload {
  node: { id: string; label: string };
}

export interface SelectionChangePayload {
  nodes: Array<{ id: string }>;
  edges: Array<{ id: string }>;
}

export interface EdgeClickPayload {
  edge: { id: string; from: string; to: string };
  event: Point2D;
}

export interface EdgeHoverPayload {
  edge: { id: string; from: string; to: string };
  event: Point2D;
}

export interface DragEndPayload {
  nodes: Array<{ id: string }>;
  positions: Record<string, Point2D>;
}

export interface ZoomPayload {
  level: number;
  center: Point2D;
}

export interface StabilizedPayload {
  iterations: number;
}

export interface ContextMenuPayload {
  node?: { id: string };
  edge?: { id: string };
  position: Point2D;
}

/** Background click currently does not include coordinates in runtime. */
export type BackgroundClickPayload = Record<string, never>;

// ============================================================================
// Analysis Events (4)
// ============================================================================

export interface AnalysisStartedPayload {
  fileCount: number;
}

export interface AnalysisFileProcessedPayload {
  filePath: string;
  connections: Array<{ specifier: string; resolvedPath: string | null }>;
}

export interface AnalysisCompletedPayload {
  graph: {
    nodes: Array<{ id: string }>;
    edges: Array<{ id: string }>;
  };
  duration: number;
}

export interface AnalysisErrorPayload {
  error: Error;
  filePath?: string;
}

// ============================================================================
// Workspace / Files Events (6)
// ============================================================================

export interface WorkspaceFileCreatedPayload {
  filePath: string;
}

export interface WorkspaceFileDeletedPayload {
  filePath: string;
}

export interface WorkspaceFileRenamedPayload {
  oldPath: string;
  newPath: string;
}

export interface WorkspaceFileChangedPayload {
  filePath: string;
}

export interface WorkspaceConfigChangedPayload {
  key: string;
  value: unknown;
  old: unknown;
}

export interface WorkspaceActiveEditorChangedPayload {
  filePath?: string;
}

// ============================================================================
// Views & Navigation Events (6)
// ============================================================================

export interface ViewChangedPayload {
  viewId: string;
  previousId?: string;
}

export interface ViewFocusChangedPayload {
  filePath?: string;
}

export interface ViewFolderChangedPayload {
  folderPath?: string;
}

export interface ViewDepthChangedPayload {
  depth: number;
}

export interface ViewSearchChangedPayload {
  query: string;
  results: string[];
}

export interface ViewPhysicsChangedPayload {
  settings: Record<string, number>;
}

// ============================================================================
// Plugin Ecosystem Events (6)
// ============================================================================

export interface PluginRegisteredPayload {
  pluginId: string;
}

export interface PluginUnregisteredPayload {
  pluginId: string;
}

export interface PluginEnabledPayload {
  pluginId: string;
}

export interface PluginDisabledPayload {
  pluginId: string;
}

export interface PluginRuleToggledPayload {
  qualifiedId: string;
  enabled: boolean;
}

export interface PluginMessagePayload {
  from: string;
  to?: string;
  data: unknown;
}

// ============================================================================
// Timeline Events (4)
// ============================================================================

export interface TimelineCommitSelectedPayload {
  hash: string;
  date: string;
  author: string;
}

export interface TimelinePlaybackStartedPayload {
  speed: number;
}

export interface TimelinePlaybackStoppedPayload {
  commitHash: string;
}

export interface TimelineRangeChangedPayload {
  start: string;
  end: string;
}

// ============================================================================
// EventPayloads — master event→payload map
// ============================================================================

/**
 * Canonical mapping from event names to payload types.
 * These keys intentionally match the runtime EventBus in the extension host.
 */
export interface EventPayloads {
  // Graph interaction (12)
  'graph:nodeClick': NodeClickPayload;
  'graph:nodeDoubleClick': NodeDoubleClickPayload;
  'graph:nodeHover': NodeHoverPayload;
  'graph:nodeHoverEnd': NodeHoverEndPayload;
  'graph:selectionChanged': SelectionChangePayload;
  'graph:edgeClick': EdgeClickPayload;
  'graph:edgeHover': EdgeHoverPayload;
  'graph:dragEnd': DragEndPayload;
  'graph:zoom': ZoomPayload;
  'graph:stabilized': StabilizedPayload;
  'graph:contextMenu': ContextMenuPayload;
  'graph:backgroundClick': BackgroundClickPayload;

  // Analysis (4)
  'analysis:started': AnalysisStartedPayload;
  'analysis:fileProcessed': AnalysisFileProcessedPayload;
  'analysis:completed': AnalysisCompletedPayload;
  'analysis:error': AnalysisErrorPayload;

  // Workspace / files (6)
  'workspace:fileCreated': WorkspaceFileCreatedPayload;
  'workspace:fileDeleted': WorkspaceFileDeletedPayload;
  'workspace:fileRenamed': WorkspaceFileRenamedPayload;
  'workspace:fileChanged': WorkspaceFileChangedPayload;
  'workspace:configChanged': WorkspaceConfigChangedPayload;
  'workspace:activeEditorChanged': WorkspaceActiveEditorChangedPayload;

  // Views & navigation (6)
  'view:changed': ViewChangedPayload;
  'view:focusChanged': ViewFocusChangedPayload;
  'view:folderChanged': ViewFolderChangedPayload;
  'view:depthChanged': ViewDepthChangedPayload;
  'view:searchChanged': ViewSearchChangedPayload;
  'view:physicsChanged': ViewPhysicsChangedPayload;

  // Plugin ecosystem (6)
  'plugin:registered': PluginRegisteredPayload;
  'plugin:unregistered': PluginUnregisteredPayload;
  'plugin:enabled': PluginEnabledPayload;
  'plugin:disabled': PluginDisabledPayload;
  'plugin:ruleToggled': PluginRuleToggledPayload;
  'plugin:message': PluginMessagePayload;

  // Timeline (4)
  'timeline:commitSelected': TimelineCommitSelectedPayload;
  'timeline:playbackStarted': TimelinePlaybackStartedPayload;
  'timeline:playbackStopped': TimelinePlaybackStoppedPayload;
  'timeline:rangeChanged': TimelineRangeChangedPayload;
}

/** Union of all event names. */
export type EventName = keyof EventPayloads;
