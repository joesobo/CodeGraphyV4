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
import { DEFAULT_FOLDER_NODE_COLOR, DEFAULT_DIRECTION_COLOR } from '../shared/types';
import type { SearchOptions } from './components/SearchBar';
import { postMessage } from './vscodeApi';
import { MESSAGE_HANDLERS } from './storeMessages';

const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 10,
  linkDistance: 80,
  linkForce: 0.15,
  damping: 0.7,
  centerForce: 0.1,
};

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  matchCase: false,
  wholeWord: false,
  regex: false,
};

export interface GraphState {
  // Graph data
  graphData: IGraphData | null;
  isLoading: boolean;

  // Search
  searchQuery: string;
  searchOptions: SearchOptions;

  // Favorites
  favorites: Set<string>;

  // Display
  bidirectionalMode: BidirectionalEdgeMode;
  showOrphans: boolean;
  directionMode: DirectionMode;
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  showLabels: boolean;
  graphMode: '2d' | '3d';
  nodeSizeMode: NodeSizeMode;

  // Physics
  physicsSettings: IPhysicsSettings;
  depthLimit: number;

  // Groups/Filters
  groups: IGroup[];
  filterPatterns: string[];
  pluginFilterPatterns: string[];

  // Views
  availableViews: IAvailableView[];
  activeViewId: string;

  // DAG layout
  dagMode: DagMode;

  // Folder node color
  folderNodeColor: string;

  // Plugins
  pluginStatuses: IPluginStatus[];

  // Plugin API v2
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
  pluginContextMenuItems: IPluginContextMenuItem[];

  // UI
  activePanel: 'none' | 'settings' | 'plugins';
  maxFiles: number;

  // Timeline
  timelineActive: boolean;
  timelineCommits: ICommitInfo[];
  currentCommitSha: string | null;
  isIndexing: boolean;
  indexProgress: { phase: string; current: number; total: number } | null;
  isPlaying: boolean;
  playbackSpeed: number;

  // Group editor
  expandedGroupId: string | null;
  setExpandedGroupId: (id: string | null) => void;

  // Actions
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
    // Initial state
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: DEFAULT_SEARCH_OPTIONS,
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    nodeSizeMode: 'connections',
    physicsSettings: DEFAULT_PHYSICS,
    depthLimit: 1,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    dagMode: null,
    folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
    pluginStatuses: [],
    nodeDecorations: {},
    edgeDecorations: {},
    pluginContextMenuItems: [],
    expandedGroupId: null,
    activePanel: 'none',
    maxFiles: 500,
    timelineActive: false,
    timelineCommits: [],
    currentCommitSha: null,
    isIndexing: false,
    indexProgress: null,
    isPlaying: false,
    playbackSpeed: 1.0,

    // Actions
    setExpandedGroupId: (id) => set({ expandedGroupId: id }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setSearchOptions: (options) => set({ searchOptions: options }),
    setActivePanel: (panel) => set({ activePanel: panel }),
    setGraphMode: (mode) => set({ graphMode: mode }),
    setNodeSizeMode: (mode) => set({ nodeSizeMode: mode }),
    setPhysicsSettings: (settings) => set({ physicsSettings: settings }),
    setGroups: (groups) => set({ groups }),
    setFilterPatterns: (patterns) => set({ filterPatterns: patterns }),
    setShowOrphans: (show) => set({ showOrphans: show }),
    setDirectionMode: (mode) => set({ directionMode: mode }),
    setDirectionColor: (color) => set({ directionColor: color }),
    setParticleSpeed: (speed) => set({ particleSpeed: speed }),
    setParticleSize: (size) => set({ particleSize: size }),
    setBidirectionalMode: (mode) => set({ bidirectionalMode: mode }),
    setShowLabels: (show) => set({ showLabels: show }),
    setActiveViewId: (id) => set({ activeViewId: id }),
    setDagMode: (mode) => set({ dagMode: mode }),
    setFolderNodeColor: (color) => set({ folderNodeColor: color }),
    setMaxFiles: (max) => set({ maxFiles: max }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    handleExtensionMessage: (message) => {
      const handler = MESSAGE_HANDLERS[message.type];
      if (!handler) return;

      const ctx = {
        getState: get,
        postMessage: postMessage as (msg: { type: string; payload: unknown }) => void,
      };

      const update = handler(message, ctx);
      if (update) {
        set(update);
      }
    },
  }));
}

// Default store instance for the app
const store = createGraphStore();

/**
 * Hook to access the graph store with a selector.
 * Usage: `const directionMode = useGraphStore(s => s.directionMode)`
 */
export function useGraphStore<T>(selector: (state: GraphState) => T): T {
  return useZustandStore(store, selector);
}

/** Direct access to store (for use outside React, e.g. message handlers) */
export { store as graphStore };
