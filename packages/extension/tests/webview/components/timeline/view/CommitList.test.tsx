import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CommitList from '../../../../../src/webview/components/timeline/view/CommitList';

const commits = [
  {
    author: 'Alice',
    message: 'Initial import',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 1709208000,
  },
  {
    author: 'Bob',
    message: 'Add timeline controls',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 1709294400,
  },
  {
    author: 'Cara',
    message: 'Tighten timeline layout',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 1709380800,
  },
];

const mergeCommits = [
  {
    author: 'Alice',
    message: 'Initial import',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 1709208000,
  },
  {
    author: 'Bob',
    message: 'Mainline change',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 1709294400,
  },
  {
    author: 'Cara',
    message: 'Feature branch change',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: 1709380800,
  },
  {
    author: 'Dana',
    message: 'Merge feature branch',
    parents: [
      'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
      'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    ],
    sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
    timestamp: 1709467200,
  },
];

describe('timeline/CommitList', () => {
  it('renders commits newest-first and highlights the current commit', () => {
    render(
      <CommitList
        collapsed={false}
        currentCommitSha={commits[1].sha}
        onSelectCommit={vi.fn()}
        onToggle={vi.fn()}
        timelineCommits={commits}
      />,
    );

    const buttons = within(screen.getByTestId('timeline-commit-list-scroll')).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Tighten timeline layout');
    expect(buttons[1]).toHaveAttribute('aria-current', 'true');
    expect(buttons[1]).toHaveTextContent('Add timeline controls');
    expect(screen.getByTestId('timeline-commit-list-scroll')).toHaveClass('overflow-y-auto');
  });

  it('calls onSelectCommit with the selected sha', () => {
    const onSelectCommit = vi.fn();

    render(
      <CommitList
        collapsed={false}
        currentCommitSha={commits[1].sha}
        onSelectCommit={onSelectCommit}
        onToggle={vi.fn()}
        timelineCommits={commits}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Initial import/i }));

    expect(onSelectCommit).toHaveBeenCalledWith(commits[0].sha);
  });

  it('collapses the commit list behind a section toggle', () => {
    const onToggle = vi.fn();

    render(
      <CommitList
        collapsed={true}
        currentCommitSha={commits[1].sha}
        onSelectCommit={vi.fn()}
        onToggle={onToggle}
        timelineCommits={commits}
      />,
    );

    expect(screen.getByRole('button', { name: 'Commits' })).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-commit-list-scroll')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Commits' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders a branch graph gutter for merge histories', () => {
    render(
      <CommitList
        collapsed={false}
        currentCommitSha={mergeCommits[3].sha}
        onSelectCommit={vi.fn()}
        onToggle={vi.fn()}
        timelineCommits={mergeCommits}
      />,
    );

    expect(screen.getAllByTestId('timeline-commit-branch-graph')).toHaveLength(4);
  });

  it('anchors branch graphs in an overlay rail instead of a detached gutter column', () => {
    render(
      <CommitList
        collapsed={false}
        currentCommitSha={mergeCommits[3].sha}
        onSelectCommit={vi.fn()}
        onToggle={vi.fn()}
        timelineCommits={mergeCommits}
      />,
    );

    const item = screen.getAllByTestId('timeline-commit-item')[0];

    expect(item).toHaveClass('relative');
    expect(within(item).getByTestId('timeline-commit-branch-rail')).toHaveClass(
      'absolute',
      'inset-y-0',
      'left-0',
    );
  });
});
