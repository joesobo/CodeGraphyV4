import type { Disposable } from '../../../../disposable';
import { toDisposable } from '../../../../disposable';
import type { ExportRequest } from '../../../../../../../../plugin-api/src/api';
import type { ApiContext } from '../state/context';

type WebviewContext = Pick<
  ApiContext,
  'pluginId' | 'webviewSender' | 'webviewMessageHandlers' | 'exportSaver'
>;

export function sendPluginWebviewMessage(
  context: WebviewContext,
  msg: { type: string; data: unknown },
): void {
  context.webviewSender({
    type: `plugin:${context.pluginId}:${msg.type}`,
    data: msg.data,
  });
}

export function onPluginWebviewMessage(
  context: WebviewContext,
  handler: (msg: { type: string; data: unknown }) => void,
): Disposable {
  context.webviewMessageHandlers.add(handler);

  return toDisposable(() => {
    context.webviewMessageHandlers.delete(handler);
  });
}

export function savePluginExport(
  context: WebviewContext,
  request: ExportRequest,
): Promise<void> {
  return context.exportSaver(request);
}

export function deliverPluginWebviewMessage(
  context: WebviewContext,
  msg: { type: string; data: unknown },
): void {
  for (const handler of context.webviewMessageHandlers) {
    try {
      handler(msg);
    } catch (error) {
      console.error(
        `[CodeGraphy] Error in webview message handler for plugin ${context.pluginId}:`,
        error,
      );
    }
  }
}
