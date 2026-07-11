import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import type { SearchOptions } from '../components/searchBar/field/model';
import { INITIAL_STATE } from './initialState';
import { createActions } from './actions/create';
import type { IGraphData } from '../../shared/graph/contracts';
import type { IPluginContextMenuItem } from '../../shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import type { IPluginExporterItem } from '../../shared/plugins/exporters';
import type { IPluginToolbarAction } from '../../shared/plugins/toolbarActions';
import type { IPluginStatus } from '../../shared/plugins/status';
import type {
  ExtensionToWebviewMessage,
  IGraphViewContributionStatus,
} from '../../shared/protocol/extensionToWebview';
import type { IPluginFilterPatternGroup } from '../../shared/protocol/extensionToWebview';
import type {
  IGraphEdgeTypeDefinition,
  IGraphNodeTypeDefinition,
} from '../../shared/graphControls/contracts';
import type { IGroup } from '../../shared/settings/groups';
import type { AutoRevealMode, BidirectionalEdgeMode, DagMode, DirectionMode, NodeSizeMode } from '../../shared/settings/modes';
import type { IPhysicsSettings } from '../../shared/settings/physics';
import type { ICommitInfo } from '../../shared/timeline/contracts';
import type {
  PendingGroupUpdates,
  PendingUserGroupsUpdate,
} from './optimistic/groups/updates';

export interface GraphState {
  autoReveal: AutoRevealMode;
  graphData: IGraphData | null;
  graphRevision: number | null;
  graphResetVersion: number;
  pendingFileMutations: Record<string, IGraphData>;
  fileMutationError: string | null;
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
  physicsPaused: boolean;
  showLabels: boolean;
  cssSnippets: Record<string, boolean>;
  graphMode: '2d' | '3d';
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
  respectFilesExclude: boolean;
  filesExcludedCount: number;
  dagMode: DagMode;
  pluginStatuses: IPluginStatus[];
  nodeDecorations: Record<string, NodeDecorationPayload>;
  nativeNodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  pluginExporters: IPluginExporterItem[];
  pluginToolbarActions: IPluginToolbarAction[];
  graphViewContributionStatuses: IGraphViewContributionStatus[];
  graphNodeTypes: IGraphNodeTypeDefinition[];
  graphEdgeTypes: IGraphEdgeTypeDefinition[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  graphScopeProjectionRevision: number;
  activePanel: 'none' | 'settings' | 'plugins' | 'legends' | 'graphScope' | 'nodes' | 'edges' | 'export';
  maxFiles: number;
  verboseDiagnostics: boolean;
  activeFilePath: string | null;
  compareSelectedPath: string | null;
  timelineActive: boolean;
  timelineCommits: ICommitInfo[];
  currentCommitSha: string | null;
  isIndexing: boolean;
  indexProgress: { phase: string; current: number; total: number } | null;
  isPlaying: boolean;
  playbackSpeed: number;
  expandedGroupId: string | null;
  setExpandedGroupId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchOptions: (options: SearchOptions) => void;
  setActivePanel: (panel: GraphState['activePanel']) => void;
  setCompareSelectedPath: (path: string | null) => void;
  setGraphMode: (mode: '2d' | '3d') => void;
  setGraphViewportScale: (scale: number | null) => void;
  setNodeSizeMode: (mode: NodeSizeMode) => void;
  setPhysicsSettings: (settings: IPhysicsSettings) => void;
  setLegends: (legends: IGroup[]) => void;
  setOptimisticLegendUpdate: (legendId: string, updates: Partial<IGroup>) => void;
  setOptimisticLegendUpdates: (updatesByLegendId: Record<string, Partial<IGroup>>) => void;
  clearOptimisticLegendUpdate: (legendId: string) => void;
  setOptimisticUserLegends: (legends: IGroup[]) => void;
  setFilterPatterns: (patterns: string[]) => void;
  toggleFavoritesOptimistically: (paths: readonly string[]) => void;
  setDisabledCustomFilterPatterns: (patterns: string[]) => void;
  setDisabledPluginFilterPatterns: (patterns: string[]) => void;
  setRespectFilesExclude: (enabled: boolean) => void;
  setShowOrphans: (show: boolean) => void;
  setDirectionMode: (mode: DirectionMode) => void;
  setDirectionColor: (color: string) => void;
  setParticleSpeed: (speed: number) => void;
  setParticleSize: (size: number) => void;
  setPhysicsPaused: (paused: boolean) => void;
  setBidirectionalMode: (mode: BidirectionalEdgeMode) => void;
  setShowLabels: (show: boolean) => void;
  setCssSnippets: (snippets: Record<string, boolean>) => void;
  setDepthMode: (depthMode: boolean) => void;
  setDagMode: (mode: DagMode) => void;
  setMaxFiles: (max: number) => void;
  setVerboseDiagnostics: (enabled: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  beginInitialBootstrap: () => void;
  beginPluginAssetLoad: () => void;
  finishPluginAssetLoad: () => void;
  handleExtensionMessage: (message: ExtensionToWebviewMessage) => void;
}

export type GraphStateFields = Omit<GraphState, keyof ReturnType<typeof createActions>>;

export function createGraphStore() {
  return createStore<GraphState>((set, get) => ({
    ...INITIAL_STATE,
    ...createActions(set, get),
  }));
}

const store = createGraphStore();

export function useGraphStore<T>(selector: (state: GraphState) => T): T {
  return useZustandStore(store, selector);
}

export { store as graphStore };
