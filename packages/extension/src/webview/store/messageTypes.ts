import type { SearchOptions } from '../components/searchBar/field/model';
import type { IGraphData } from '../../shared/graph/types';
import type { IPluginContextMenuItem } from '../../shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import type { IPluginExporterItem } from '../../shared/plugins/exporters';
import type { IPluginToolbarAction } from '../../shared/plugins/toolbarActions';
import type { IPluginStatus } from '../../shared/plugins/status';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../shared/graphControls/types';
import type { IGroup } from '../../shared/settings/groups';
import type { BidirectionalEdgeMode, DagMode, DirectionMode, NodeSizeMode } from '../../shared/settings/modes';
import type { IPhysicsSettings } from '../../shared/settings/physics';
import type { ICommitInfo } from '../../shared/timeline/types';
import type { IAvailableView } from '../../shared/view/types';
import type {
  PendingGroupUpdates,
  PendingUserGroupsUpdate,
} from './optimisticGroups';

/** All fields that the store can hold — used to type partial state updates. */
export interface IStoreFields {
  graphData: IGraphData | null;
  graphHasIndex: boolean;
  graphIsIndexing: boolean;
  graphIndexProgress: { phase: string; current: number; total: number } | null;
  isLoading: boolean;
  searchQuery: string;
  searchOptions: SearchOptions;
  favorites: Set<string>;
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  directionMode: DirectionMode;
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  graphMode: '2d' | '3d';
  nodeSizeMode: NodeSizeMode;
  physicsSettings: IPhysicsSettings;
  depthMode: boolean;
  depthLimit: number;
  maxDepthLimit: number;
  groups: IGroup[];
  optimisticGroupUpdates: PendingGroupUpdates;
  optimisticUserGroups: PendingUserGroupsUpdate | null;
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  availableViews: IAvailableView[];
  activeViewId: string;
  dagMode: DagMode;
  pluginStatuses: IPluginStatus[];
  graphNodeTypes: IGraphNodeTypeDefinition[];
  graphEdgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  pluginExporters: IPluginExporterItem[];
  pluginToolbarActions: IPluginToolbarAction[];
  activePanel: 'none' | 'settings' | 'plugins' | 'legends' | 'nodes' | 'edges';
  maxFiles: number;
  activeFilePath: string | null;
  timelineActive: boolean;
  timelineCommits: ICommitInfo[];
  currentCommitSha: string | null;
  isIndexing: boolean;
  indexProgress: { phase: string; current: number; total: number } | null;
  isPlaying: boolean;
  playbackSpeed: number;
}

/** DAG mode cycle order: free-form → radialout → top-down → left-right */
export const DAG_MODE_CYCLE: DagMode[] = [null, 'radialout', 'td', 'lr'];

/** Context passed to handlers that need current state or side-effect capabilities. */
export interface IHandlerContext {
  getState: () => IStoreFields;
  postMessage: (msg: { type: string; payload: unknown }) => void;
}

export type PartialState = Partial<IStoreFields>;

export type MessageHandler = (
  message: ExtensionToWebviewMessage,
  ctx: IHandlerContext,
) => PartialState | void;
