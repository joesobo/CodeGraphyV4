import type { IFileInfo } from '../../../../shared/files/info';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { FGNode } from '../model/build';
import {
  EMPTY_EFFECTS,
  getAccessCountEffects,
  getExportEffects,
  getFileInfoEffects,
  getFitViewEffects,
  getNodeBoundsEffects,
  getZoomEffects,
} from './effectBuilders';

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
      return getFitViewEffects();
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
      return getExportEffects(message.type);
    case 'NODE_ACCESS_COUNT_UPDATED':
      return getAccessCountEffects(message.payload);
    default:
      return EMPTY_EFFECTS;
  }
}
