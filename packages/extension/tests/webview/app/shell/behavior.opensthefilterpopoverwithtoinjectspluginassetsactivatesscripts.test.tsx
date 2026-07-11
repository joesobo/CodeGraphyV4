import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function sendAppMessage(data: unknown): void {
  const event = new MessageEvent('message', { data });
  for (const listener of [...messageListeners]) {
    listener(event);
  }
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



    it('opens the filter popover with a glob from graph requests', async () => {
      graphStore.setState({
        graphData: {
          nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
          edges: [],
        },
        filterPatterns: ['existing/**'],
      });

      render(<App />);
      harness.sentMessages.length = 0;

      await act(async () => {
        (harness.graphProps?.onAddFilterRequested as ((patterns: string[]) => void))(['src/App.ts']);
      });

      expect(harness.searchBarProps?.filterPopover).toMatchObject({
        open: true,
        pendingPatterns: ['**/src/App.ts'],
      });
      expect(harness.sentMessages).toEqual([]);
    });



    it('keeps duplicate filter requests in the popover without sending an update', async () => {
      graphStore.setState({
        graphData: {
          nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
          edges: [],
        },
        filterPatterns: ['**/src/App.ts'],
      });

      render(<App />);
      harness.sentMessages.length = 0;

      await act(async () => {
        (harness.graphProps?.onAddFilterRequested as ((patterns: string[]) => void))(['src/App.ts']);
      });

      expect(graphStore.getState().filterPatterns).toEqual(['**/src/App.ts']);
      expect(harness.searchBarProps?.filterPopover).toMatchObject({
        open: true,
        pendingPatterns: ['**/src/App.ts'],
      });
      expect(harness.sentMessages).toEqual([]);
    });



    it('adds legend rules from graph requests and sends the optimistic legend list', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(123456);
      vi.spyOn(Math, 'random').mockReturnValue(0.123456);
      graphStore.setState({
        graphData: {
          nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
          edges: [],
        },
        legends: [{ id: 'plugin-default', pattern: 'generated/**', color: '#aaaaaa', isPluginDefault: true }],
      });

      render(<App />);
      harness.sentMessages.length = 0;

      await act(async () => {
        (
          harness.graphProps?.onAddLegendRequested as (rule: {
            pattern: string;
            color: string;
            target: 'node' | 'edge';
          }) => void
        )({ pattern: ' src/** ', color: '#ff0000', target: 'node' });
      });

      fireEvent.change(screen.getByLabelText('Legend rule color'), {
        target: { value: '#00ff00' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      expect(graphStore.getState().legends).toEqual([
        {
          id: 'legend:123456:4fzyo8',
          pattern: 'src/**',
          color: '#00ff00',
          target: 'node',
        },
        {
          id: 'plugin-default',
          pattern: 'generated/**',
          color: '#aaaaaa',
          isPluginDefault: true,
        },
      ]);
      expect(harness.sentMessages).toContainEqual({
        type: 'UPDATE_LEGENDS',
        payload: {
          legends: [
            {
              id: 'legend:123456:4fzyo8',
              pattern: 'src/**',
              color: '#00ff00',
              target: 'node',
            },
          ],
        },
      });
      expect(screen.queryByLabelText('Add Legend Group pattern')).not.toBeInTheDocument();
    });



    it('applies the first enabled matching group and preserves unmatched node styling', () => {
      graphStore.setState({
        graphData: {
          nodes: [
            { id: 'src/App.ts', label: 'App', color: '#123456' },
            { id: 'notes/Todo.txt', label: 'Todo', color: '#abcdef' },
          ],
          edges: [],
        },
        legends: [
          { id: 'disabled-group', pattern: 'src/**', color: '#ff0000', disabled: true },
          { id: 'enabled-group', pattern: 'src/**', color: '#00ff00', shape2D: 'diamond', imageUrl: 'https://example.com/icon.png' },
        ],
      });

      render(<App />);

      expect(screen.getByTestId('graph-node-colors')).toHaveTextContent('#00ff00,#abcdef');
      expect(screen.getByTestId('graph-node-shapes')).toHaveTextContent('diamond,none');
      expect(screen.getByTestId('graph-node-images')).toHaveTextContent('https://example.com/icon.png,');
    });



    it('routes plugin-scoped messages to the plugin host', async () => {
      render(<App />);

      await act(async () => {
        sendAppMessage({ type: 'plugin:acme.plugin:node:click', data: { nodeId: 'src/App.ts' } });
      });

      expect(harness.deliveries).toEqual([
        {
          pluginId: 'acme.plugin',
          message: { type: 'node:click', data: { nodeId: 'src/App.ts' } },
        },
      ]);
    });



    it('ignores malformed extension messages and unscoped plugin messages', async () => {
      render(<App />);

      await act(async () => {
        sendAppMessage(42);
        sendAppMessage({ type: 'plugin:acme.plugin' });
      });

      expect(harness.deliveries).toEqual([]);
      expect(harness.createApiCalls).toEqual([]);
    });



    it('injects plugin assets, activates scripts once, and reuses cached styles', async () => {
      render(<App />);

      const scriptUrl = 'data:text/javascript,export default { activate(api) { globalThis.__pluginActivations.push({ hasSendMessage: typeof api.sendMessage === "function", hasHelpers: typeof api.helpers.drawLabel === "function" }); } }';

      await act(async () => {
        sendAppMessage({
          type: 'PLUGIN_WEBVIEW_INJECT',
          payload: {
            pluginId: 'acme.plugin',
            scripts: [scriptUrl],
            styles: ['https://example.com/plugin.css'],
          },
        });
        await Promise.resolve();
        await Promise.resolve();
      });
      await vi.dynamicImportSettled();

      await act(async () => {
        sendAppMessage({
          type: 'PLUGIN_WEBVIEW_INJECT',
          payload: {
            pluginId: 'acme.plugin',
            scripts: [scriptUrl],
            styles: ['https://example.com/plugin.css'],
          },
        });
        await Promise.resolve();
        await Promise.resolve();
      });
      await vi.dynamicImportSettled();

      await waitFor(() => {
        expect(harness.createApiCalls).toEqual(['acme.plugin']);
      });
      expect(document.head.querySelectorAll('link[href="https://example.com/plugin.css"]')).toHaveLength(1);
      expect((globalThis as { __pluginActivations?: unknown[] }).__pluginActivations).toEqual([
        { hasSendMessage: true, hasHelpers: true },
      ]);
    });
});
