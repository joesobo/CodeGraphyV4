import type { IFileInfo } from '../files/info';
import type { IGraphData, IGraphNode } from '../graph/contracts';
import type { GraphDataPatch } from '../graph/patch';
import type { IPluginContextMenuItem } from '../plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../plugins/decorations';
import type { IPluginExporterItem } from '../plugins/exporters';
import type { IPluginToolbarAction } from '../plugins/toolbarActions';
import type { IPluginStatus } from '../plugins/status';
import type { IGraphControlsSnapshot } from '../graphControls/contracts';
import type {
  AutoRevealMode,
  BidirectionalEdgeMode,
  DagMode,
  DirectionMode,
  NodeSizeMode,
} from '../settings/modes';
import type { IPhysicsSettings } from '../settings/physics';
import type { IGroup } from '../settings/groups';
import type { ITimelineData } from '../timeline/contracts';
import type {
  PerfControlMessage,
  PerfRenderReadyRequestMessage,
} from '../perf/protocol';

export interface IPluginFilterPatternGroup {
  pluginId: string;
  pluginName: string;
  patterns: string[];
}

export type GraphViewContributionStatusKind =
  | 'runtimeNodes'
  | 'runtimeEdges'
  | 'projections'
  | 'forces'
  | 'nodeDragEnd'
  | 'contextMenu'
  | 'ui';

export interface IGraphViewContributionStatus {
  kind: GraphViewContributionStatusKind;
  pluginId: string;
  contributionId: string;
  label: string;
}

export interface IGraphNodeMetricsUpdate {
  id: IGraphNode['id'];
  fileSize: IGraphNode['fileSize'];
  churn: IGraphNode['churn'];
}

export type OptimisticFileMutationPayload =
  | { kind: 'create'; filePath: string }
  | { kind: 'delete'; paths: string[] }
  | { kind: 'rename'; oldPath: string; newPath: string };

