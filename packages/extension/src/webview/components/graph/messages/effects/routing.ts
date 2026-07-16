import type { IFileInfo } from '../../../../../shared/files/info';
import type { ExtensionToWebviewMessage } from '../../../../../shared/protocol/extensionToWebview';
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { FGLink, FGNode } from '../../model/build';
import { getFileInfoEffects } from '../fileInfo/effects';
import {
  EMPTY_EFFECTS,
  getExportEffects,
  getFitViewEffects,
  getGraphRuntimeStateEffects,
  getNodeBoundsEffects,
  getZoomEffects,
} from './runtime';

export type GraphWebviewMessageEffect =
  | { kind: 'fitView' }
  | { kind: 'zoom'; factor: number }
  | { kind: 'cacheFileInfo'; info: IFileInfo }
  | { kind: 'updateTooltipInfo'; info: IFileInfo }
  | { kind: 'postMessage'; message: WebviewToExtensionMessage }
  | { kind: 'openInEditor' }
  | { kind: 'exportPng' }
  | { kind: 'exportSvg' }
  | { kind: 'exportJpeg' }
  | { kind: 'exportJson' }
  | { kind: 'exportMarkdown' };

export interface GraphWebviewMessageOptions {
  message: ExtensionToWebviewMessage;
  tooltipPath: string | null;
  graphLinks?: readonly FGLink[];
  graphNodes: Array<Pick<FGNode, 'id' | 'size' | 'x' | 'y'>>;
}

type ZoomMessage = Extract<ExtensionToWebviewMessage, { type: 'ZOOM_IN' | 'ZOOM_OUT' }>;
type FileInfoMessage = Extract<ExtensionToWebviewMessage, { type: 'FILE_INFO' }>;
type ExportMessage = Extract<
  ExtensionToWebviewMessage,
  {
    type:
      | 'REQUEST_EXPORT_PNG'
      | 'REQUEST_EXPORT_SVG'
      | 'REQUEST_EXPORT_JPEG'
      | 'REQUEST_EXPORT_JSON'
      | 'REQUEST_EXPORT_MD'
      | 'REQUEST_OPEN_IN_EDITOR';
  }
>;
const GRAPH_WEBVIEW_MESSAGE_EFFECTS = {
  FIT_VIEW: () => getFitViewEffects(),
  ZOOM_IN: ({ message }: GraphWebviewMessageOptions) =>
    getZoomEffects((message as ZoomMessage).type),
  ZOOM_OUT: ({ message }: GraphWebviewMessageOptions) =>
    getZoomEffects((message as ZoomMessage).type),
  FILE_INFO: ({ tooltipPath, message }: GraphWebviewMessageOptions) =>
    getFileInfoEffects(tooltipPath, (message as FileInfoMessage).payload),
  GET_NODE_BOUNDS: ({ graphNodes }: GraphWebviewMessageOptions) =>
    getNodeBoundsEffects(graphNodes),
  GET_GRAPH_RUNTIME_STATE: ({ graphLinks = [], graphNodes }: GraphWebviewMessageOptions) =>
    getGraphRuntimeStateEffects(graphNodes, graphLinks),
  REQUEST_EXPORT_PNG: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
  REQUEST_EXPORT_SVG: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
  REQUEST_EXPORT_JPEG: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
  REQUEST_EXPORT_JSON: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
  REQUEST_EXPORT_MD: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
  REQUEST_OPEN_IN_EDITOR: ({ message }: GraphWebviewMessageOptions) =>
    getExportEffects((message as ExportMessage).type),
} satisfies Partial<
  Record<ExtensionToWebviewMessage['type'], (options: GraphWebviewMessageOptions) => GraphWebviewMessageEffect[]>
>;

export function getGraphWebviewMessageEffects(
  options: GraphWebviewMessageOptions
): GraphWebviewMessageEffect[] {
  const effectBuilder = GRAPH_WEBVIEW_MESSAGE_EFFECTS[
    options.message.type as keyof typeof GRAPH_WEBVIEW_MESSAGE_EFFECTS
  ];
  return effectBuilder?.(options) ?? EMPTY_EFFECTS;
}
