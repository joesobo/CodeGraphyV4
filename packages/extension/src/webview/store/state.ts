import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import type { SearchOptions } from '../components/searchBar/field/model';
import { INITIAL_STATE } from './initialState';
import { createActions } from './actions';
import type { IGraphData } from '../../shared/graph/types';
import type { IPluginContextMenuItem } from '../../shared/plugins/contextMenu';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../shared/plugins/decorations';
import type { IPluginStatus } from '../../shared/plugins/status';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../shared/settings/groups';
import type { BidirectionalEdgeMode, DagMode, DirectionMode, NodeSizeMode } from '../../shared/settings/modes';
import type { IPhysicsSettings } from '../../shared/settings/physics';
import type { ICommitInfo } from '../../shared/timeline/types';
import type { IAvailableView } from '../../shared/view/types';
import type {
  PendingGroupUpdates,
  PendingUserGroupsUpdate,
} from './optimisticGroups';

export interface GraphState {
  graphData: IGraphData | null;
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
  folderNodeColor: string;
  pluginStatuses: IPluginStatus[];
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];
  activePanel: 'none' | 'settings' | 'plugins';
  maxFiles: number;
  activeFilePath: string | null;
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
  setActivePanel: (panel: 'none' | 'settings' | 'plugins') => void;
  setGraphMode: (mode: '2d' | '3d') => void;
  setNodeSizeMode: (mode: NodeSizeMode) => void;
  setPhysicsSettings: (settings: IPhysicsSettings) => void;
  setGroups: (groups: IGroup[]) => void;
  setOptimisticGroupUpdate: (groupId: string, updates: Partial<IGroup>) => void;
  clearOptimisticGroupUpdate: (groupId: string) => void;
  setOptimisticUserGroups: (groups: IGroup[]) => void;
  setFilterPatterns: (patterns: string[]) => void;
  setShowOrphans: (show: boolean) => void;
  setDirectionMode: (mode: DirectionMode) => void;
  setDirectionColor: (color: string) => void;
  setParticleSpeed: (speed: number) => void;
  setParticleSize: (size: number) => void;
  setBidirectionalMode: (mode: BidirectionalEdgeMode) => void;
  setShowLabels: (show: boolean) => void;
  setActiveViewId: (id: string) => void;
  setDagMode: (mode: DagMode) => void;
  setFolderNodeColor: (color: string) => void;
  setMaxFiles: (max: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
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
