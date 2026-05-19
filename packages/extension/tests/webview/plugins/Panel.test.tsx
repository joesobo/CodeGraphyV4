import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PluginsPanel from '../../../src/webview/components/plugins/Panel';
import { graphStore } from '../../../src/webview/store/state';
import type { IPluginStatus } from '../../../src/shared/plugins/status';

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

  it('renders the plugin priority hint and plugin rows without connection counts', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
    ]);

    expect(screen.getByText('Bottom runs first. Top wins.')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.queryByText('12')).not.toBeInTheDocument();
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
        packageName: '@codegraphy/plugin-typescript',
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
        packageName: '@codegraphy/plugin-typescript',
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
        packageName: '@codegraphy/plugin-typescript',
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
        id: 'codegraphy.treesitter',
        name: 'Tree-sitter',
        version: '1.0.0',
        supportedExtensions: ['*'],
        status: 'active',
        enabled: true,
        connectionCount: 42,
      },
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
        id: 'codegraphy.organize',
        name: 'Organize',
        version: '1.0.0',
        packageName: '@codegraphy/organize',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.queryByText('Tree-sitter')).not.toBeInTheDocument();
    expect(screen.queryByText('Legacy Extension Plugin')).not.toBeInTheDocument();
    expect(screen.getByText('Organize')).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });

  it('labels enabled plugin packages whose runtime is unavailable', () => {
    renderPanel([
      {
        id: '@codegraphy/plugin-python',
        name: '@codegraphy/plugin-python',
        version: '2.0.0',
        packageName: '@codegraphy/plugin-python',
        supportedExtensions: [],
        status: 'unavailable',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByText('Runtime unavailable')).toBeInTheDocument();
  });

  it('posts a workspace plugin package order message when enabled package rows are dragged into a new order', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    const draggableRows = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(draggableRows[1]);
    fireEvent.dragOver(draggableRows[0]);
    fireEvent.drop(draggableRows[0]);

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PLUGIN_PACKAGE_ORDER',
      payload: {
        packageNames: ['@codegraphy/plugin-markdown', '@codegraphy/plugin-typescript'],
      },
    });
  });

  it('clears drag highlight state without sending a reorder when a row is dropped before dragging starts', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    const draggableRows = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragOver(draggableRows[0]);
    expect(draggableRows[0]?.className).toContain('ring-[var(--cg-primary-ring)]');

    fireEvent.drop(draggableRows[0]);

    expect(sentMessages).not.toContainEqual(
      expect.objectContaining({ type: 'UPDATE_PLUGIN_PACKAGE_ORDER' }),
    );
    expect(draggableRows[0]?.className).not.toContain('ring-[var(--cg-primary-ring)]');
  });

  it('clears drag state when dragging ends without dropping', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    const draggableRows = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(draggableRows[0]);
    fireEvent.dragOver(draggableRows[1]);

    expect(draggableRows[0]?.className).toContain('opacity-60');
    expect(draggableRows[1]?.className).toContain('ring-[var(--cg-primary-ring)]');

    fireEvent.dragEnd(draggableRows[0]);

    expect(draggableRows[0]?.className).toBe('');
    expect(draggableRows[1]?.className).toBe('');
  });

  it('renders plugin rows inside the shared divided list style', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    expect(container.querySelector('[class*="divide-y"]')).not.toBeNull();
  });
});
