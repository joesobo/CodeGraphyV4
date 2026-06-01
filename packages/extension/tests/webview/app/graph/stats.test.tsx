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

    expect(screen.getByText('2 visible nodes • 1 rendered edge')).toBeInTheDocument();
  });

  it('does not present missing-index edges as a final rendered edge count', () => {
    expect(buildGraphStatsLabel(2, 0, { hasIndex: false })).toBe(
      '2 visible nodes • relationships not indexed',
    );
  });

  it('keeps the stats badge distinct from the graph surface', () => {
    render(<GraphStatsBadge label={buildGraphStatsLabel(2, 1)} />);

    const badge = screen.getByText('2 visible nodes • 1 rendered edge');
    expect(badge.className).toContain('bg-[var(--cg-background)]');
    expect(badge.className).toContain('border-[var(--cg-border-subtle)]');
    expect(badge.className).not.toContain('bg-[var(--cg-popover-translucent)]');
  });

  it('insets the stats badge from the graph corner', () => {
    render(<GraphStatsBadge label={buildGraphStatsLabel(2, 1)} />);

    const badge = screen.getByText('2 visible nodes • 1 rendered edge');
    expect(badge.className).toContain('right-4');
    expect(badge.className).toContain('top-4');
  });

  it('builds a combined stats label for singular nodes and plural edges', () => {
    expect(buildGraphStatsLabel(1, 2)).toBe('1 visible node • 2 rendered edges');
  });
});
