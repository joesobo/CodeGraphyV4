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

  it('renders plugin rows with their connection counts', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [],
      },
    ]);

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderPanel([]);

    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('expands a plugin to show its sources and rule descriptions', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [
          {
            id: 'imports',
            qualifiedSourceId: 'codegraphy.typescript:imports',
            name: 'Imports',
            description: 'Tracks import declarations.',
            enabled: true,
            connectionCount: 7,
          },
        ],
      },
    ]);

    const expandButtons = container.querySelectorAll('button.h-5.w-5');
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('Imports')).toBeInTheDocument();
    expect(screen.getByText('Tracks import declarations.')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('keeps the base rule label and count typography classes when expanded', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [
          {
            id: 'imports',
            qualifiedSourceId: 'codegraphy.typescript:imports',
            name: 'Imports',
            description: 'Tracks import declarations.',
            enabled: true,
            connectionCount: 7,
          },
        ],
      },
    ]);

    const expandButtons = container.querySelectorAll('button.h-5.w-5');
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('Imports')).toHaveClass('text-xs', 'block', 'truncate');
    expect(screen.getByText('7')).toHaveClass('text-xs', 'flex-shrink-0', 'tabular-nums');
  });

  it('shows a no-sources message when an expanded plugin has no sources', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 0,
        sources: [],
      },
    ]);

    const expandButtons = container.querySelectorAll('button.h-5.w-5');
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('No sources declared.')).toBeInTheDocument();
  });

  it('posts a plugin toggle message when the plugin switch changes', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [],
      },
    ]);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_PLUGIN',
      payload: { pluginId: 'codegraphy.typescript', enabled: false },
    });
  });

  it('posts a plugin-order message when rows are dragged into a new order', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [],
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
        sources: [],
      },
    ]);

    const draggableRows = container.querySelectorAll('[draggable="true"]');
    fireEvent.dragStart(draggableRows[1]);
    fireEvent.dragOver(draggableRows[0]);
    fireEvent.drop(draggableRows[0]);

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PLUGIN_ORDER',
      payload: { pluginIds: ['codegraphy.markdown', 'codegraphy.typescript'] },
    });
  });

  it('posts a rule toggle message when an enabled plugin rule switch changes', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [
          {
            id: 'imports',
            qualifiedSourceId: 'codegraphy.typescript:imports',
            name: 'Imports',
            description: 'Tracks import declarations.',
            enabled: true,
            connectionCount: 7,
          },
        ],
      },
    ]);

    const expandButtons = container.querySelectorAll('button.h-5.w-5');
    fireEvent.click(expandButtons[0]);
    const switches = screen.getAllByRole('switch');

    fireEvent.click(switches[1]);

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_SOURCE',
      payload: { qualifiedSourceId: 'codegraphy.typescript:imports', enabled: false },
    });
  });

  it('disables rule switches when the parent plugin is disabled', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'inactive',
        enabled: false,
        connectionCount: 12,
        sources: [
          {
            id: 'imports',
            qualifiedSourceId: 'codegraphy.typescript:imports',
            name: 'Imports',
            description: 'Tracks import declarations.',
            enabled: false,
            connectionCount: 7,
          },
        ],
      },
    ]);

    const expandButtons = container.querySelectorAll('button.h-5.w-5');
    fireEvent.click(expandButtons[0]);
    const switches = screen.getAllByRole('switch');

    expect(switches[1]).toBeDisabled();
  });

  it('renders separators only between plugin rows', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
        sources: [],
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
        sources: [],
      },
    ]);

    expect(container.querySelectorAll('[data-orientation="horizontal"]')).toHaveLength(1);
  });
});
