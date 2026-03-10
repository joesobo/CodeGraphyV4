/**
 * @fileoverview CodeGraphy Plugin API type definitions.
 *
 * This package provides the canonical type definitions for building
 * CodeGraphy plugins. It defines:
 *
 * - {@link IPlugin} — the v2 plugin interface (backward-compatible with v1)
 * - {@link CodeGraphyAPI} — the host API passed to v2 plugins
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
  EventPayloads,
  // Graph interaction
  NodeClickPayload,
  NodeDoubleClickPayload,
  NodeContextMenuPayload,
  NodeHoverPayload,
  NodeHoverEndPayload,
  EdgeClickPayload,
  EdgeHoverPayload,
  EdgeHoverEndPayload,
  CanvasClickPayload,
  NodeDragPayload,
  SelectionChangePayload,
  ViewportChangePayload,
  // Analysis
  AnalysisStartPayload,
  AnalysisCompletePayload,
  AnalysisErrorPayload,
  AnalysisProgressPayload,
  // Workspace
  FileChangePayload,
  FileRenamePayload,
  ActiveEditorChangePayload,
  SettingChangePayload,
  WorkspaceChangePayload,
  ThemeChangePayload,
  // Views
  ViewWillChangePayload,
  ViewDidChangePayload,
  ViewRegisteredPayload,
  ViewUnregisteredPayload,
  DepthLimitChangePayload,
  FocusedFileChangePayload,
  // Plugin
  PluginLoadedPayload,
  PluginUnloadedPayload,
  PluginTogglePayload,
  RuleTogglePayload,
  DecorationAppliedPayload,
  DecorationsClearedPayload,
  // Timeline
  TimelineIndexProgressPayload,
  TimelineReadyPayload,
  TimelineCommitChangePayload,
  TimelinePlaybackPayload,
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
