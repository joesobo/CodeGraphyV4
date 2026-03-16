import { createStore } from 'zustand/vanilla';
import { useStore as useZustandStore } from 'zustand';
import type {
  IGraphData,
  IAvailableView,
  BidirectionalEdgeMode,
  IPhysicsSettings,
  IGroup,
  NodeSizeMode,
  DirectionMode,
  DagMode,
  IPluginStatus,
  ICommitInfo,
  ExtensionToWebviewMessage,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  IPluginContextMenuItem,
} from '../shared/types';
import type { SearchOptions } from './components/SearchBar';
import { INITIAL_STATE } from './storeInitialState';
import { createActions } from './storeActions';

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
  groups: IGroup[];
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
