import type { SearchOptions } from '../components/searchBar/field/model';
import type { IGraphData } from '../../shared/graph/contracts';
import type { IPluginContextMenuItem } from '../../shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import type { IPluginExporterItem } from '../../shared/plugins/exporters';
import type { IPluginToolbarAction } from '../../shared/plugins/toolbarActions';
import type { IPluginStatus } from '../../shared/plugins/status';
import type {
  ExtensionToWebviewMessage,
  IGraphViewContributionStatus,
  IPluginFilterPatternGroup,
} from '../../shared/protocol/extensionToWebview';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../shared/graphControls/contracts';
import type { IGroup } from '../../shared/settings/groups';
import type { BidirectionalEdgeMode, DirectionMode, NodeSizeMode } from '../../shared/settings/modes';
import type { IPhysicsSettings } from '../../shared/settings/physics';
import type {
  PendingGroupUpdates,
  PendingUserGroupsUpdate,
} from './optimistic/groups/updates';

/** All fields that the store can hold — used to type partial state updates. */
export interface IStoreFields {
  graphData: IGraphData | null;
  graphHasIndex: boolean;
  graphIndexFreshness: 'fresh' | 'stale' | 'missing';
  graphIndexDetail: string | null;
  graphIsIndexing: boolean;
  graphIndexProgress: { phase: string; current: number; total: number } | null;
  isLoading: boolean;
  awaitingInitialBootstrap: boolean;
  bootstrapComplete: boolean;
  pendingPluginAssetLoads: number;
  searchQuery: string;
  searchOptions: SearchOptions;
  favorites: Set<string>;
  pendingFavoriteSnapshot: Set<string> | null;
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  directionMode: DirectionMode;
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  cssSnippets: Record<string, boolean>;
  graphViewportScale: number | null;
  nodeSizeMode: NodeSizeMode;
  physicsSettings: IPhysicsSettings;
  depthMode: boolean;
  depthLimit: number;
  maxDepthLimit: number;
  legends: IGroup[];
  optimisticLegendUpdates: PendingGroupUpdates;
  optimisticUserLegends: PendingUserGroupsUpdate | null;
  filterPatterns: string[];
  pluginFilterPatterns: string[];
  pluginFilterGroups: IPluginFilterPatternGroup[];
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
  pluginStatuses: IPluginStatus[];
  graphNodeTypes: IGraphNodeTypeDefinition[];
  graphEdgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  pluginExporters: IPluginExporterItem[];
  pluginToolbarActions: IPluginToolbarAction[];
  graphViewContributionStatuses: IGraphViewContributionStatus[];
  activePanel: 'none' | 'settings' | 'plugins' | 'legends' | 'graphScope' | 'nodes' | 'edges' | 'export';
  maxFiles: number;
  showFps: boolean;
  verboseDiagnostics: boolean;
  activeFilePath: string | null;
}

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
