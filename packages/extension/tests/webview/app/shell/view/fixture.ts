import { vi } from 'vitest';

import { DEFAULT_DIRECTION_COLOR } from '../../../../../src/shared/fileColors';
import { graphStore } from '../../../../../src/webview/store/state';

export const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index > -1) messageListeners.splice(index, 1);
  }
});

export function resetStore() {
  graphStore.setState({
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    nodeSizeMode: 'connections',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    awaitingInitialBootstrap: false,
    bootstrapComplete: false,
    pendingPluginAssetLoads: 0,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginFilterGroups: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    maxFiles: 500,
  });
}

export function sendMessage(data: unknown) {
  const event = new MessageEvent('message', { data });
  messageListeners.forEach((listener) => listener(event));
}
