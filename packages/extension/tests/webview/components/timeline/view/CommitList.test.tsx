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
});
