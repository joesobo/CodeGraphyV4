/**
 * @fileoverview CodeGraphy Plugin API type definitions.
 *
 * This package provides the canonical type definitions for building
 * CodeGraphy plugins. It defines:
 *
 * - {@link IPlugin} — the plugin interface (apiVersion is required)
 * - {@link CodeGraphyAPI} — the host API passed to plugins via onLoad
 * - {@link CodeGraphyWebviewAPI} — the webview-side API for custom rendering
 * - Graph, decoration, event, view, and command types
 *
 * @module @codegraphy-vscode/plugin-api
 */

// Disposable
export type { Disposable } from './disposable';

// Connection source metadata
export type { IConnectionSource } from './connection';

// Analysis
export type {
  IAnalysisNode,
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginNodeType,
} from './analysis';

// Graph data
export type {
  CoreNodeType,
  CoreEdgeKind,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  GraphNodeShape2D,
  GraphNodeShape3D,
  IGraphNode,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphData,
  NodeType,
} from './graph';

// Decorations
export type { NodeDecoration, EdgeDecoration, TooltipSection } from './decorations';

// Events
export type {
  EventName,
  EventPayloads,
  // Graph interaction
  NodeClickPayload,
  NodeDoubleClickPayload,
  NodeHoverPayload,
  NodeHoverEndPayload,
  EdgeClickPayload,
  EdgeHoverPayload,
  DragEndPayload,
  SelectionChangePayload,
  ZoomPayload,
  StabilizedPayload,
  ContextMenuPayload,
  BackgroundClickPayload,
  // Analysis
  AnalysisStartedPayload,
  AnalysisFileProcessedPayload,
  AnalysisCompletedPayload,
  AnalysisErrorPayload,
  // Workspace / files
  WorkspaceFileCreatedPayload,
  WorkspaceFileDeletedPayload,
  WorkspaceFileRenamedPayload,
  WorkspaceFileChangedPayload,
  WorkspaceConfigChangedPayload,
  WorkspaceActiveEditorChangedPayload,
  // Views
  ViewChangedPayload,
  ViewFocusChangedPayload,
  ViewFolderChangedPayload,
  ViewDepthChangedPayload,
  ViewSearchChangedPayload,
  ViewPhysicsChangedPayload,
  // Plugin
  PluginRegisteredPayload,
  PluginUnregisteredPayload,
  PluginEnabledPayload,
  PluginDisabledPayload,
  PluginSourceToggledPayload,
  PluginMessagePayload,
  // Timeline
  TimelineCommitSelectedPayload,
  TimelinePlaybackStartedPayload,
  TimelinePlaybackStoppedPayload,
  TimelineRangeChangedPayload,
} from './events';

// Plugin interface
export type { IPlugin, IAnalysisFile, IPluginFileColorDefinition } from './plugin';

// Host API
export type { CodeGraphyAPI, ExportRequest, IExporter, IToolbarAction, IToolbarActionItem } from './api';

// Views
export type { IView, IViewContext, ViewDependency } from './views';

// Commands
export type { ICommand, IContextMenuItem } from './commands';

// Webview types (re-exported from sub-module)
export type {
  CodeGraphyWebviewAPI,
  NodeRenderFn,
  NodeRenderContext,
  OverlayRenderFn,
  OverlayRenderContext,
  TooltipProviderFn,
  TooltipContext,
  TooltipContent,
  BadgeOpts,
  RingOpts,
  LabelOpts,
} from './webview';
