import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IndexToolbarAction } from '../../../../src/webview/components/toolbar/actions/indexAction';

const clearPendingIndexTimeout = vi.fn();
const createRefreshConfig = vi.fn();
const requestGraphIndex = vi.fn();
const buttonProps: Array<Record<string, unknown>> = [];

vi.mock('../../../../src/webview/components/toolbar/actions/refresh', () => ({
  clearPendingIndexTimeout: (...args: unknown[]) => clearPendingIndexTimeout(...args),
  createRefreshConfig: (...args: unknown[]) => createRefreshConfig(...args),
  requestGraphIndex: (...args: unknown[]) => requestGraphIndex(...args),
}));

vi.mock('../../../../src/webview/components/toolbar/IconButton', () => ({
  ToolbarIconButton: (props: {
    disabled?: boolean;
    title: string;
    onClick: () => void;
  }) => {
    buttonProps.push(props as unknown as Record<string, unknown>);
    return (
      <button
        type="button"
        disabled={props.disabled}
        onClick={props.onClick}
        title={props.title}
      >
        {props.title}
      </button>
    );
  },
}));

describe('webview/toolbar/IndexAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buttonProps.length = 0;
    createRefreshConfig.mockImplementation((graphHasIndex: boolean, freshness: 'fresh' | 'stale' | 'missing') => (
      freshness === 'stale'
        ? { phase: 'Refreshing Index', title: 'Reindex Repo', type: 'REFRESH_GRAPH' }
        : graphHasIndex
        ? { phase: 'Refreshing Index', title: 'Refresh', type: 'REFRESH_GRAPH' }
        : { phase: 'Indexing Repo', title: 'Index Repo', type: 'INDEX_GRAPH' }
    ));
  });

  it('renders the configured title and disabled state', () => {
    render(
      <IndexToolbarAction
        graphHasIndex
        graphIndexFreshness="fresh"
        graphIndexDetail={null}
        graphIsIndexing
      />,
    );

    expect(createRefreshConfig).toHaveBeenCalledWith(true, 'fresh');
    expect(screen.getByTitle('Refresh')).toBeDisabled();
  });

  it('requests a graph index with the current graphHasIndex flag when clicked', () => {
    render(
      <IndexToolbarAction
        graphHasIndex={false}
        graphIndexFreshness="missing"
        graphIndexDetail={null}
        graphIsIndexing={false}
      />,
    );

    fireEvent.click(screen.getByTitle('Index Repo'));

    expect(requestGraphIndex).toHaveBeenCalledTimes(1);
    expect(requestGraphIndex.mock.calls[0][0]).toBe(false);
    expect(requestGraphIndex.mock.calls[0][1]).toBe('missing');
    expect(requestGraphIndex.mock.calls[0][2]).toMatchObject({ current: null });
  });

  it('clears the pending timeout when indexing stops after a rerender', () => {
    const { rerender } = render(
      <IndexToolbarAction
        graphHasIndex
        graphIndexFreshness="fresh"
        graphIndexDetail={null}
        graphIsIndexing
      />,
    );

    rerender(
      <IndexToolbarAction
        graphHasIndex
        graphIndexFreshness="fresh"
        graphIndexDetail={null}
        graphIsIndexing={false}
      />,
    );

    expect(clearPendingIndexTimeout).toHaveBeenCalledTimes(1);
    expect(clearPendingIndexTimeout.mock.calls[0][0]).toMatchObject({ current: null });
  });

  it('clears the pending timeout when the component unmounts', () => {
    const { unmount } = render(
      <IndexToolbarAction
        graphHasIndex={false}
        graphIndexFreshness="missing"
        graphIndexDetail={null}
        graphIsIndexing={false}
      />,
    );
    const callsBeforeUnmount = clearPendingIndexTimeout.mock.calls.length;

    unmount();

    expect(clearPendingIndexTimeout.mock.calls.length).toBe(callsBeforeUnmount + 1);
    expect(clearPendingIndexTimeout.mock.calls.at(-1)?.[0]).toMatchObject({ current: null });
  });
});
