/**
 * @fileoverview Types for store message handling.
 * @module webview/storeMessageTypes
 */

import type {
  IGraphData,
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
  IAvailableView,
} from '../shared/contracts';
import type { SearchOptions } from './components/SearchBar';

/** All fields that the store can hold — used to type partial state updates. */
export interface IStoreFields {
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
