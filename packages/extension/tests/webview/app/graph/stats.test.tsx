import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraphStatsBadge, buildGraphStatsLabel, formatGraphStat } from '../../../../src/webview/app/graph/stats';

describe('app/graph/stats', () => {
  it('formats singular and plural graph counts', () => {
    expect(formatGraphStat(1, 'node', 'nodes')).toBe('1 node');
    expect(formatGraphStat(1200, 'edge', 'edges')).toBe('1,200 edges');
  });

  it('builds a combined stats label and renders it', () => {
    render(<GraphStatsBadge label={buildGraphStatsLabel(2, 1)} />);

    expect(screen.getByText('2 nodes • 1 edge')).toBeInTheDocument();
  });

  it('builds a combined stats label for singular nodes and plural edges', () => {
    expect(buildGraphStatsLabel(1, 2)).toBe('1 node • 2 edges');
  });
});
