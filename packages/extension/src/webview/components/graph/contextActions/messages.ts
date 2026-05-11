import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { GraphContextActionContext } from './context';
import type { GraphContextEffect } from './effects';

type SinglePathMessageType = 'REVEAL_IN_EXPLORER' | 'RENAME_FILE';
type PathListMessageType = 'DELETE_FILES' | 'TOGGLE_FAVORITE';

function createPostMessageEffect(message: WebviewToExtensionMessage): GraphContextEffect {
  return { kind: 'postMessage', message };
}

export function createOptionalSinglePathMessageEffects(
  path: string | undefined,
  type: SinglePathMessageType,
): GraphContextEffect[] {
  return path ? [createPostMessageEffect({ type, payload: { path } })] : [];
}

export function createClipboardEffects(text: string): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'COPY_TO_CLIPBOARD', payload: { text } })];
}

export function createOptionalClipboardEffects(
  path: string | undefined,
  transform: (value: string) => string = (value) => value,
): GraphContextEffect[] {
  return path ? createClipboardEffects(transform(path)) : [];
}

export function createPathListMessageEffects(
  type: PathListMessageType,
  paths: readonly string[],
): GraphContextEffect[] {
  return [createPostMessageEffect({ type, payload: { paths: [...paths] } })];
}

export function createPatternMessageEffects(patterns: readonly string[]): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'ADD_TO_EXCLUDE', payload: { patterns: [...patterns] } })];
}

export function createRefreshEffects(): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'REFRESH_GRAPH' })];
}

export function createCreateFileEffects(directory = '.'): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'CREATE_FILE', payload: { directory } })];
}

export function createCreateFolderEffects(directory = '.'): GraphContextEffect[] {
  return [createPostMessageEffect({ type: 'CREATE_FOLDER', payload: { directory } })];
}

export function createGraphLayoutCollapseEffects(
  nodeId: string | undefined,
  collapsed: boolean,
): GraphContextEffect[] {
  return nodeId
    ? [createPostMessageEffect({
        type: 'UPDATE_GRAPH_LAYOUT_COLLAPSE',
        payload: { nodeId, collapsed },
      })]
    : [];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createPinNodeEffects(context: GraphContextActionContext): GraphContextEffect[] {
  const nodeId = context.primaryTargetId;
  if (!nodeId) {
    return [];
  }

  const position = context.nodePositions.get(nodeId);
  if (!position || !isFiniteNumber(position.x) || !isFiniteNumber(position.y)) {
    return [];
  }

  if (context.graphMode === '3d') {
    if (!('z' in position) || !isFiniteNumber(position.z)) {
      return [];
    }

    return [createPostMessageEffect({
      type: 'UPDATE_GRAPH_LAYOUT_PIN',
      payload: {
        graphMode: context.graphMode,
        nodeId,
        position: { x: position.x, y: position.y, z: position.z },
      },
    })];
  }

  return [createPostMessageEffect({
    type: 'UPDATE_GRAPH_LAYOUT_PIN',
    payload: {
      graphMode: context.graphMode,
      nodeId,
      position: { x: position.x, y: position.y },
    },
  })];
}

export function createClearPinNodeEffects(context: GraphContextActionContext): GraphContextEffect[] {
  return context.primaryTargetId
    ? [createPostMessageEffect({
      type: 'CLEAR_GRAPH_LAYOUT_PIN',
      payload: { graphMode: context.graphMode, nodeId: context.primaryTargetId },
    })]
    : [];
}
