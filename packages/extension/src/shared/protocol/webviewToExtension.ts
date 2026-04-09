import type { IGroup } from '../settings/groups';
import type {
  BidirectionalEdgeMode,
  DagMode,
  DirectionMode,
  NodeSizeMode,
} from '../settings/modes';
import type { IPhysicsSettings } from '../settings/physics';

export type WebviewToExtensionMessage =
  | { type: 'NODE_SELECTED'; payload: { nodeId: string } }
  | { type: 'NODE_DOUBLE_CLICKED'; payload: { nodeId: string } }
  | { type: 'CLEAR_FOCUSED_FILE' }
  | { type: 'WEBVIEW_READY'; payload: null }
  | { type: 'OPEN_FILE'; payload: { path: string } }
  | { type: 'REVEAL_IN_EXPLORER'; payload: { path: string } }
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'DELETE_FILES'; payload: { paths: string[] } }
  | { type: 'RENAME_FILE'; payload: { path: string } }
  | { type: 'CREATE_FILE'; payload: { directory: string } }
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
  | { type: 'CHANGE_VIEW'; payload: { viewId: string } }
  | { type: 'CHANGE_DEPTH_LIMIT'; payload: { depthLimit: number } }
  | { type: 'UPDATE_GROUPS'; payload: { groups: IGroup[] } }
  | { type: 'UPDATE_FILTER_PATTERNS'; payload: { patterns: string[] } }
  | { type: 'UPDATE_SHOW_ORPHANS'; payload: { showOrphans: boolean } }
  | { type: 'UPDATE_BIDIRECTIONAL_MODE'; payload: { bidirectionalMode: BidirectionalEdgeMode } }
  | { type: 'UPDATE_DIRECTION_MODE'; payload: { directionMode: DirectionMode } }
  | { type: 'UPDATE_DIRECTION_COLOR'; payload: { directionColor: string } }
  | {
      type: 'UPDATE_PARTICLE_SETTING';
      payload: { key: 'particleSpeed' | 'particleSize'; value: number };
    }
  | { type: 'UPDATE_SHOW_LABELS'; payload: { showLabels: boolean } }
  | { type: 'PHYSICS_STABILIZED' }
  | { type: 'TOGGLE_SOURCE'; payload: { qualifiedSourceId: string; enabled: boolean } }
  | { type: 'TOGGLE_PLUGIN'; payload: { pluginId: string; enabled: boolean } }
  | { type: 'UPDATE_PLUGIN_ORDER'; payload: { pluginIds: string[] } }
  | { type: 'UPDATE_NODE_COLOR'; payload: { nodeType: string; color: string } }
  | { type: 'UPDATE_NODE_VISIBILITY'; payload: { nodeType: string; visible: boolean } }
  | { type: 'UPDATE_EDGE_COLOR'; payload: { edgeKind: string; color: string } }
  | { type: 'UPDATE_EDGE_VISIBILITY'; payload: { edgeKind: string; visible: boolean } }
  | { type: 'UPDATE_MAX_FILES'; payload: { maxFiles: number } }
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
      payload: { graphMode: '2d' | '3d'; nodeCount: number };
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
  | { type: 'TOGGLE_PLUGIN_GROUP_DISABLED'; payload: { groupId: string; disabled: boolean } }
  | { type: 'TOGGLE_PLUGIN_SECTION_DISABLED'; payload: { pluginId: string; disabled: boolean } }
  | { type: 'PICK_GROUP_IMAGE'; payload: { groupId: string } }
  | { type: 'UPDATE_DAG_MODE'; payload: { dagMode: DagMode } }
  | { type: 'UPDATE_NODE_SIZE_MODE'; payload: { nodeSizeMode: NodeSizeMode } };
