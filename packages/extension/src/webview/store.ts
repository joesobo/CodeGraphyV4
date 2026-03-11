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
  IPluginStatus,
  ICommitInfo,
  ExtensionToWebviewMessage,
  NodeDecorationPayload,
  EdgeDecorationPayload,
  IPluginContextMenuItem,
} from '../shared/types';
import type { SearchOptions } from './components/SearchBar';

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
  setParticleSpeed: (speed: number) => void;
  setParticleSize: (size: number) => void;
  setShowLabels: (show: boolean) => void;
  setActiveViewId: (id: string) => void;
  setMaxFiles: (max: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setIsPlaying: (playing: boolean) => void;
  handleExtensionMessage: (message: ExtensionToWebviewMessage) => void;
}

export function createGraphStore() {
  return createStore<GraphState>((set) => ({
    // Initial state
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: DEFAULT_SEARCH_OPTIONS,
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
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
    setParticleSpeed: (speed) => set({ particleSpeed: speed }),
    setParticleSize: (size) => set({ particleSize: size }),
    setShowLabels: (show) => set({ showLabels: show }),
    setActiveViewId: (id) => set({ activeViewId: id }),
    setMaxFiles: (max) => set({ maxFiles: max }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    handleExtensionMessage: (message) => {
      switch (message.type) {
        case 'GRAPH_DATA_UPDATED':
          set({ graphData: message.payload, isLoading: false });
          break;
        case 'FAVORITES_UPDATED':
          set({ favorites: new Set(message.payload.favorites) });
          break;
        case 'SETTINGS_UPDATED':
          set({
            bidirectionalMode: message.payload.bidirectionalEdges,
            showOrphans: message.payload.showOrphans,
          });
          break;
        case 'GROUPS_UPDATED':
          set({ groups: message.payload.groups });
          break;
        case 'FILTER_PATTERNS_UPDATED':
          set({
            filterPatterns: message.payload.patterns,
            pluginFilterPatterns: message.payload.pluginPatterns,
          });
          break;
        case 'VIEWS_UPDATED':
          set({
            availableViews: message.payload.views,
            activeViewId: message.payload.activeViewId,
          });
          break;
        case 'PHYSICS_SETTINGS_UPDATED':
          set({ physicsSettings: message.payload });
          break;
        case 'DEPTH_LIMIT_UPDATED':
          set({ depthLimit: message.payload.depthLimit });
          break;
        case 'DIRECTION_SETTINGS_UPDATED':
          set({
            directionMode: message.payload.directionMode,
            particleSpeed: message.payload.particleSpeed,
            particleSize: message.payload.particleSize,
          });
          break;
        case 'SHOW_LABELS_UPDATED':
          set({ showLabels: message.payload.showLabels });
          break;
        case 'PLUGINS_UPDATED':
          set({ pluginStatuses: message.payload.plugins });
          break;
        case 'MAX_FILES_UPDATED':
          set({ maxFiles: message.payload.maxFiles });
          break;
        case 'INDEX_PROGRESS':
          set({ isIndexing: true, indexProgress: message.payload });
          break;
        case 'TIMELINE_DATA':
          set({
            isIndexing: false,
            indexProgress: null,
            timelineActive: true,
            timelineCommits: message.payload.commits,
            currentCommitSha: message.payload.currentSha,
          });
          break;
        case 'COMMIT_GRAPH_DATA':
          set({
            currentCommitSha: message.payload.sha,
            graphData: message.payload.graphData,
            isLoading: false,
          });
          break;
        case 'PLAYBACK_SPEED_UPDATED':
          set({ playbackSpeed: message.payload.speed });
          break;
        case 'CACHE_INVALIDATED':
          set({
            timelineActive: false,
            timelineCommits: [],
            currentCommitSha: null,
            isPlaying: false,
            isIndexing: false,
            indexProgress: null,
          });
          break;
        case 'PLAYBACK_ENDED':
          set({ isPlaying: false });
          break;
        case 'DECORATIONS_UPDATED':
          set({
            nodeDecorations: message.payload.nodeDecorations,
            edgeDecorations: message.payload.edgeDecorations,
          });
          break;
        case 'CONTEXT_MENU_ITEMS':
          set({ pluginContextMenuItems: message.payload.items });
          break;
        case 'PLUGIN_WEBVIEW_INJECT':
          // Tier 2: will be implemented later
          break;
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
