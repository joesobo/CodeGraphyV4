import { vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../../src/shared/fileColors';
import { graphStore } from '../../../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  graphProps: null as null | Record<string, unknown>,
  searchBarProps: null as null | Record<string, unknown>,
  pluginsPanelProps: null as null | Record<string, unknown>,
  settingsPanelProps: null as null | Record<string, unknown>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../../../../src/webview/components/graph/view/component', () => ({
  default: (props: Record<string, unknown>) => {
    harness.graphProps = props;
    const data = props.data as { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
    return (
      <div data-testid="mock-graph">
        <span data-testid="graph-node-count">{data.nodes.length}</span>
      </div>
    );
  },
}));

vi.mock('../../../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return (
      <div
        data-testid="mock-search-bar"
        data-result-count={String(props.resultCount ?? '')}
        data-total-count={String(props.totalCount ?? '')}
      />
    );
  },
}));

vi.mock('../../../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    harness.settingsPanelProps = { isOpen, onClose };
    return isOpen ? <button data-testid="settings-panel" onClick={onClose}>Close Settings</button> : <div data-testid="settings-panel-closed" />;
  },
}));

vi.mock('../../../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    harness.pluginsPanelProps = { isOpen, onClose };
    return isOpen ? <button data-testid="plugins-panel" onClick={onClose}>Close Plugins</button> : <div data-testid="plugins-panel-closed" />;
  },
}));

vi.mock('../../../../../src/webview/components/toolbar/view', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../../../../src/webview/pluginHost/manager', () => {
  class MockWebviewPluginHost {
    createAPI() {
      const slotContainers = new Map<string, HTMLDivElement>();
      return {
        getContainer: () => document.createElement('div'),
        getSlotContainer: (slot: string) => {
          let slotContainer = slotContainers.get(slot);
          if (!slotContainer) {
            slotContainer = document.createElement('div');
            slotContainer.setAttribute('data-plugin-slot', slot);
            slotContainers.set(slot, slotContainer);
          }
          return slotContainer;
        },
        registerNodeRenderer: () => ({ dispose() {} }),
        registerOverlay: () => ({ dispose() {} }),
        registerTooltipProvider: () => ({ dispose() {} }),
        helpers: { drawBadge() {}, drawProgressRing() {}, drawLabel() {} },
        sendMessage: () => {},
        onMessage: () => ({ dispose() {} }),
      };
    }
    attachSlotHost(_slot: string, host: HTMLDivElement) { host.style.display = 'none'; }
    detachSlotHost(_slot: string) {}
    deliverMessage() {}
  }
  return { WebviewPluginHost: MockWebviewPluginHost };
});

import App from '../../../../../src/webview/app/view';

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') messageListeners.push(listener);
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) messageListeners.splice(index, 1);
  }
});

function resetStore(): void {
  graphStore.setState({
    graphData: null,
    isLoading: false,
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
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    nodeDecorations: {},
    edgeDecorations: {},
    maxFiles: 500,
  });
}


export function getAppMutationComponent(): typeof App {
  return App;
}

export function getAppMutationGraphStore(): typeof graphStore {
  return graphStore;
}

export function getAppMutationMessageListeners(): typeof messageListeners {
  return messageListeners;
}

export function getAppMutationHarness(): typeof harness {
  return harness;
}

export function resetAppMutationHarness(): void {
  messageListeners.length = 0;
  delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
    .__codegraphyWebviewReadyPosted;
  harness.graphProps = null;
  harness.searchBarProps = null;
  harness.pluginsPanelProps = null;
  harness.settingsPanelProps = null;
  resetStore();
}
