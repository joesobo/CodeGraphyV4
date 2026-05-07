import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import {
  DEFAULT_GRAPH_SECTION_COLOR,
  DEFAULT_GRAPH_SECTION_HEIGHT,
  DEFAULT_GRAPH_SECTION_WIDTH,
  GRAPH_SECTION_SELECTION_PADDING,
} from '../../../../shared/settings/graphLayout';
import type {
  GraphContextActionContext,
  GraphContextNodePosition2D,
  GraphContextNodePosition3D,
} from './context';
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

interface SectionBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readPinNodePosition(
  context: GraphContextActionContext,
  nodeId: string,
): GraphContextNodePosition2D | GraphContextNodePosition3D | undefined {
  const position = context.nodePositions.get(nodeId);
  if (!position || !isFiniteNumber(position.x) || !isFiniteNumber(position.y)) {
    return undefined;
  }

  if (context.graphMode === '3d') {
    return 'z' in position && isFiniteNumber(position.z)
      ? { x: position.x, y: position.y, z: position.z }
      : undefined;
  }

  return { x: position.x, y: position.y };
}

function createPinNodeEffect(
  context: GraphContextActionContext,
  nodeId: string,
  position: GraphContextNodePosition2D | GraphContextNodePosition3D,
): GraphContextEffect {
  return createPostMessageEffect({
    type: 'UPDATE_GRAPH_LAYOUT_PIN',
    payload: {
      graphMode: context.graphMode,
      nodeId,
      position,
    },
  });
}

export function createPinNodeEffects(context: GraphContextActionContext): GraphContextEffect[] {
  const nodeId = context.primaryTargetId;
  if (!nodeId) {
    return [];
  }

  const position = readPinNodePosition(context, nodeId);
  if (!position) {
    return [];
  }

  return [createPinNodeEffect(context, nodeId, position)];
}

export function createClearPinNodeEffects(context: GraphContextActionContext): GraphContextEffect[] {
  return context.primaryTargetId
    ? [createPostMessageEffect({
      type: 'CLEAR_GRAPH_LAYOUT_PIN',
      payload: { graphMode: context.graphMode, nodeId: context.primaryTargetId },
    })]
    : [];
}

function getDefaultSectionBounds(context: GraphContextActionContext): SectionBounds {
  const center = context.graphPosition ?? { x: 0, y: 0 };
  return {
    height: DEFAULT_GRAPH_SECTION_HEIGHT,
    width: DEFAULT_GRAPH_SECTION_WIDTH,
    x: center.x - (DEFAULT_GRAPH_SECTION_WIDTH / 2),
    y: center.y - (DEFAULT_GRAPH_SECTION_HEIGHT / 2),
  };
}

function getSelectionSectionBounds(context: GraphContextActionContext): SectionBounds | undefined {
  const positions = context.targetIds
    .map(nodeId => context.nodePositions.get(nodeId))
    .filter((position): position is { x: number; y: number } =>
      !!position && isFiniteNumber(position.x) && isFiniteNumber(position.y),
    );
  if (positions.length === 0) {
    return undefined;
  }

  const xs = positions.map(position => position.x);
  const ys = positions.map(position => position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    height: (maxY - minY) + (GRAPH_SECTION_SELECTION_PADDING * 2),
    width: (maxX - minX) + (GRAPH_SECTION_SELECTION_PADDING * 2),
    x: minX - GRAPH_SECTION_SELECTION_PADDING,
    y: minY - GRAPH_SECTION_SELECTION_PADDING,
  };
}

export function createGraphSectionEffects(context: GraphContextActionContext): GraphContextEffect[] {
  if (context.graphMode !== '2d') {
    return [];
  }

  const bounds = context.selectionKind === 'node'
    ? getSelectionSectionBounds(context) ?? getDefaultSectionBounds(context)
    : getDefaultSectionBounds(context);

  return [createPostMessageEffect({
    type: 'CREATE_GRAPH_LAYOUT_SECTION',
    payload: {
      color: DEFAULT_GRAPH_SECTION_COLOR,
      height: bounds.height,
      memberNodeIds: context.selectionKind === 'node' ? [...context.targetIds] : [],
      width: bounds.width,
      x: bounds.x,
      y: bounds.y,
    },
  })];
}
