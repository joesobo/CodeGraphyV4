import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { ISettingsSnapshot } from '../../../shared/settings/snapshot';
import type { IGraphViewSettingsSnapshot } from './reader';

export function buildGraphViewSettingsMessages(
  settings: IGraphViewSettingsSnapshot,
): Array<
  | Extract<ExtensionToWebviewMessage, { type: 'SETTINGS_UPDATED' }>
  | Extract<ExtensionToWebviewMessage, { type: 'DIRECTION_SETTINGS_UPDATED' }>
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
        showLabels: snapshot.showLabels,
      }),
    ],
    postGroupMessages: [
      {
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: snapshot.filterPatterns,
          pluginPatterns,
          disabledCustomPatterns: snapshot.disabledCustomFilterPatterns,
          disabledPluginPatterns: snapshot.disabledPluginFilterPatterns,
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
