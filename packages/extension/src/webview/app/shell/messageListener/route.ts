import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { WebviewPluginHost } from '../../../pluginHost/manager';
import { graphStore } from '../../../store/state';
import { parsePluginScopedMessage } from '../messages';
import type {
  InjectAssetsParams,
  ResetPluginAssets,
  UpdatePluginData,
} from '../messageListener';
import { handleCssSnippetsUpdatedMessage } from './cssSnippets';
import { handlePluginDataUpdatedMessage } from './pluginData';
import { handlePluginInjectMessage } from './pluginInjection';
import { removeDisabledPluginRegistrations } from './pluginRegistrations';

export interface RawExtensionMessage {
  type: string;
  payload?: unknown;
  data?: unknown;
}

interface MessageRouteRuntime {
  injectPluginAssets: (params: InjectAssetsParams) => Promise<void>;
  pluginHost: WebviewPluginHost;
  resetPluginAssets?: ResetPluginAssets;
  updatePluginData: UpdatePluginData;
}

type MessageConsumer = (message: RawExtensionMessage) => boolean;

function deliverPluginScopedMessage(
  message: RawExtensionMessage,
  pluginHost: WebviewPluginHost,
): boolean {
  const scopedMessage = parsePluginScopedMessage(message.type, message.data);
  if (!scopedMessage) return false;
  pluginHost.deliverMessage(scopedMessage.pluginId, scopedMessage.message);
  return true;
}

function createMessageConsumers(runtime: MessageRouteRuntime): MessageConsumer[] {
  return [
    message => handlePluginInjectMessage(message, runtime.injectPluginAssets),
    handleCssSnippetsUpdatedMessage,
    message => deliverPluginScopedMessage(message, runtime.pluginHost),
    message => handlePluginDataUpdatedMessage(message, runtime.updatePluginData),
  ];
}

export function routeExtensionMessage(
  message: RawExtensionMessage,
  runtime: MessageRouteRuntime,
): void {
  if (createMessageConsumers(runtime).some(consume => consume(message))) return;
  removeDisabledPluginRegistrations(
    message,
    runtime.pluginHost,
    runtime.resetPluginAssets,
  );
  graphStore.getState().handleExtensionMessage(message as ExtensionToWebviewMessage);
}
