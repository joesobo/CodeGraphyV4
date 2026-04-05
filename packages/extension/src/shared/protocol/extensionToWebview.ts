import type { IFileInfo } from '../files/info';
import type { IGraphData } from '../graph/types';
import type { IPluginContextMenuItem } from '../plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../plugins/decorations';
import type { IPluginExporterItem } from '../plugins/exporters';
import type { IPluginStatus } from '../plugins/status';
import type {
  BidirectionalEdgeMode,
  DagMode,
  DirectionMode,
  NodeSizeMode,
} from '../settings/modes';
import type { IPhysicsSettings } from '../settings/physics';
import type { IGroup } from '../settings/groups';
import type { ITimelineData } from '../timeline/types';
import type { IAvailableView } from '../view/types';

export type ExtensionToWebviewMessage =
  | { type: 'GRAPH_DATA_UPDATED'; payload: IGraphData }
  | { type: 'FIT_VIEW' }
  | { type: 'ZOOM_IN' }
  | { type: 'ZOOM_OUT' }
  | { type: 'FAVORITES_UPDATED'; payload: { favorites: string[] } }
  | { type: 'THEME_CHANGED'; payload: { kind: 'light' | 'dark' | 'high-contrast' } }
  | { type: 'FILE_INFO'; payload: IFileInfo }
  | {
      type: 'SETTINGS_UPDATED';
      payload: { bidirectionalEdges: BidirectionalEdgeMode; showOrphans: boolean };
    }
  | { type: 'REQUEST_EXPORT_PNG' }
  | { type: 'REQUEST_EXPORT_SVG' }
  | { type: 'REQUEST_EXPORT_JPEG' }
  | { type: 'REQUEST_EXPORT_JSON' }
  | { type: 'REQUEST_EXPORT_MD' }
  | { type: 'NODE_ACCESS_COUNT_UPDATED'; payload: { nodeId: string; accessCount: number } }
  | { type: 'VIEWS_UPDATED'; payload: { views: IAvailableView[]; activeViewId: string } }
  | { type: 'PHYSICS_SETTINGS_UPDATED'; payload: IPhysicsSettings }
  | { type: 'DEPTH_LIMIT_UPDATED'; payload: { depthLimit: number } }
  | { type: 'DEPTH_LIMIT_RANGE_UPDATED'; payload: { maxDepthLimit: number } }
  | { type: 'GROUPS_UPDATED'; payload: { groups: IGroup[] } }
  | {
      type: 'FILTER_PATTERNS_UPDATED';
      payload: { patterns: string[]; pluginPatterns: string[] };
    }
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
  | { type: 'ACTIVE_FILE_UPDATED'; payload: { filePath: string | undefined } }
  | { type: 'INDEX_PROGRESS'; payload: { phase: string; current: number; total: number } }
  | { type: 'TIMELINE_DATA'; payload: ITimelineData }
  | { type: 'COMMIT_GRAPH_DATA'; payload: { sha: string; graphData: IGraphData } }
  | { type: 'PLAYBACK_SPEED_UPDATED'; payload: { speed: number } }
  | { type: 'CACHE_INVALIDATED' }
  | { type: 'PLAYBACK_ENDED' }
  | { type: 'GET_NODE_BOUNDS' }
  | {
      type: 'DECORATIONS_UPDATED';
      payload: {
        nodeDecorations: Record<string, NodeDecorationPayload>;
        edgeDecorations: Record<string, EdgeDecorationPayload>;
      };
    }
  | { type: 'CONTEXT_MENU_ITEMS'; payload: { items: IPluginContextMenuItem[] } }
  | { type: 'PLUGIN_EXPORTERS_UPDATED'; payload: { items: IPluginExporterItem[] } }
  | { type: 'PLUGIN_WEBVIEW_INJECT'; payload: { pluginId: string; scripts: string[]; styles: string[] } }
  | { type: 'FOLDER_NODE_COLOR_UPDATED'; payload: { folderNodeColor: string } }
  | { type: 'DAG_MODE_UPDATED'; payload: { dagMode: DagMode } }
  | { type: 'NODE_SIZE_MODE_UPDATED'; payload: { nodeSizeMode: NodeSizeMode } }
  | { type: 'CYCLE_VIEW' }
  | { type: 'CYCLE_LAYOUT' }
  | { type: 'TOGGLE_DIMENSION' };
