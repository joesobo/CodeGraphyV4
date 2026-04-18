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
        progress={{ phase: 'Indexing Repo', current: 1, total: 4 }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the phase label and percent while indexing', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Repo', current: 1, total: 4 }}
      />,
    );

    expect(screen.getByTestId('graph-index-status')).toBeInTheDocument();
    expect(screen.getByText('Indexing Repo')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('graph-index-status-fill')).toHaveStyle({ width: '25%' });
  });

  it('shows zero progress when the total is zero', () => {
    render(
      <GraphIndexStatus
        isIndexing={true}
        progress={{ phase: 'Indexing Repo', current: 3, total: 0 }}
      />,
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByTestId('graph-index-status-fill')).toHaveStyle({ width: '0%' });
  });
});
