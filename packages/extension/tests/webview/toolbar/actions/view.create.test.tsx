import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

import { postMessage } from '../../../../src/webview/vscodeApi';
import {
  iconButtonTitles,
  renderToolbar,
  resetToolbarState,
} from './viewFixture';

describe('ToolbarActions', () => {
  beforeEach(resetToolbarState);
  afterEach(() => vi.useRealTimers());
  it('orders the graph tool rail create menu as file and folder without a separator', () => {
    renderToolbar();

    const createMenu = screen.getByText('New File...').closest('[data-testid="dropdown-content"]');

    expect(createMenu).not.toBeNull();
    expect(
      within(createMenu as HTMLElement)
        .getAllByRole('button')
        .map(button => button.textContent?.trim()),
    ).toEqual(['New File...', 'New Folder...']);
    expect(within(createMenu as HTMLElement).queryByTestId('dropdown-separator')).not.toBeInTheDocument();
  });

  it('renders graph-view create contributions beside file and folder actions', () => {
    const run = vi.fn();
    const contributions = {
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.new-plugin-node',
          label: 'New Plugin Node...',
          placement: { menu: 'create' as const },
          targets: [{ kind: 'background' as const }],
          run,
        },
      }],
      ui: [],
    };
    const pluginHost = {
      getGraphViewContributions: vi.fn(() => contributions),
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: vi.fn() })),
    };

    renderToolbar({ pluginHost: pluginHost as never });

    const createMenu = screen.getByText('New File...').closest('[data-testid="dropdown-content"]');
    expect(
      within(createMenu as HTMLElement)
        .getAllByRole('button')
        .map(button => button.textContent?.trim()),
    ).toEqual(['New File...', 'New Folder...', 'New Plugin Node...']);

    fireEvent.click(screen.getByText('New Plugin Node...'));

    expect(run).toHaveBeenCalledWith({
      target: { kind: 'background' },
      selectedNodeIds: [],
      selectedEdgeIds: [],
    });
  });

  it('keeps healthy create contributions when another plugin callback throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const contributions = {
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [
        {
          pluginId: 'broken.plugin',
          contribution: {
            id: 'broken-create',
            label: 'Broken create',
            placement: { menu: 'create' as const },
            targets: [{ kind: 'background' as const }],
            getLabel() {
              throw new Error('label failed');
            },
            run: vi.fn(),
          },
        },
        {
          pluginId: 'healthy.plugin',
          contribution: {
            id: 'healthy-create',
            label: 'Healthy create',
            placement: { menu: 'create' as const },
            targets: [{ kind: 'background' as const }],
            run: vi.fn(),
          },
        },
      ],
      ui: [],
    };
    const pluginHost = {
      getGraphViewContributions: vi.fn(() => contributions),
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: vi.fn() })),
    };

    renderToolbar({ pluginHost: pluginHost as never });

    expect(screen.getByText('Healthy create')).toBeInTheDocument();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('reports create contribution failures without breaking the toolbar action', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const contributions = {
      runtimeNodes: [],
      runtimeEdges: [],
      projections: [],
      forces: [],
      nodeDragEnd: [],
      contextMenu: [{
        pluginId: 'broken.plugin',
        contribution: {
          id: 'broken-create',
          label: 'Broken create',
          placement: { menu: 'create' as const },
          targets: [{ kind: 'background' as const }],
          run() {
            throw new Error('run failed');
          },
        },
      }],
      ui: [],
    };
    const pluginHost = {
      getGraphViewContributions: vi.fn(() => contributions),
      subscribeGraphViewContributions: vi.fn(() => ({ dispose: vi.fn() })),
    };
    renderToolbar({ pluginHost: pluginHost as never });

    expect(() => fireEvent.click(screen.getByText('Broken create'))).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Create contribution 'broken-create' from plugin 'broken.plugin' failed"),
      expect.any(Error),
    );
  });

  it('posts root creation messages from the graph tool rail create menu', () => {
    renderToolbar();
    expect(screen.getByText('New File...').closest('button')).toHaveClass('gap-2');

    fireEvent.click(screen.getByText('New File...'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CREATE_FILE',
      payload: { directory: '.' },
    });

    fireEvent.click(screen.getByText('New Folder...'));

    expect(postMessage).toHaveBeenCalledWith({
      type: 'CREATE_FOLDER',
      payload: { directory: '.' },
    });

  });

  it.each(iconButtonTitles)('renders an SVG icon path for %s', (title) => {
    renderToolbar();
    const icon = screen.getByTitle(title).querySelector('svg');

    expect(icon).not.toBeNull();
  });

});
