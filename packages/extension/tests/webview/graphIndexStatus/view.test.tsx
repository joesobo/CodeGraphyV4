import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphIndexStatus } from '../../../src/webview/components/graphIndexStatus/view';

describe('GraphIndexStatus', () => {
  it('renders nothing when indexing is inactive', () => {
    const { container } = render(
      <GraphIndexStatus isIndexing={false} progress={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when indexing is inactive even if stale progress exists', () => {
    const { container } = render(
      <GraphIndexStatus
        isIndexing={false}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the phase label and percent while indexing', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
      />,
    );

    expect(screen.getByTestId('graph-index-status')).toBeInTheDocument();
    expect(screen.getByText('Indexing Workspace')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('graph-index-status-fill')).toHaveStyle({ width: '25%' });
  });

  it('does not capture pointer events from graph controls and popups', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Workspace', current: 1, total: 4 }}
      />,
    );

    expect(screen.getByTestId('graph-index-status').className).toContain('pointer-events-none');
  });

  it('anchors to the graph bottom and reserves the bottom-right graph control lane', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Discovering Files', current: 1, total: 1 }}
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

  it('shows zero progress when the total is zero', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Workspace', current: 3, total: 0 }}
      />,
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByTestId('graph-index-status-fill')).toHaveStyle({ width: '0%' });
  });
});
