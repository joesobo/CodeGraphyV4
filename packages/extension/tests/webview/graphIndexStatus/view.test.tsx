import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphIndexStatus } from '../../../src/webview/components/graphIndexStatus/view';

describe('GraphIndexStatus', () => {
  it('renders nothing when indexing is inactive', () => {
    const { container } = render(
      <GraphIndexStatus isIndexing={false} progress={null} showMinimap={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when indexing is inactive even if stale progress exists', () => {
    const { container } = render(
      <GraphIndexStatus
        isIndexing={false}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
        showMinimap={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the phase label and percent while indexing', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
        showMinimap={false}
      />,
    );

    expect(screen.getByTestId('graph-index-status')).toBeInTheDocument();
    expect(screen.getByText('Indexing Workspace')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Indexing progress' }))
      .toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByRole('progressbar', { name: 'Indexing progress' }))
      .toHaveAttribute('aria-valuetext', 'Indexing Workspace 25%');
    const fill = screen.getByTestId('graph-index-status-fill');
    expect(fill).toHaveStyle({ width: '25%' });
    expect(fill.className).toContain('transition-all');
    expect(fill).toHaveAttribute('data-codegraphy-progress', 'determinate');
  });

  it('does not capture pointer events from graph controls and popups', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
        showMinimap={false}
      />,
    );

    expect(screen.getByTestId('graph-index-status').className).toContain('pointer-events-none');
  });

  it('anchors to the graph bottom and reserves the bottom-right graph control lane', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Discovering Files', current: 1, total: 1 }}
        showMinimap={false}
      />,
    );

    const statusClass = screen.getByTestId('graph-index-status').className;
    expect(statusClass).toContain('left-2');
    expect(statusClass).toContain('right-12');
    expect(statusClass).toContain('bottom-2');
    expect(statusClass).toContain('rounded-md');
    expect(statusClass).not.toContain('border-t');
    expect(statusClass).not.toContain('inset-x-0');
  });

  it('reserves the bottom-left minimap lane while the minimap is shown', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Discovering Files', current: 1, total: 1 }}
        showMinimap={true}
      />,
    );

    const status = screen.getByTestId('graph-index-status');
    expect(status).toHaveStyle({ left: '192px' });
    expect(status.className).toBe(
      'pointer-events-none absolute right-12 bottom-2 z-20 rounded-md border border-border bg-[var(--cg-popover-translucent)] px-2 py-1.5 shadow-sm backdrop-blur-sm',
    );
    expect(status.className).not.toContain('left-44');
    expect(status.className).not.toContain('left-2');
  });

  it('shows live discovery counts as indeterminate progress when the total is unknown', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Discovering Files', current: 25, total: 0 }}
        showMinimap={false}
      />,
    );

    expect(screen.getByText('25 candidate files found')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Indexing progress' }))
      .not.toHaveAttribute('aria-valuenow');
    expect(screen.getByRole('progressbar', { name: 'Indexing progress' }))
      .toHaveAttribute('aria-valuetext', 'Discovering Files 25 candidate files found');
    expect(screen.getByTestId('graph-index-status-fill')).toHaveAttribute(
      'data-codegraphy-progress',
      'indeterminate',
    );
    expect(screen.getByTestId('graph-index-status-fill').className)
      .toContain('animate-index-progress');
  });

  it('uses singular discovery wording for one candidate file', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Discovering Files', current: 1, total: 0 }}
        showMinimap={false}
      />,
    );

    expect(screen.getByText('1 candidate file found')).toBeInTheDocument();
  });

  it('keeps invalid determinate values inside the progress range', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Analyzing Files', current: 12, total: 10 }}
        showMinimap={false}
      />,
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Indexing progress' }))
      .toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('graph-index-status-fill')).toHaveStyle({ width: '100%' });
  });
});
