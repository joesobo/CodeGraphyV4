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
  commits[0],
  {
    author: 'Bob',
    message: 'Merge feature branch',
    parents: [commits[0].sha, commits[1].sha],
    sha: 'mmm444mmm444mmm444mmm444mmm444mmm444mmm4',
    timestamp: 1709294400,
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

    expect(screen.getByTestId('timeline-commit-list')).toHaveClass(
      'border-t',
      'border-border',
      'min-h-0',
      'flex',
      'flex-1',
      'flex-col',
      'overflow-hidden',
    );

    const buttons = within(screen.getByTestId('timeline-commit-list-scroll')).getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Tighten timeline layout');
    expect(within(buttons[0]).getByText('ccc333c', { selector: 'span.font-mono' })).toBeInTheDocument();
    expect(within(buttons[0]).queryByText(commits[2].sha, { selector: 'span.font-mono' })).not.toBeInTheDocument();
    expect(buttons[0]).toHaveClass('hover:bg-[var(--vscode-list-hoverBackground,#2a2d2e)]');
    expect(buttons[1]).toHaveAttribute('aria-current', 'true');
    expect(buttons[1]).toHaveTextContent('Add timeline controls');
    expect(buttons[1]).toHaveClass(
      'bg-[var(--vscode-list-activeSelectionBackground,#264f78)]',
      'text-[var(--vscode-list-activeSelectionForeground,#fff)]',
    );

    expect(screen.getByTestId('timeline-commit-list-scroll')).toHaveClass('overflow-y-auto');
    expect(screen.getByTestId('settings-panel-chevron')).toHaveClass('rotate-90');
  });

  it('calls onSelectCommit with the selected sha and shows merge commits', () => {
    const onSelectCommit = vi.fn();

    render(
      <CommitList
        collapsed={false}
        currentCommitSha={mergeCommits[0].sha}
        onSelectCommit={onSelectCommit}
        onToggle={vi.fn()}
        timelineCommits={mergeCommits}
      />,
    );

    const buttons = within(screen.getByTestId('timeline-commit-list-scroll')).getAllByRole('button');
    expect(within(buttons[0]).getByText('Merge', { selector: 'span.rounded' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Initial import/i }));

    expect(onSelectCommit).toHaveBeenCalledWith(mergeCommits[0].sha);
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

    const toggle = screen.getByRole('button', { name: 'Commits' });

    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('timeline-commit-list')).toHaveClass('flex-shrink-0');
    expect(screen.getByTestId('settings-panel-chevron')).not.toHaveClass('rotate-90');
    expect(screen.queryByTestId('timeline-commit-list-scroll')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
