import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../../src/webview/store/state';

vi.mock('../../../../src/webview/vscodeApi', () => ({ postMessage: vi.fn() }));

import { postMessage } from '../../../../src/webview/vscodeApi';
import {
  clickToolbarAction,
  renderToolbar,
  resetToolbarState,
} from './viewFixture';

describe('ToolbarActions', () => {
  beforeEach(resetToolbarState);
  afterEach(() => vi.useRealTimers());
  it('renders lifecycle, graph tools, and system groups without feature-specific public actions', () => {
    renderToolbar();

    expect(screen.getByTestId('toolbar-lifecycle-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-graph-tools-group')).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-system-group')).toBeInTheDocument();
    expect(screen.getByTitle('Index Workspace')).toBeInTheDocument();
    expect(screen.getByTitle('Node Size')).toBeInTheDocument();
    expect(screen.getByTitle('New...')).toBeInTheDocument();
    expect(screen.getByText('New File...')).toBeInTheDocument();
    expect(screen.getByText('New Folder...')).toBeInTheDocument();
    expect(screen.getByTitle('Graph Scope')).toBeInTheDocument();
    expect(screen.queryByTitle('Export')).not.toBeInTheDocument();
  });

  it('keeps the public create menu limited to filesystem actions', () => {
    renderToolbar();

    expect(screen.getByText('New File...')).toBeInTheDocument();
    expect(screen.getByText('New Folder...')).toBeInTheDocument();
  });

  it('sends INDEX_GRAPH message when the initial index button is clicked', () => {
    renderToolbar();
    clickToolbarAction('Index Workspace');

    expect(postMessage).toHaveBeenCalledWith({ type: 'INDEX_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
  });

  it('renders a reindex button title when the saved index is stale', () => {
    graphStore.setState({
      graphHasIndex: false,
      graphIndexFreshness: 'stale',
      graphIndexDetail: 'Commit changed since last index.',
    });

    renderToolbar();

    expect(screen.getByTitle('Reindex Workspace')).toBeInTheDocument();
  });

  it('sends REFRESH_GRAPH when a graph index already exists', () => {
    graphStore.setState({ graphHasIndex: true });

    renderToolbar();
    clickToolbarAction('Refresh');

    expect(postMessage).toHaveBeenCalledWith({ type: 'REFRESH_GRAPH' });
    expect(graphStore.getState().graphIsIndexing).toBe(true);
  });

  it('clears the optimistic loading state if the extension never responds', () => {
    renderToolbar();
    clickToolbarAction('Index Workspace');

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(graphStore.getState().graphIsIndexing).toBe(false);
    expect(graphStore.getState().graphIndexProgress).toBeNull();
  });

  it('opens and closes core panels from rail buttons', () => {
    renderToolbar();

    clickToolbarAction('Graph Scope');
    expect(graphStore.getState().activePanel).toBe('graphScope');

    clickToolbarAction('Graph Scope');
    expect(graphStore.getState().activePanel).toBe('none');

    clickToolbarAction('Themes');
    expect(graphStore.getState().activePanel).toBe('legends');

    clickToolbarAction('Plugins');
    expect(graphStore.getState().activePanel).toBe('plugins');

    clickToolbarAction('Settings');
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('renders the core toolbar buttons in the expected top-to-bottom order', () => {
    renderToolbar();

    const orderedTitles = screen
      .getAllByRole('button')
      .map((button) => button.getAttribute('title'))
      .filter((title): title is string =>
        ['Index Workspace', 'Node Size', 'New...', 'Graph Scope', 'Themes', 'Plugins', 'Settings'].includes(title ?? ''),
      );

    expect(orderedTitles).toEqual([
      'Index Workspace',
      'Node Size',
      'New...',
      'Graph Scope',
      'Themes',
      'Plugins',
      'Settings',
    ]);
  });

});