export type ExtensionToWebviewMessage =
  | PerfControlMessage
  | PerfRenderReadyRequestMessage
  | { type: 'GRAPH_DATA_UPDATED'; graphRevision?: number; payload: IGraphData }
  | {
      type: 'GRAPH_DATA_PATCHED';
      baseGraphRevision: number;
      graphRevision?: number;
      nodeCount: number;
      edgeCount: number;
      payload: GraphDataPatch;
    }
  | { type: 'GRAPH_NODE_METRICS_UPDATED'; payload: { nodes: IGraphNodeMetricsUpdate[] } }
  | {
      type: 'GRAPH_SCOPE_HYDRATION_UPDATED';
      payload: { hydrating: boolean; scopeIds: string[] };
    }
  | {
      type: 'FILE_MUTATION_STARTED';
      payload: { mutationId: string; mutation: OptimisticFileMutationPayload };
    }
  | { type: 'FILE_MUTATION_FAILED'; payload: { mutationId: string; message: string } }
  | { type: 'INLINE_FILE_EDIT_FAILED'; payload: { message: string } }
  | { type: 'APP_BOOTSTRAP_COMPLETE' }
  | { type: 'GRAPH_VIEW_VISIBILITY_UPDATED'; payload: { visible: boolean } }
  | {
      type: 'GRAPH_INDEX_STATUS_UPDATED';
      payload: {
        hasIndex: boolean;
        freshness: 'fresh' | 'stale' | 'missing';
        detail: string;
      };
    }
  | { type: 'GRAPH_INDEX_PROGRESS'; payload: { phase: string; current: number; total: number } }
  | { type: 'GRAPH_CONTROLS_UPDATED'; payload: IGraphControlsSnapshot }
  | { type: 'FIT_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'FAVORITES_UPDATED'; payload: { favorites: string[] } }
  | { type: 'THEME_CHANGED'; payload: { kind: 'light' | 'dark' | 'high-contrast' } }
  | { type: 'FILE_INFO'; payload: IFileInfo }
  | {
      type: 'SETTINGS_UPDATED';
      payload: {
        autoReveal: AutoRevealMode;
        bidirectionalEdges: BidirectionalEdgeMode;
        showOrphans: boolean;
      };
    }
  | { type: 'REQUEST_EXPORT_PNG' }
  | { type: 'REQUEST_EXPORT_SVG' }
  | { type: 'REQUEST_EXPORT_JPEG' }
  | { type: 'REQUEST_EXPORT_JSON' }
  | { type: 'REQUEST_EXPORT_MD' }
  | { type: 'REQUEST_OPEN_IN_EDITOR' }
  | { type: 'DEPTH_MODE_UPDATED'; payload: { depthMode: boolean } }
  | { type: 'PHYSICS_SETTINGS_UPDATED'; payload: IPhysicsSettings }
  | { type: 'DEPTH_LIMIT_UPDATED'; payload: { depthLimit: number } }
  | { type: 'DEPTH_LIMIT_RANGE_UPDATED'; payload: { maxDepthLimit: number } }
  | { type: 'LEGENDS_UPDATED'; payload: { legends: IGroup[] } }
  | {
      type: 'FILTER_PATTERNS_UPDATED';
      payload: {
        patterns: string[];
        pluginPatterns: string[];
        pluginPatternGroups: IPluginFilterPatternGroup[];
        disabledCustomPatterns: string[];
        disabledPluginPatterns: string[];
      };
    }
  | { type: 'FILES_EXCLUDE_UPDATED'; payload: { enabled: boolean; excludedCount: number } }
  | {
      type: 'DIRECTION_SETTINGS_UPDATED';
      payload: {
        directionMode: DirectionMode;
        particleSpeed: number;
        particleSize: number;
        directionColor: string;
      };
    }
  | { type: 'SHOW_LABELS_UPDATED'; payload: { showLabels: boolean } }
  | { type: 'PLUGINS_UPDATED'; payload: { plugins: IPluginStatus[] } }
  | { type: 'MAX_FILES_UPDATED'; payload: { maxFiles: number } }
  | { type: 'VERBOSE_DIAGNOSTICS_UPDATED'; payload: { verboseDiagnostics: boolean } }
  | { type: 'CSS_SNIPPETS_UPDATED'; payload: { snippets: Record<string, boolean>; stylesheets: string[] } }
  | { type: 'PLUGIN_DATA_UPDATED'; payload: { pluginId: string; data: unknown } }
  | { type: 'ACTIVE_FILE_UPDATED'; payload: { filePath: string | undefined } }
  | { type: 'INDEX_PROGRESS'; payload: { phase: string; current: number; total: number } }
  | { type: 'TIMELINE_DATA'; payload: ITimelineData }
  | {
      type: 'COMMIT_GRAPH_DATA';
      payload: { sha: string; graphData: IGraphData } | { sha: string; patch: GraphDataPatch };
    }
  | { type: 'PLAYBACK_SPEED_UPDATED'; payload: { speed: number } }
  | { type: 'CACHE_INVALIDATED' }
  | { type: 'PLAYBACK_ENDED' }
  | { type: 'GET_NODE_BOUNDS' }
  | { type: 'GET_GRAPH_RUNTIME_STATE' }
  | { type: 'GET_VISIBLE_GRAPH_STATE' }
  | {
      type: 'DECORATIONS_UPDATED';
      payload: {
        nodeDecorations: Record<string, NodeDecorationPayload>;
        edgeDecorations: Record<string, EdgeDecorationPayload>;
      };
    }
  | {
      type: 'NATIVE_DECORATIONS_UPDATED';
      payload: { nodeDecorations: Record<string, NodeDecorationPayload> };
    }
  | { type: 'CONTEXT_MENU_ITEMS'; payload: { items: IPluginContextMenuItem[] } }
  | { type: 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED'; payload: { contributions: IGraphViewContributionStatus[] } }
  | { type: 'PLUGIN_EXPORTERS_UPDATED'; payload: { items: IPluginExporterItem[] } }
  | { type: 'PLUGIN_TOOLBAR_ACTIONS_UPDATED'; payload: { items: IPluginToolbarAction[] } }
  | {
    type: 'PLUGIN_WEBVIEW_INJECT';
    payload: {
      pluginId: string;
      scripts: string[];
      styles: string[];
      assets?: Array<{
        id: string;
        label: string;
        url: string;
        path?: string;
        kind?: string;
        metadata?: Record<string, unknown>;
      }>;
    };
  }
  | { type: 'DAG_MODE_UPDATED'; payload: { dagMode: DagMode } }
  | { type: 'NODE_SIZE_MODE_UPDATED'; payload: { nodeSizeMode: NodeSizeMode } }
  | { type: 'TOGGLE_DEPTH_MODE' }
  | { type: 'CYCLE_LAYOUT' }
  | { type: 'TOGGLE_DIMENSION' };
