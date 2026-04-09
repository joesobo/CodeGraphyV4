import type { IPluginStatus } from '../../../../shared/plugins/status';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { buildGraphViewDecorationPayload } from './decorations';

interface GraphViewPluginAnalyzer {
  getPluginStatuses(disabledPlugins: ReadonlySet<string>): IPluginStatus[];
}

interface GraphViewDecorationManagerLike {
  getMergedNodeDecorations(): Parameters<typeof buildGraphViewDecorationPayload>[0];
  getMergedEdgeDecorations(): Parameters<typeof buildGraphViewDecorationPayload>[1];
}

export function sendGraphViewPluginStatuses(
  analyzer: Pick<GraphViewPluginAnalyzer, 'getPluginStatuses'> | undefined,
  disabledPlugins: ReadonlySet<string>,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>
  ) => void,
): void {
  if (!analyzer) return;

  const plugins = analyzer.getPluginStatuses(disabledPlugins);
  sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins } });
}

export function sendGraphViewDecorations(
  decorationManager: GraphViewDecorationManagerLike,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>
  ) => void,
): void {
  const payload = buildGraphViewDecorationPayload(
    decorationManager.getMergedNodeDecorations(),
    decorationManager.getMergedEdgeDecorations(),
  );
  sendMessage({
    type: 'DECORATIONS_UPDATED',
    payload,
  });
}
