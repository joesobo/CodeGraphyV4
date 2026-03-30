import type { IFileInfo } from '../../../../shared/files/info';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { FGNode } from '../model/build';
import type { GraphWebviewMessageEffect } from './effects';

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
type AccessCountPayload = Extract<ExtensionToWebviewMessage, { type: 'NODE_ACCESS_COUNT_UPDATED' }>['payload'];
type GraphNodeBounds = Pick<FGNode, 'id' | 'size' | 'x' | 'y'>;

export const EMPTY_EFFECTS: GraphWebviewMessageEffect[] = [];

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

function toNodeBounds(node: GraphNodeBounds): {
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

export function getFitViewEffects(): GraphWebviewMessageEffect[] {
  return singleEffect('fitView');
}

export function getZoomEffects(
  graphMode: '2d' | '3d',
  messageType: ZoomMessageType
): GraphWebviewMessageEffect[] {
  if (graphMode !== '2d') return EMPTY_EFFECTS;
  return [{ kind: 'zoom', factor: ZOOM_FACTOR_BY_MESSAGE[messageType] }];
}

export function getFileInfoEffects(
  tooltipPath: string | null,
  info: IFileInfo
): GraphWebviewMessageEffect[] {
  const effects: GraphWebviewMessageEffect[] = [{ kind: 'cacheFileInfo', info }];
  if (tooltipPath === info.path) {
    effects.push({ kind: 'updateTooltipInfo', info });
  }
  return effects;
}

export function getNodeBoundsEffects(graphNodes: GraphNodeBounds[]): GraphWebviewMessageEffect[] {
  return [{
    kind: 'postMessage',
    message: {
      type: 'NODE_BOUNDS_RESPONSE',
      payload: { nodes: graphNodes.map(toNodeBounds) },
    },
  }];
}

export function getExportEffects(messageType: ExportMessageType): GraphWebviewMessageEffect[] {
  return singleEffect(EXPORT_EFFECT_KIND_BY_MESSAGE[messageType]);
}

export function getAccessCountEffects(payload: AccessCountPayload): GraphWebviewMessageEffect[] {
  return [{
    kind: 'updateAccessCount',
    nodeId: payload.nodeId,
    accessCount: payload.accessCount,
  }];
}
