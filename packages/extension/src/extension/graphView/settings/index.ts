import type {
  ExtensionToWebviewMessage,
  IPhysicsSettings,
  ISettingsSnapshot,
  NodeSizeMode,
} from '../../../shared/contracts';
import { readGraphViewSettings } from './config';
import type { IGraphViewSettingsSnapshot } from './config';

interface GraphViewSettingsConfig {
  get<T>(section: string, defaultValue: T): T;
}

export function captureGraphViewSettingsSnapshot(
  config: GraphViewSettingsConfig,
  physics: IPhysicsSettings,
  nodeSizeMode: NodeSizeMode,
): ISettingsSnapshot {
  const settings = readGraphViewSettings(config);

  return {
    physics,
    groups: config.get('groups', []),
    filterPatterns: config.get('filterPatterns', []),
    showOrphans: config.get('showOrphans', true),
    bidirectionalMode: config.get('bidirectionalEdges', 'separate'),
    directionMode: config.get('directionMode', 'arrows'),
    directionColor: settings.directionColor,
    folderNodeColor: settings.folderNodeColor,
    particleSpeed: config.get('particleSpeed', 0.005),
    particleSize: config.get('particleSize', 4),
    showLabels: config.get('showLabels', true),
    maxFiles: config.get('maxFiles', 500),
    hiddenPluginGroups: config.get('hiddenPluginGroups', []),
    nodeSizeMode,
  };
}

export function buildGraphViewSettingsMessages(
  settings: IGraphViewSettingsSnapshot,
): Array<
  | Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>
  | Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>
  | Extract<ExtensionToWebviewMessage, { type: 'FOLDER_NODE_COLOR_UPDATED' }>
  | Extract<ExtensionToWebviewMessage, { type: 'SHOW_LABELS_UPDATED' }>
> {
  return [
    {
      type: 'SETTINGS_UPDATED',
      payload: {
        bidirectionalEdges: settings.bidirectionalEdges,
        showOrphans: settings.showOrphans,
      },
    },
    {
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: settings.directionMode,
        particleSpeed: settings.particleSpeed,
        particleSize: settings.particleSize,
        directionColor: settings.directionColor,
      },
    },
    {
      type: 'FOLDER_NODE_COLOR_UPDATED',
      payload: { folderNodeColor: settings.folderNodeColor },
    },
    {
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: settings.showLabels },
    },
  ];
}

export function buildGraphViewAllSettingsMessages(
  snapshot: ISettingsSnapshot,
  pluginPatterns: string[],
): {
  preGroupMessages: ExtensionToWebviewMessage[];
  postGroupMessages: ExtensionToWebviewMessage[];
} {
  return {
    preGroupMessages: [
      { type: 'PHYSICS_SETTINGS_UPDATED', payload: snapshot.physics },
      ...buildGraphViewSettingsMessages({
        bidirectionalEdges: snapshot.bidirectionalMode,
        showOrphans: snapshot.showOrphans,
        directionMode: snapshot.directionMode,
        particleSpeed: snapshot.particleSpeed,
        particleSize: snapshot.particleSize,
        directionColor: snapshot.directionColor,
        folderNodeColor: snapshot.folderNodeColor,
        showLabels: snapshot.showLabels,
      }),
    ],
    postGroupMessages: [
      {
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: snapshot.filterPatterns,
          pluginPatterns,
        },
      },
      {
        type: 'MAX_FILES_UPDATED',
        payload: { maxFiles: snapshot.maxFiles },
      },
      {
        type: 'NODE_SIZE_MODE_UPDATED',
        payload: { nodeSizeMode: snapshot.nodeSizeMode },
      },
    ],
  };
}
