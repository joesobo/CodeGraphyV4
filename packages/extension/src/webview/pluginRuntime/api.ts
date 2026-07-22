import type {
  CodeGraphyWebviewAPI,
  WebviewDisposable,
} from '../pluginHost/api/contracts/webview';
import { postMessage } from '../vscodeApi';
import type { PluginManagerRefs } from './types';

const INACTIVE_DISPOSABLE: WebviewDisposable = { dispose: () => undefined };

function createVersionedPluginApi(
  api: CodeGraphyWebviewAPI,
  isCurrent: () => boolean,
): CodeGraphyWebviewAPI {
  return {
    getContainer: () => isCurrent() ? api.getContainer() : document.createElement('div'),
    getSlotContainer: slot => isCurrent() ? api.getSlotContainer(slot) : document.createElement('div'),
    registerSlotContribution: (slot, contribution) => isCurrent()
      ? api.registerSlotContribution(slot, contribution)
      : INACTIVE_DISPOSABLE,
    getHostState: () => isCurrent() ? api.getHostState() : {},
    getPluginData: () => isCurrent() ? api.getPluginData() : undefined,
    setPluginData: data => {
      if (isCurrent()) api.setPluginData(data);
    },
    getGraphViewViewportState: () => isCurrent() ? api.getGraphViewViewportState() : null,
    onGraphViewViewportState: handler => isCurrent()
      ? api.onGraphViewViewportState(handler)
      : INACTIVE_DISPOSABLE,
    registerNodeRenderer: (type, renderer) => isCurrent()
      ? api.registerNodeRenderer(type, renderer)
      : INACTIVE_DISPOSABLE,
    registerOverlay: (id, renderer) => isCurrent()
      ? api.registerOverlay(id, renderer)
      : INACTIVE_DISPOSABLE,
    registerTooltipProvider: provider => isCurrent()
      ? api.registerTooltipProvider(provider)
      : INACTIVE_DISPOSABLE,
    registerGraphViewContributions: contributions => isCurrent()
      ? api.registerGraphViewContributions(contributions)
      : INACTIVE_DISPOSABLE,
    helpers: {
      drawBadge: (canvasContext, options) => {
        if (isCurrent()) api.helpers.drawBadge(canvasContext, options);
      },
      drawProgressRing: (canvasContext, options) => {
        if (isCurrent()) api.helpers.drawProgressRing(canvasContext, options);
      },
      drawLabel: (canvasContext, options) => {
        if (isCurrent()) api.helpers.drawLabel(canvasContext, options);
      },
    },
    sendMessage: message => {
      if (isCurrent()) api.sendMessage(message);
    },
    postHostMessage: message => {
      if (isCurrent()) api.postHostMessage(message);
    },
    onMessage: handler => isCurrent() ? api.onMessage(handler) : INACTIVE_DISPOSABLE,
  };
}

export function getPluginApi(
  refs: Pick<
    PluginManagerRefs,
    'pluginApis' | 'pluginAssetVersions' | 'pluginData' | 'pluginHost'
  >,
  pluginId: string,
  activationVersion: number,
): CodeGraphyWebviewAPI {
  const existing = refs.pluginApis.current.get(pluginId);
  if (existing) return existing;
  const hostApi = refs.pluginHost.current.createAPI(
    pluginId,
    postMessage,
    message => postMessage(message as never),
    () => ({}),
    pid => refs.pluginData.current.get(pid),
  );
  const api = createVersionedPluginApi(
    hostApi,
    () => (refs.pluginAssetVersions.current.get(pluginId) ?? 0) === activationVersion,
  );
  refs.pluginApis.current.set(pluginId, api);
  return api;
}
