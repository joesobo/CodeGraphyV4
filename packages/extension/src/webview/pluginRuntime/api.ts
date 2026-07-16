import type { CodeGraphyWebviewAPI } from '../pluginHost/api/contracts/webview';
import { postMessage } from '../vscodeApi';
import type { PluginManagerRefs } from './types';

export function getPluginApi(
  refs: Pick<PluginManagerRefs, 'pluginApis' | 'pluginData' | 'pluginHost'>,
  pluginId: string,
): CodeGraphyWebviewAPI {
  const existing = refs.pluginApis.current.get(pluginId);
  if (existing) return existing;
  const api = refs.pluginHost.current.createAPI(
    pluginId,
    postMessage,
    message => postMessage(message as never),
    () => ({}),
    pid => refs.pluginData.current.get(pid),
  );
  refs.pluginApis.current.set(pluginId, api);
  return api;
}
