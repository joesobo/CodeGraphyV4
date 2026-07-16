import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import Graph from '../../src/webview/components/graph/view/component';
import {
  baseData,
  createCallbacks,
  createGraphState,
  createInteractionRuntime,
  setStoreState,
} from './Graph.wiring.fixture';

const harness = vi.hoisted(() => ({
  buildGraphDebugOptions: vi.fn((options: Record<string, unknown>) => options),
  graphViewportShell: vi.fn((_props: Record<string, unknown>) => <div data-testid="graph-viewport-shell" />),
  useGraphAppearance: vi.fn(),
  useGraphCallbacks: vi.fn(),
  useGraphDebugApi: vi.fn(),
  useGraphInteractionRuntime: vi.fn(),
  useGraphRuntime: vi.fn(),
}));

vi.mock('../../src/webview/components/graph/viewport/shell', () => ({
  GraphViewportShell: harness.graphViewportShell,
}));

vi.mock('../../src/webview/components/graph/debug/api', () => ({
  useGraphDebugApi: harness.useGraphDebugApi,
}));

vi.mock('../../src/webview/components/graph/debug/options', () => ({
  buildGraphDebugOptions: harness.buildGraphDebugOptions,
}));

vi.mock('../../src/webview/components/graph/runtime/use/state', () => ({
  useGraphRuntime: harness.useGraphRuntime,
}));

vi.mock('../../src/webview/components/graph/runtime/use/interaction', () => ({
  useGraphInteractionRuntime: harness.useGraphInteractionRuntime,
}));

vi.mock('../../src/webview/components/graph/rendering/useGraphCallbacks', () => ({
  useGraphCallbacks: harness.useGraphCallbacks,
}));

vi.mock('../../src/webview/components/graph/appearance/use', () => ({
  useGraphAppearance: harness.useGraphAppearance,
}));

describe('Graph wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setStoreState();
    harness.useGraphAppearance.mockReturnValue({
      focusBorder: '#0ea5e9',
      labelForeground: '#f8fafc',
      labelMutedForeground: '#94a3b8',
      linkHighlight: '#38bdf8',
      linkMuted: '#64748b',
      nodeSelectionBorder: '#0ea5e9',
      stageBackground: 'var(--cg-popover-translucent)',
      transparent: 'transparent',
    });
    harness.useGraphRuntime.mockImplementation(({ data }: { data: IGraphData }) => createGraphState(data));
    harness.useGraphInteractionRuntime.mockReturnValue(createInteractionRuntime());
    harness.useGraphCallbacks.mockReturnValue(createCallbacks());
  });

  afterEach(() => {
    vi.useRealTimers();
    setStoreState();
  });

  it('passes store-backed runtime settings into the graph state, interaction runtime, and viewport shell', () => {
    const favorites = new Set(['src/app.ts']);
    setStoreState({
      bidirectionalMode: 'line',
      depthMode: true,
      directionColor: '#ef4444',
      directionMode: 'particles',
      favorites,
      nodeSizeMode: 'file-size',
      particleSize: 7,
      particleSpeed: 0.35,
      showLabels: false,
    });

    render(<Graph data={baseData} theme="light" />);

    expect(harness.useGraphRuntime).toHaveBeenCalledWith(expect.objectContaining({
      bidirectionalMode: 'line',
      favorites,
      nodeSizeMode: 'file-size',
      showLabels: false,
      theme: 'light',
    }));
    expect(harness.useGraphInteractionRuntime).toHaveBeenCalledWith(expect.objectContaining({
      depthMode: true,
      isMacPlatform: expect.any(Boolean),
    }));
    expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      callbacks: expect.objectContaining({
        getArrowColor: expect.any(Function),
        getLinkColor: expect.any(Function),
        getLinkOpacity: expect.any(Function),
      }),
      graphDataLayoutKey: expect.any(String),
      graphState: expect.objectContaining({
        renderer: expect.objectContaining({
          graphData: expect.objectContaining({ nodes: expect.any(Array), links: expect.any(Array) }),
        }),
      }),
      interactions: expect.objectContaining({
        handleMenuAction: expect.any(Function),
        tooltipData: expect.objectContaining({ path: '' }),
      }),
      pluginHost: undefined,
      theme: 'light',
      viewState: expect.objectContaining({
        nodeSizeMode: 'file-size',
        particleSize: 7,
        particleSpeed: 0.35,
        showLabels: false,
      }),
    }));
  });

  it('defaults the viewport shell theme to dark when no theme prop is provided', () => {
    render(<Graph data={baseData} />);

    expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      theme: 'dark',
    }));
  });

  it('uses graph-view contributions registered by the webview plugin host', () => {
    const graphViewContributions = {
      runtimeNodes: [{
        pluginId: 'acme.plugin',
        contribution: {
          id: 'acme.plugin.runtime-node',
          label: 'Runtime Node',
          createNodes: () => [],
        },
      }],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [],
      ui: [],
    };
    const disposable = { dispose: vi.fn() };
    const pluginHost = {
      getGraphViewContributions: vi.fn(() => graphViewContributions),
      subscribeGraphViewContributions: vi.fn(() => disposable),
    };

    render(<Graph data={baseData} pluginHost={pluginHost as never} />);

    expect(pluginHost.subscribeGraphViewContributions).toHaveBeenCalledWith(expect.any(Function));
    expect(harness.useGraphRuntime).toHaveBeenCalledWith(expect.objectContaining({ graphViewContributions }));
    expect(harness.graphViewportShell.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      graphViewContributions,
    }));
  });
});
