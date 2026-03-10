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
 * @module @codegraphy/plugin-api
 */

// Disposable
export type { Disposable } from './disposable';

// Connection / Rule
export type { IConnection, IRule, IRuleDetector } from './connection';

// Graph data
export type { IGraphNode, IGraphEdge, IGraphData } from './graph';

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
  PluginRuleToggledPayload,
  PluginMessagePayload,
  // Timeline
  TimelineCommitSelectedPayload,
  TimelinePlaybackStartedPayload,
  TimelinePlaybackStoppedPayload,
  TimelineRangeChangedPayload,
  // Legacy aliases kept for source compatibility with prior v2 drafts
  AnalysisStartedPayload as AnalysisStartPayload,
  AnalysisCompletedPayload as AnalysisCompletePayload,
  WorkspaceFileChangedPayload as FileChangePayload,
  WorkspaceFileRenamedPayload as FileRenamePayload,
  WorkspaceActiveEditorChangedPayload as ActiveEditorChangePayload,
  WorkspaceConfigChangedPayload as SettingChangePayload,
  WorkspaceConfigChangedPayload as WorkspaceChangePayload,
  ViewChangedPayload as ViewDidChangePayload,
  ViewChangedPayload as ViewWillChangePayload,
  ViewDepthChangedPayload as DepthLimitChangePayload,
  ViewFocusChangedPayload as FocusedFileChangePayload,
  PluginRegisteredPayload as PluginLoadedPayload,
  PluginUnregisteredPayload as PluginUnloadedPayload,
  PluginEnabledPayload as PluginTogglePayload,
  PluginRuleToggledPayload as RuleTogglePayload,
  TimelineCommitSelectedPayload as TimelineCommitChangePayload,
  TimelineCommitSelectedPayload as TimelineReadyPayload,
  TimelinePlaybackStartedPayload as TimelinePlaybackPayload,
  AnalysisFileProcessedPayload as AnalysisProgressPayload,
  // Workspace
  // No explicit theme event is currently emitted by runtime EventBus.
} from './events';

// Plugin interface
export type { IPlugin, IAnalysisFile } from './plugin';

// Host API
export type { CodeGraphyAPI } from './api';

// Views
export type { IView, IViewContext } from './views';

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
