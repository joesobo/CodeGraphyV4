import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { FGNode } from '../../model/build';
import type { GraphWebviewMessageEffect } from './routing';

type SingleEffectKind =
  | 'fitView'
  | 'openInEditor'
  | 'exportPng'
  | 'exportSvg'
  | 'exportJpeg'
  | 'exportJson'
  | 'exportMarkdown';

type ZoomMessageType = Extract<ExtensionToWebviewMessage, { type: 'ZOOM_IN' | 'ZOOM_OUT' }>['type'];
type ExportMessageType = Extract<
  ExtensionToWebviewMessage,
  { type: 'REQUEST_EXPORT_PNG' | 'REQUEST_EXPORT_SVG' | 'REQUEST_EXPORT_JPEG' | 'REQUEST_EXPORT_JSON' | 'REQUEST_EXPORT_MD' | 'REQUEST_OPEN_IN_EDITOR' }
>['type'];
type GraphNodeBounds = Pick<FGNode, 'id' | 'size' | 'x' | 'y'>;

export const EMPTY_EFFECTS: GraphWebviewMessageEffect[] = [];

const EXPORT_EFFECT_KIND_BY_MESSAGE: Record<ExportMessageType, Exclude<SingleEffectKind, 'fitView'>> = {
  REQUEST_EXPORT_PNG: 'exportPng',
  REQUEST_EXPORT_SVG: 'exportSvg',
  REQUEST_EXPORT_JPEG: 'exportJpeg',
  REQUEST_EXPORT_JSON: 'exportJson',
  REQUEST_EXPORT_MD: 'exportMarkdown',
  REQUEST_OPEN_IN_EDITOR: 'openInEditor',
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
  messageType: ZoomMessageType,
): GraphWebviewMessageEffect[] {
  if (graphMode !== '2d') return EMPTY_EFFECTS;
  return [{ kind: 'zoom', factor: ZOOM_FACTOR_BY_MESSAGE[messageType] }];
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

export function getGraphRuntimeStateEffects(
  graphMode: '2d' | '3d',
  graphNodes: GraphNodeBounds[],
): GraphWebviewMessageEffect[] {
  return [{
    kind: 'postMessage',
    message: {
      type: 'GRAPH_RUNTIME_STATE_RESPONSE',
      payload: {
        graphMode,
        nodeCount: graphNodes.length,
      },
    },
  }];
}

export function getExportEffects(messageType: ExportMessageType): GraphWebviewMessageEffect[] {
  return singleEffect(EXPORT_EFFECT_KIND_BY_MESSAGE[messageType]);
}
