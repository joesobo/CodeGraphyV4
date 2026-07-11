import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import { graphStore } from '../../../../src/webview/store/state';

const harness = vi.hoisted(() => ({
  graphProps: null as null | Record<string, unknown>,
  graphRenderCount: 0,
  searchBarProps: null as null | Record<string, unknown>,
  createApiCalls: [] as string[],
  deliveries: [] as Array<{ pluginId: string; message: { type: string; data: unknown } }>,
  sentMessages: [] as Array<{ type: string; payload?: unknown }>,
}));

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.mock('../../../../src/webview/components/graph/view/component', () => ({
  default: (props: Record<string, unknown>) => {
    harness.graphRenderCount += 1;
    harness.graphProps = props;
    const data = props.data as { nodes: Array<{ id: string; color?: string; shape2D?: string; imageUrl?: string }>; edges: Array<{ id: string }> };
    return (
      <div data-testid="mock-graph">
        <span data-testid="graph-node-ids">{data.nodes.map((node) => node.id).join(',')}</span>
        <span data-testid="graph-node-colors">{data.nodes.map((node) => node.color ?? '').join(',')}</span>
        <span data-testid="graph-node-shapes">{data.nodes.map((node) => node.shape2D ?? 'none').join(',')}</span>
        <span data-testid="graph-node-images">{data.nodes.map((node) => node.imageUrl ?? '').join(',')}</span>
        <span data-testid="graph-edge-ids">{data.edges.map((edge) => edge.id).join(',')}</span>
      </div>
    );
  },
}));

vi.mock('../../../../src/webview/components/searchBar/Field', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    harness.searchBarProps = props;
    return (
      <div
        data-testid="mock-search-bar"
        data-regex-error={String(props.regexError ?? '')}
        data-result-count={String(props.resultCount ?? '')}
        data-total-count={String(props.totalCount ?? '')}
      />
    );
  },
}));

vi.mock('../../../../src/webview/components/settingsPanel/Drawer', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="settings-panel" onClick={onClose}>Close Settings</button> : null,
}));

vi.mock('../../../../src/webview/components/plugins/Panel', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <button data-testid="plugins-panel" onClick={onClose}>Close Plugins</button> : null,
}));

vi.mock('../../../../src/webview/components/timeline/panel', () => ({
  default: () => <div data-testid="timeline" />,
}));

vi.mock('../../../../src/webview/components/toolbar/view', () => ({
  default: () => <div data-testid="toolbar" />,
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: { type: string; payload?: unknown }) => harness.sentMessages.push(message),
  getVsCodeApi: () => ({
    postMessage: (message: { type: string; payload?: unknown }) => harness.sentMessages.push(message),
    getState: () => undefined,
    setState: vi.fn(),
  }),
}));

vi.mock('../../../../src/webview/pluginHost/manager', () => {
  class MockWebviewPluginHost {
    createAPI(pluginId: string, postMessage: (message: { type: 'GRAPH_INTERACTION'; payload: { event: string; data: unknown } }) => void) {
      harness.createApiCalls.push(pluginId);
      const container = document.createElement('div');
      container.setAttribute('data-plugin-id', pluginId);
      const slotContainers = new Map<string, HTMLDivElement>();
      return {
        getContainer: () => container,
        getSlotContainer: (slot: string) => {
          let slotContainer = slotContainers.get(slot);
          if (!slotContainer) {
            slotContainer = document.createElement('div');
            slotContainer.setAttribute('data-plugin-id', pluginId);
            slotContainer.setAttribute('data-plugin-slot', slot);
            slotContainers.set(slot, slotContainer);
          }
          return slotContainer;
        },
        registerNodeRenderer: () => ({ dispose() {} }),
        registerOverlay: () => ({ dispose() {} }),
        registerTooltipProvider: () => ({ dispose() {} }),
        helpers: {
          drawBadge() {},
          drawProgressRing() {},
          drawLabel() {},
        },
        sendMessage: (message: { type: string; data: unknown }) => {
          postMessage({
            type: 'GRAPH_INTERACTION',
            payload: { event: `plugin:${pluginId}:${message.type}`, data: message.data },
          });
        },
        onMessage: () => ({ dispose() {} }),
      };
    }

    attachSlotHost(_slot: string, host: HTMLDivElement) {
      host.style.display = 'none';
    }

    detachSlotHost(_slot: string) {}

    deliverMessage(pluginId: string, message: { type: string; data: unknown }) {
      harness.deliveries.push({ pluginId, message });
    }
  }

  return { WebviewPluginHost: MockWebviewPluginHost };
});

import App from '../../../../src/webview/app/view';

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index !== -1) {
      messageListeners.splice(index, 1);
    }
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
    pluginFilterGroups: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    timelineActive: false,
    nodeDecorations: {},
    edgeDecorations: {},
    maxFiles: 500,
    activeFilePath: null,
  });
}

describe('App behavior', () => {

    beforeEach(() => {
      messageListeners.length = 0;
      delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
        .__codegraphyWebviewReadyPosted;
      harness.graphProps = null;
      harness.graphRenderCount = 0;
      harness.searchBarProps = null;
      harness.createApiCalls.length = 0;
      harness.deliveries.length = 0;
      harness.sentMessages.length = 0;
      document.head.innerHTML = '';
      document.body.innerHTML = '';
      (globalThis as { __pluginActivations?: unknown[] }).__pluginActivations = [];
      resetStore();
    });



    afterEach(() => {
      vi.restoreAllMocks();
    });



    it('shows the loading state when isLoading is true', () => {
      graphStore.setState({
        isLoading: true,
      });

      render(<App />);

      expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    });



    it('shows the empty state when graphData is null and timeline is not active', () => {
      graphStore.setState({
        graphData: null,
        timelineActive: false,
        isLoading: false,
      });

      render(<App />);

      expect(screen.getByText(/No files found/)).toBeInTheDocument();
    });



    it('does not render the embedded timeline in the graph shell', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
        activePanel: 'none',
      });

      render(<App />);

      expect(screen.queryByTestId('timeline')).not.toBeInTheDocument();
    });
});
