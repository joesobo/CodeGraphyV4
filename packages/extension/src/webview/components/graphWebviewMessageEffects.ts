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

export function getGraphWebviewMessageEffects(
  options: GraphWebviewMessageOptions
): GraphWebviewMessageEffect[] {
  const { message, graphMode, tooltipPath, graphNodes } = options;

  switch (message.type) {
    case 'FIT_VIEW':
      return [{ kind: 'fitView' }];
    case 'ZOOM_IN':
      return graphMode === '2d' ? [{ kind: 'zoom', factor: 1.2 }] : [];
    case 'ZOOM_OUT':
      return graphMode === '2d' ? [{ kind: 'zoom', factor: 1 / 1.2 }] : [];
    case 'FAVORITES_UPDATED':
      return [];
    case 'FILE_INFO':
      return tooltipPath === message.payload.path
        ? [
            { kind: 'cacheFileInfo', info: message.payload },
            { kind: 'updateTooltipInfo', info: message.payload },
          ]
        : [{ kind: 'cacheFileInfo', info: message.payload }];
    case 'GET_NODE_BOUNDS':
      return [{
        kind: 'postMessage',
        message: {
          type: 'NODE_BOUNDS_RESPONSE',
          payload: {
            nodes: graphNodes.map(node => ({
              id: node.id,
              x: node.x ?? 0,
              y: node.y ?? 0,
              size: node.size,
            })),
          },
        },
      }];
    case 'REQUEST_EXPORT_PNG':
      return [{ kind: 'exportPng' }];
    case 'REQUEST_EXPORT_SVG':
      return [{ kind: 'exportSvg' }];
    case 'REQUEST_EXPORT_JPEG':
      return [{ kind: 'exportJpeg' }];
    case 'REQUEST_EXPORT_JSON':
      return [{ kind: 'exportJson' }];
    case 'REQUEST_EXPORT_MD':
      return [{ kind: 'exportMarkdown' }];
    case 'NODE_ACCESS_COUNT_UPDATED':
      return [{
        kind: 'updateAccessCount',
        nodeId: message.payload.nodeId,
        accessCount: message.payload.accessCount,
      }];
    default:
      return [];
  }
}
