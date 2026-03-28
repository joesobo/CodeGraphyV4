/**
 * @fileoverview Initial state values for the graph store.
 * @module webview/storeInitialState
 */

import { DEFAULT_FOLDER_NODE_COLOR, DEFAULT_DIRECTION_COLOR } from '../shared/contracts';
import { DEFAULT_PHYSICS, DEFAULT_SEARCH_OPTIONS } from './storeDefaults';

export const INITIAL_STATE = {
  graphData: null,
  isLoading: true,
  searchQuery: '',
  searchOptions: DEFAULT_SEARCH_OPTIONS,
  favorites: new Set<string>(),
  bidirectionalMode: 'separate' as const,
  showOrphans: true,
  directionMode: 'arrows' as const,
  directionColor: DEFAULT_DIRECTION_COLOR,
  particleSpeed: 0.005,
  particleSize: 4,
  showLabels: true,
  graphMode: '2d' as const,
  nodeSizeMode: 'connections' as const,
  physicsSettings: DEFAULT_PHYSICS,
  depthLimit: 1,
  groups: [] as never[],
  filterPatterns: [] as string[],
  pluginFilterPatterns: [] as string[],
  availableViews: [] as never[],
  activeViewId: 'codegraphy.connections',
  dagMode: null,
  folderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
  pluginStatuses: [] as never[],
  nodeDecorations: {},
  edgeDecorations: {},
  pluginContextMenuItems: [] as never[],
  expandedGroupId: null,
  activePanel: 'none' as const,
  maxFiles: 500,
  timelineActive: false,
  timelineCommits: [] as never[],
  currentCommitSha: null,
  isIndexing: false,
  indexProgress: null,
  isPlaying: false,
  playbackSpeed: 1.0,
};
