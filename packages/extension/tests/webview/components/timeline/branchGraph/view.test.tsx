import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildBranchGraphModel } from '../../../../../src/webview/components/timeline/branchGraph/model';
import { BranchGraphRowView } from '../../../../../src/webview/components/timeline/branchGraph/view';

describe('timeline/branchGraph/view', () => {
  it('renders commit dots and merge connectors for a multi-lane row', () => {
    const model = buildBranchGraphModel([
      {
        author: 'Dana',
        message: 'Merge feature branch',
        parents: ['main', 'feature'],
        sha: 'merge',
        timestamp: 400,
      },
      {
        author: 'Cara',
        message: 'Feature branch change',
        parents: ['root'],
        sha: 'feature',
        timestamp: 300,
      },
      {
        author: 'Bob',
        message: 'Mainline change',
        parents: ['root'],
        sha: 'main',
        timestamp: 200,
      },
      {
        author: 'Alice',
        message: 'Initial import',
        parents: [],
        sha: 'root',
        timestamp: 100,
      },
    ]);
    const mergeRow = model.rows[0];

    expect(mergeRow).toBeDefined();

    render(
      <BranchGraphRowView isCurrent={true} maxLaneCount={model.maxLane + 1} row={mergeRow!} />,
    );

    expect(screen.getByTestId('timeline-commit-branch-graph')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-commit-branch-dot')).toBeInTheDocument();
    expect(screen.getAllByTestId('timeline-commit-branch-segment').length).toBeGreaterThanOrEqual(2);
  });
});
