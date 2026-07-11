/**
 * @fileoverview CodeGraphy Plugin API type definitions.
 *
 * This package provides the canonical type definitions for building
 * CodeGraphy plugins. It defines:
 *
 * - {@link IPlugin} — the plugin interface (apiVersion is required)
 * - Graph, analysis, connection, and lifecycle event types
 *
 * @module @codegraphy-dev/plugin-api
 */

// Disposable
export type { Disposable } from './disposable';

// Access
export type {
  CodeGraphyAccessKey,
  CodeGraphyAccessState,
  IAccessProvider,
  IAccessRequest,
  IAccessResult,
} from './access';

// Connection source metadata
export type { IConnectionSource } from './connection';

// Plugin data
export type {
  IPluginDataHost,
  IPluginDataSaveOptions,
} from './data';

// Analysis
export type {
  IAnalysisNode,
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginGraphTypeDescription,
  IPluginGraphTypeExample,
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
  IGraphNodeRange,
  IGraphNodeSymbolMetadata,
} from './graph';

// Graph View contributions
export type {
  GraphViewAccessRequirement,
  GraphViewContextMenuTargetSelector,
  GraphViewUiContributionView,
  GraphViewUiSlot,
  IGraphViewContributionBase,
  IGraphViewContributionContext,
  IGraphViewContextMenuContribution,
  IGraphViewContextMenuRunContext,
  IGraphViewContributions,
  IGraphViewForceAdapter,
  IGraphViewForceAdapterContext,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContext,
  IGraphViewNodeDragEndContribution,
  IGraphViewNodeDragEndResult,
  IGraphViewNodeDragState,
  IGraphViewPhysicsSettings,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdge,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNode,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
} from './graphView';

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
export type {
  IPlugin,
  IPluginManifest,
  IPluginGraphScopeCapabilities,
  IPluginGraphScopeCapabilityContext,
  IPluginExportRequest,
  IPluginExporter,
  IPluginFactory,
  IPluginFactoryOptions,
  IPluginHostApi,
  IPluginUpdateImpact,
  IPluginUpdateImpactPolicy,
  IPluginToolbarAction,
  IPluginToolbarActionItem,
  IPluginWebviewAsset,
  IPluginWebviewContributions,
  IPluginWebviewMessage,
  IAnalysisFile,
  IPluginAnalysisContext,
  IPluginAnalysisFileSystem,
  IPluginFileColorDefinition,
} from './plugin';

// Webview plugin API
export type {
  BadgeOptions,
  CodeGraphyWebviewAPI,
  GraphViewPoint2D,
  GraphPluginSlot,
  GraphViewViewportNode,
  GraphViewViewportState,
  LabelOptions,
  NodeRenderContext,
  NodeRenderFn,
  OverlayRenderContext,
  OverlayRenderFn,
  PluginSlotContribution,
  PluginSlotRenderCleanup,
  PluginSlotRenderContext,
  RingOptions,
  TooltipAction,
  TooltipContent,
  TooltipContext,
  TooltipProviderFn,
  WebviewPluginActivate,
  WebviewPluginActivationCleanup,
} from './webview';
