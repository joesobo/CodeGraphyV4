import type { WebviewToExtensionMessage } from '../../shared/types';
import type { BuiltInContextMenuAction, GraphContextMenuAction } from './graphContextMenu';

export type GraphContextEffect =
  | { kind: 'openFile'; path: string }
  | { kind: 'focusNode'; nodeId: string }
  | { kind: 'fitView' }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage };

function firstOrUndefined(values: string[]): string | undefined {
  return values[0];
}

export function getBuiltInContextActionEffects(
  action: BuiltInContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  switch (action) {
    case 'open':
      return targetPaths.map(path => ({ kind: 'openFile', path }));
    case 'reveal': {
      const path = firstOrUndefined(targetPaths);
      return path
        ? [{ kind: 'postMessage', message: { type: 'REVEAL_IN_EXPLORER', payload: { path } } }]
        : [];
    }
    case 'copyRelative':
      return [{
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: targetPaths.join('\n') } },
      }];
    case 'copyAbsolute': {
      const path = firstOrUndefined(targetPaths);
      return path
        ? [{ kind: 'postMessage', message: { type: 'COPY_TO_CLIPBOARD', payload: { text: `absolute:${path}` } } }]
        : [];
    }
    case 'copyEdgeSource': {
      const path = firstOrUndefined(targetPaths);
      return path
        ? [{ kind: 'postMessage', message: { type: 'COPY_TO_CLIPBOARD', payload: { text: path } } }]
        : [];
    }
    case 'copyEdgeTarget': {
      const path = targetPaths[1];
      return path
        ? [{ kind: 'postMessage', message: { type: 'COPY_TO_CLIPBOARD', payload: { text: path } } }]
        : [];
    }
    case 'copyEdgeBoth':
      return [{
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: targetPaths.join('\n') } },
      }];
    case 'toggleFavorite':
      return [{ kind: 'postMessage', message: { type: 'TOGGLE_FAVORITE', payload: { paths: targetPaths } } }];
    case 'focus': {
      const nodeId = firstOrUndefined(targetPaths);
      return nodeId ? [{ kind: 'focusNode', nodeId }] : [];
    }
    case 'addToFilter':
      return [{ kind: 'postMessage', message: { type: 'ADD_TO_EXCLUDE', payload: { patterns: targetPaths } } }];
    case 'rename': {
      const path = firstOrUndefined(targetPaths);
      return path
        ? [{ kind: 'postMessage', message: { type: 'RENAME_FILE', payload: { path } } }]
        : [];
    }
    case 'delete':
      return [{ kind: 'postMessage', message: { type: 'DELETE_FILES', payload: { paths: targetPaths } } }];
    case 'refresh':
      return [{ kind: 'postMessage', message: { type: 'REFRESH_GRAPH' } }];
    case 'fitView':
      return [{ kind: 'fitView' }];
    case 'createFile':
      return [{ kind: 'postMessage', message: { type: 'CREATE_FILE', payload: { directory: '.' } } }];
  }
}

export function getGraphContextActionEffects(
  action: GraphContextMenuAction,
  targetPaths: string[]
): GraphContextEffect[] {
  if (action.kind === 'builtin') {
    return getBuiltInContextActionEffects(action.action, targetPaths);
  }

  return [{
    kind: 'postMessage',
    message: {
      type: 'PLUGIN_CONTEXT_MENU_ACTION',
      payload: {
        pluginId: action.pluginId,
        index: action.index,
        targetId: action.targetId,
        targetType: action.targetType,
      },
    },
  }];
}
