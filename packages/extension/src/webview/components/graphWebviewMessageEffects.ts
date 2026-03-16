import type {
  ExtensionToWebviewMessage,
  IFileInfo,
  WebviewToExtensionMessage,
} from '../../shared/types';
import type { FGNode } from './graphModel';

export type GraphWebviewMessageEffect =
  | { kind: 'fitView' }
  | { kind: 'zoom'; factor: number }
  | { kind: 'cacheFileInfo'; info: IFileInfo }
  | { kind: 'updateTooltipInfo'; info: IFileInfo }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage }
  | { kind: 'exportPng' }
  | { kind: 'exportSvg' }
  | { kind: 'exportJpeg' }
  | { kind: 'exportJson' }
  | { kind: 'exportMarkdown' }
  | { kind: 'updateAccessCount'; nodeId: string; accessCount: number };

export interface GraphWebviewMessageOptions {
  message: ExtensionToWebviewMessage;
  graphMode: '2d' | '3d';
  tooltipPath: string | null;
  graphNodes: Array<Pick<FGNode, 'id' | 'size' | 'x' | 'y'>>;
}

type SingleEffectKind =
  | 'fitView'
  | 'exportPng'
  | 'exportSvg'
  | 'exportJpeg'
  | 'exportJson'
  | 'exportMarkdown';

type ZoomMessageType = Extract<ExtensionToWebviewMessage, { type: 'ZOOM_IN' | 'ZOOM_OUT' }>['type'];
type ExportMessageType = Extract<
  ExtensionToWebviewMessage,
  { type: 'REQUEST_EXPORT_PNG' | 'REQUEST_EXPORT_SVG' | 'REQUEST_EXPORT_JPEG' | 'REQUEST_EXPORT_JSON' | 'REQUEST_EXPORT_MD' }
>['type'];

// Stryker disable all
const EMPTY_EFFECTS: GraphWebviewMessageEffect[] = [];

const EXPORT_EFFECT_KIND_BY_MESSAGE: Record<ExportMessageType, Exclude<SingleEffectKind, 'fitView'>> = {
  REQUEST_EXPORT_PNG: 'exportPng',
  REQUEST_EXPORT_SVG: 'exportSvg',
  REQUEST_EXPORT_JPEG: 'exportJpeg',
  REQUEST_EXPORT_JSON: 'exportJson',
  REQUEST_EXPORT_MD: 'exportMarkdown',
};

const ZOOM_FACTOR_BY_MESSAGE: Record<ZoomMessageType, number> = {
  ZOOM_IN: 1.2,
  ZOOM_OUT: 1 / 1.2,
};

function singleEffect(kind: SingleEffectKind): GraphWebviewMessageEffect[] {
  return [{ kind }];
}
// Stryker restore all

function getZoomEffects(
  graphMode: '2d' | '3d',
  messageType: ZoomMessageType
): GraphWebviewMessageEffect[] {
  if (graphMode !== '2d') return EMPTY_EFFECTS;
  return [{ kind: 'zoom', factor: ZOOM_FACTOR_BY_MESSAGE[messageType] }];
}

function getFileInfoEffects(
  tooltipPath: string | null,
  info: IFileInfo
): GraphWebviewMessageEffect[] {
  const effects: GraphWebviewMessageEffect[] = [{ kind: 'cacheFileInfo', info }];
  if (tooltipPath === info.path) {
    effects.push({ kind: 'updateTooltipInfo', info });
  }
  return effects;
}

function toNodeBounds(node: Pick<FGNode, 'id' | 'size' | 'x' | 'y'>): {
  id: string;
  x: number;
  y: number;
  size: number;
} {
  return {
    id: node.id,
    x: node.x ?? 0,
    y: node.y ?? 0,
    size: node.size,
  };
}

function getNodeBoundsEffects(
  graphNodes: Array<Pick<FGNode, 'id' | 'size' | 'x' | 'y'>>
): GraphWebviewMessageEffect[] {
  return [{
    kind: 'postMessage',
    message: {
      type: 'NODE_BOUNDS_RESPONSE',
      payload: { nodes: graphNodes.map(toNodeBounds) },
    },
  }];
}

// Stryker disable all
function getAccessCountEffects(
  payload: Extract<ExtensionToWebviewMessage, { type: 'NODE_ACCESS_COUNT_UPDATED' }>['payload']
): GraphWebviewMessageEffect[] {
  return [{
    kind: 'updateAccessCount',
    nodeId: payload.nodeId,
    accessCount: payload.accessCount,
  }];
}
// Stryker restore all

export function getGraphWebviewMessageEffects(
  options: GraphWebviewMessageOptions
): GraphWebviewMessageEffect[] {
  const { message, graphMode, tooltipPath, graphNodes } = options;

  switch (message.type) {
    case 'FIT_VIEW':
      return singleEffect('fitView');
    case 'ZOOM_IN':
    case 'ZOOM_OUT':
      return getZoomEffects(graphMode, message.type);
    case 'FILE_INFO':
      return getFileInfoEffects(tooltipPath, message.payload);
    case 'GET_NODE_BOUNDS':
      return getNodeBoundsEffects(graphNodes);
    case 'REQUEST_EXPORT_PNG':
    case 'REQUEST_EXPORT_SVG':
    case 'REQUEST_EXPORT_JPEG':
    case 'REQUEST_EXPORT_JSON':
    case 'REQUEST_EXPORT_MD':
      return singleEffect(EXPORT_EFFECT_KIND_BY_MESSAGE[message.type]);
    case 'NODE_ACCESS_COUNT_UPDATED':
      return getAccessCountEffects(message.payload);
    default:
      return EMPTY_EFFECTS;
  }
}
