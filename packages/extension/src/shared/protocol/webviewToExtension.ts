import type { IGroup } from '../settings/groups';
import type {
  BidirectionalEdgeMode,
  DagMode,
  DirectionMode,
  NodeSizeMode,
} from '../settings/modes';
import type { IPhysicsSettings } from '../settings/physics';
import type {
  PerfEventMessage,
  PerfRenderReadyMessage,
} from '../perf/protocol';
import type { ClipboardFilesMessage } from './clipboardFiles';
import type { FileComparisonMessage } from './fileComparison';

export interface GraphItemCreatePayload {
  directory: string;
}

export interface LegendIconImport {
  imagePath: string;
  contentsBase64: string;
}

export interface WebviewReadyPayload {
  pageId: string;
  postedAt: number;
}

export type WebviewToExtensionMessage =
  | PerfEventMessage
  | PerfRenderReadyMessage
  | ClipboardFilesMessage
  | FileComparisonMessage
  | { type: 'NODE_SELECTED'; payload: { nodeId: string } }
  | { type: 'NODE_DOUBLE_CLICKED'; payload: { nodeId: string } }
  | { type: 'CLEAR_FOCUSED_FILE' }
  | { type: 'WEBVIEW_READY'; payload: WebviewReadyPayload | null }
  | { type: 'OPEN_FILE'; payload: { path: string } }
  | { type: 'OPEN_FILES_TO_SIDE'; payload: { paths: string[] } }
  | { type: 'FIND_IN_FOLDER'; payload: { path: string } }
  | { type: 'CLOSE_FILE_EDITOR'; payload: { path: string } }
  | { type: 'OPEN_FILE_WITH'; payload: { path: string } }
  | { type: 'OPEN_IN_TERMINAL'; payload: { path: string } }
  | { type: 'OPEN_IN_EDITOR' }
  | { type: 'REVEAL_IN_EXPLORER'; payload: { path: string } }
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'DELETE_FILES'; payload: { paths: string[] } }
  | { type: 'RENAME_FILE'; payload: { path: string } }
  | { type: 'CREATE_FILE'; payload: GraphItemCreatePayload }
  | { type: 'CREATE_FOLDER'; payload: GraphItemCreatePayload }
  | { type: 'TOGGLE_FAVORITE'; payload: { paths: string[] } }
  | { type: 'ADD_TO_EXCLUDE'; payload: { patterns: string[] } }
  | { type: 'REFRESH_GRAPH' }
  | { type: 'INDEX_GRAPH' }
  | { type: 'GET_FILE_INFO'; payload: { path: string } }
  | { type: 'EXPORT_PNG'; payload: { dataUrl: string; filename?: string } }
  | { type: 'EXPORT_SVG'; payload: { svg: string; filename?: string } }
  | { type: 'EXPORT_JPEG'; payload: { dataUrl: string; filename?: string } }
  | { type: 'EXPORT_JSON'; payload: { json: string; filename?: string } }
  | { type: 'EXPORT_MD'; payload: { markdown: string; filename?: string } }
  | { type: 'EXPORT_SYMBOLS_JSON' }
  | { type: 'UPDATE_PHYSICS_SETTING'; payload: { key: keyof IPhysicsSettings; value: number } }
  | { type: 'RESET_PHYSICS_SETTINGS' }
  | { type: 'RESET_ALL_SETTINGS' }
  | { type: 'GET_PHYSICS_SETTINGS' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_DEPTH_MODE'; payload: { depthMode: boolean } }
  | { type: 'CHANGE_DEPTH_LIMIT'; payload: { depthLimit: number } }
  | { type: 'UPDATE_LEGENDS'; payload: { legends: IGroup[]; iconImports?: LegendIconImport[] } }
  | { type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY'; payload: { legendId: string; visible: boolean } }
  | {
      type: 'UPDATE_DEFAULT_LEGEND_VISIBILITY_BATCH';
      payload: { legendVisibility: Record<string, boolean> };
    }
  | { type: 'UPDATE_LEGEND_ORDER'; payload: { legendIds: string[] } }
  | { type: 'UPDATE_FILTER_PATTERNS'; payload: { patterns: string[] } }
  | { type: 'UPDATE_RESPECT_FILES_EXCLUDE'; payload: { enabled: boolean } }
  | {
      type: 'UPDATE_FILTER_PATTERN_STATE';
      payload: { source: 'custom' | 'plugin'; pattern: string; enabled: boolean };
    }
  | {
      type: 'UPDATE_FILTER_PATTERN_GROUP_STATE';
      payload: { source: 'custom' | 'plugin'; enabled: boolean };
    }
  | { type: 'UPDATE_SHOW_ORPHANS'; payload: { showOrphans: boolean } }
  | { type: 'UPDATE_BIDIRECTIONAL_MODE'; payload: { bidirectionalMode: BidirectionalEdgeMode } }
  | { type: 'UPDATE_DIRECTION_MODE'; payload: { directionMode: DirectionMode } }
  | { type: 'UPDATE_DIRECTION_COLOR'; payload: { directionColor: string } }
  | {
      type: 'UPDATE_PARTICLE_SETTING';
      payload: { key: 'particleSpeed' | 'particleSize'; value: number };
    }
  | { type: 'UPDATE_PLUGIN_DATA'; payload: { pluginId: string; data: unknown } }
  | { type: 'UPDATE_SHOW_LABELS'; payload: { showLabels: boolean } }
  | { type: 'UPDATE_CSS_SNIPPET'; payload: { path: string; enabled: boolean } }
  | { type: 'PHYSICS_STABILIZED' }
  | { type: 'TOGGLE_PLUGIN'; payload: { pluginId: string; packageName?: string; enabled: boolean } }
  | { type: 'UPDATE_NODE_COLOR'; payload: { nodeType: string; color: string } }
  | { type: 'UPDATE_NODE_VISIBILITY'; payload: { nodeType: string; visible: boolean } }
  | { type: 'UPDATE_EDGE_VISIBILITY'; payload: { edgeKind: string; visible: boolean } }
  | {
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH';
      payload: {
        nodeVisibility?: Record<string, boolean>;
        edgeVisibility?: Record<string, boolean>;
      };
    }
  | { type: 'UPDATE_MAX_FILES'; payload: { maxFiles: number } }
  | { type: 'UPDATE_VERBOSE_DIAGNOSTICS'; payload: { verboseDiagnostics: boolean } }
  | { type: 'INDEX_REPO' }
  | { type: 'JUMP_TO_COMMIT'; payload: { sha: string } }
  | { type: 'RESET_TIMELINE' }
  | { type: 'PREVIEW_FILE_AT_COMMIT'; payload: { sha: string; filePath: string } }
  | {
      type: 'NODE_BOUNDS_RESPONSE';
      payload: { nodes: Array<{ id: string; x: number; y: number; size: number }> };
    }
  | {
      type: 'GRAPH_RUNTIME_STATE_RESPONSE';
      payload: {
        graphMode: '2d' | '3d';
        nodeCount: number;
        edgeCount: number;
        edgeIds: string[];
      };
    }
  | {
      type: 'VISIBLE_GRAPH_STATE_RESPONSE';
      payload: {
        nodeCount: number;
        nodes: Array<{ id: string; nodeType?: string; color: string }>;
        edgeCount: number;
        edgeIds: string[];
      };
    }
  | {
      type: 'GRAPH_3D_UNAVAILABLE';
      payload: { message: string };
    }
  | { type: 'GRAPH_INTERACTION'; payload: { event: string; data: unknown } }
  | {
      type: 'PLUGIN_CONTEXT_MENU_ACTION';
      payload: { pluginId: string; index: number; targetId: string; targetType: 'node' | 'edge' };
    }
  | { type: 'RUN_PLUGIN_EXPORT'; payload: { pluginId: string; index: number } }
  | { type: 'RUN_PLUGIN_TOOLBAR_ACTION'; payload: { pluginId: string; index: number; itemIndex: number } }
  | { type: 'UPDATE_DAG_MODE'; payload: { dagMode: DagMode } }
  | { type: 'UPDATE_NODE_SIZE_MODE'; payload: { nodeSizeMode: NodeSizeMode } };
