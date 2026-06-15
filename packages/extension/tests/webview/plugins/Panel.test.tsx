import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PluginsPanel from '../../../src/webview/components/plugins/Panel';
import { graphStore } from '../../../src/webview/store/state';
import type { IPluginStatus } from '../../../src/shared/plugins/status';
import { PluginRegistry } from '../../../src/core/plugins/registry/manager';
import { buildWorkspaceIndexPluginStatuses as buildWorkspacePluginStatuses } from '@codegraphy-dev/core';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

function setPluginStatuses(pluginStatuses: IPluginStatus[]) {
  graphStore.setState({ pluginStatuses });
}

function renderPanel(pluginStatuses: IPluginStatus[], isOpen = true) {
  setPluginStatuses(pluginStatuses);
  const onClose = vi.fn();
  const result = render(<PluginsPanel isOpen={isOpen} onClose={onClose} />);
  return { ...result, onClose };
}

describe('PluginsPanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    graphStore.setState({ graphIsIndexing: false });
    setPluginStatuses([]);
  });

  it('returns null when the panel is closed', () => {
    const { container } = renderPanel([], false);

    expect(container.innerHTML).toBe('');
  });

  it('shows an empty-state message when no plugins are registered', () => {
    renderPanel([]);

    expect(screen.getByText('No plugins registered.')).toBeInTheDocument();
  });

  it('renders plugin rows without connection counts or ordering hints', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
    ]);

    expect(screen.queryByText('Bottom runs first. Top wins.')).not.toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
  });

  it('renders a toggle for package plugins registered by the extension status update', () => {
    const registry = new PluginRegistry();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    registry.register(
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        version: '2.1.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts', '.tsx'],
        analyzeFile: vi.fn(),
      },
      {
        sourcePackage: '@codegraphy-dev/plugin-typescript',
        sourcePackageRoot: '/global/node_modules/@codegraphy-dev/plugin-typescript',
      },
    );
    logSpy.mockRestore();
    const plugins = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map([['src/index.ts', []]]),
      pluginInfos: registry.list(),
      workspaceEnabledPluginIds: new Set(['codegraphy.typescript']),
    });

    graphStore.getState().handleExtensionMessage({
      type: 'PLUGINS_UPDATED',
      payload: { plugins },
    });
    render(<PluginsPanel isOpen onClose={vi.fn()} />);

    expect(screen.queryByText('No plugins registered.')).not.toBeInTheDocument();
    expect(screen.getByText('TypeScript/JavaScript')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'TypeScript/JavaScript' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderPanel([]);

    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('posts a plugin toggle message when the plugin switch changes', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
    ]);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: 'codegraphy.typescript',
        enabled: false,
      },
    });
    expect(graphStore.getState().pluginStatuses).toEqual([
      expect.objectContaining({
        id: 'codegraphy.typescript',
        enabled: false,
      }),
    ]);
  });

  it('renders plugin-only rows without per-source content', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
    ]);

    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });

  it('hides core and legacy extension plugin rows that cannot be toggled as packages', () => {
    renderPanel([
      {
        id: 'codegraphy.legacy-extension',
        name: 'Legacy Extension Plugin',
        version: '1.0.0',
        supportedExtensions: ['.legacy'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
      {
        id: 'acme.graph-tools',
        name: 'Graph Tools',
        version: '1.0.0',
        packageName: '@acme/graph-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.queryByText('Legacy Extension Plugin')).not.toBeInTheDocument();
    expect(screen.getByText('Graph Tools')).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });

  it('deduplicates stale package status rows in favor of the latest package row', () => {
    renderPanel([
      {
        id: 'acme.old-tools',
        name: 'Old Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'acme.tools',
        name: 'Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.queryByText('Old Tools')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });

  it('keeps an active package row when a later duplicate package row is only installed', () => {
    renderPanel([
      {
        id: 'acme.tools',
        name: 'Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'active',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'acme.tools-package',
        name: '@acme/plugin-tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.queryByText('@acme/plugin-tools')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });

  it('does not render runtime availability subtext for plugin rows', () => {
    renderPanel([
      {
        id: '@codegraphy-dev/plugin-python',
        name: '@codegraphy-dev/plugin-python',
        version: '2.0.0',
        packageName: '@codegraphy-dev/plugin-python',
        supportedExtensions: [],
        status: 'unavailable',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByTestId('plugin-row')).toHaveTextContent('@codegraphy-dev/plugin-python');
    expect(screen.getByTestId('plugin-row').querySelector('.text-\\[10px\\]')).toBeNull();
  });

  it('does not expose plugin rows as draggable reorder targets', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    const pluginRows = container.querySelectorAll('[data-testid="plugin-row"]');
    expect(pluginRows).toHaveLength(2);
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(0);

    fireEvent.dragStart(pluginRows[1]);
    fireEvent.dragOver(pluginRows[0]);
    fireEvent.drop(pluginRows[0]);

    expect(sentMessages).toEqual([]);
  });

  it('renders plugin rows inside the shared divided list style', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    expect(container.querySelector('[class*="divide-y"]')).not.toBeNull();
  });
});
