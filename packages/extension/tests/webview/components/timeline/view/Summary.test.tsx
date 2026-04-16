import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Summary from '../../../../../src/webview/components/timeline/view/Summary';

const mergeCommit = {
  author: 'Grace Hopper',
  message: 'Stabilize timeline panel\nAdds the current commit summary and details.',
  parents: ['aaa111', 'bbb222'],
  sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
  timestamp: 1709294400,
};

describe('timeline/Summary', () => {
  it('renders current commit metadata and message details', () => {
    render(
      <Summary
        collapsed={false}
        currentCommit={mergeCommit}
        currentIndex={2}
        onToggle={() => {}}
        totalCommits={8}
      />,
    );

    expect(screen.getByText('Current Commit')).toBeInTheDocument();
    expect(screen.getByText('ccc333c')).toBeInTheDocument();
    expect(screen.getByText('Stabilize timeline panel')).toBeInTheDocument();
    expect(screen.getByText('Adds the current commit summary and details.')).toBeInTheDocument();
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
    expect(screen.getByText('3 of 8')).toBeInTheDocument();
    expect(screen.getByText('Merge commit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Current Commit' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('settings-panel-chevron')).toHaveClass('rotate-90');
  });

  it('renders a root-commit badge and omits the body for a simple one-line root commit', () => {
    render(
      <Summary
        collapsed={false}
        currentCommit={{
          author: 'Alice',
          message: 'Initial import',
          parents: [],
          sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
          timestamp: 1709208000,
        }}
        currentIndex={0}
        onToggle={() => {}}
        totalCommits={1}
      />,
    );

    expect(screen.queryByText('Merge commit')).not.toBeInTheDocument();
    expect(screen.getByText('Root commit')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-summary-body')).not.toBeInTheDocument();
  });

  it('collapses the current commit details behind a toggle', () => {
    const onToggle = vi.fn();

    render(
      <Summary
        collapsed={true}
        currentCommit={mergeCommit}
        currentIndex={2}
        onToggle={onToggle}
        totalCommits={8}
      />,
    );

    expect(screen.getByRole('button', { name: 'Current Commit' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('settings-panel-chevron')).not.toHaveClass('rotate-90');
    expect(screen.getByText('3 of 8')).toBeInTheDocument();
    expect(screen.queryByText('Merge commit')).not.toBeInTheDocument();
    expect(screen.queryByText('Stabilize timeline panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Current Commit' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('omits the commit-kind badge for ordinary single-parent commits', () => {
    render(
      <Summary
        collapsed={false}
        currentCommit={{
          author: 'Ada Lovelace',
          message: 'Refine node sizing',
          parents: ['aaa111'],
          sha: 'ddd444ddd444ddd444ddd444ddd444ddd444ddd4',
          timestamp: 1709380800,
        }}
        currentIndex={1}
        onToggle={() => {}}
        totalCommits={4}
      />,
    );

    expect(screen.queryByText('Root commit')).not.toBeInTheDocument();
    expect(screen.queryByText('Merge commit')).not.toBeInTheDocument();
    expect(screen.getByText('Refine node sizing')).toBeInTheDocument();
  });
});
