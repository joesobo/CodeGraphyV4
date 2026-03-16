import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '../../../src/shared/types';
import Track from '../../../src/webview/components/timeline/Track';

const commits: ICommitInfo[] = [
  {
    author: 'Alice',
    message: 'Initial commit',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: 1000,
  },
  {
    author: 'Bob',
    message: 'Add feature X',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: 2000,
  },
];

function formatAxisLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp * 1000));
}

describe('timeline/Track', () => {
  it('renders the controls, markers, and axis labels', () => {
    render(
      <Track
        dateTicks={[1250, 1750]}
        indicatorPosition={50}
        isAtEnd={false}
        isPlaying={false}
        onJumpToEnd={vi.fn()}
        onPlayPause={vi.fn()}
        onTrackMouseDown={vi.fn()}
        setTrackElement={vi.fn()}
        timelineCommits={commits}
      />,
    );

    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-track')).toBeInTheDocument();
    expect(screen.getAllByTestId('timeline-commit-marker')).toHaveLength(2);
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getAllByText(formatAxisLabel(1250)).length).toBeGreaterThan(0);
  });

  it('sets the track element and positions the indicator and markers across the full range', () => {
    const setTrackElement = vi.fn();

    render(
      <Track
        dateTicks={[1250]}
        indicatorPosition={37}
        isAtEnd={false}
        isPlaying={false}
        onJumpToEnd={vi.fn()}
        onPlayPause={vi.fn()}
        onTrackMouseDown={vi.fn()}
        setTrackElement={setTrackElement}
        timelineCommits={commits}
      />,
    );

    expect(setTrackElement).toHaveBeenCalledWith(expect.any(HTMLDivElement));

    const markers = screen.getAllByTestId('timeline-commit-marker');
    expect(markers[0]).toHaveStyle({ left: '0%' });
    expect(markers[1]).toHaveStyle({ left: '100%' });
    expect(screen.getByTestId('timeline-indicator')).toHaveStyle({ left: '37%' });
  });

  it('delegates playback, current, and track interactions', () => {
    const onPlayPause = vi.fn();
    const onJumpToEnd = vi.fn();
    const onTrackMouseDown = vi.fn();

    render(
      <Track
        dateTicks={[1250]}
        indicatorPosition={25}
        isAtEnd={false}
        isPlaying={false}
        onJumpToEnd={onJumpToEnd}
        onPlayPause={onPlayPause}
        onTrackMouseDown={onTrackMouseDown}
        setTrackElement={vi.fn()}
        timelineCommits={commits}
      />,
    );

    fireEvent.click(screen.getByTitle('Play'));
    fireEvent.click(screen.getByTestId('timeline-current'));
    fireEvent.mouseDown(screen.getByTestId('timeline-track'), { clientX: 120 });

    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onJumpToEnd).toHaveBeenCalledTimes(1);
    expect(onTrackMouseDown).toHaveBeenCalledTimes(1);
  });

  it('shows tooltip details for the hovered commit marker', () => {
    const tooltipCommits: ICommitInfo[] = [
      {
        ...commits[0],
        message: 'A very long commit message that exceeds the tooltip truncation limit by quite a bit',
      },
      commits[1],
    ];

    render(
      <Track
        dateTicks={[1250]}
        indicatorPosition={25}
        isAtEnd={false}
        isPlaying={false}
        onJumpToEnd={vi.fn()}
        onPlayPause={vi.fn()}
        onTrackMouseDown={vi.fn()}
        setTrackElement={vi.fn()}
        timelineCommits={tooltipCommits}
      />,
    );

    fireEvent.mouseEnter(screen.getAllByTestId('timeline-commit-marker')[0]);

    const tooltip = screen.getByRole('tooltip');

    expect(tooltip).toHaveTextContent('aaa111a');
    expect(tooltip).toHaveTextContent(
      'A very long commit message that exceeds the tooltip truncation limit by quite...',
    );
    expect(tooltip).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(1000 * 1000)),
    );
  });

  it('disables the current button when the latest commit is already selected', () => {
    render(
      <Track
        dateTicks={[1250]}
        indicatorPosition={100}
        isAtEnd
        isPlaying
        onJumpToEnd={vi.fn()}
        onPlayPause={vi.fn()}
        onTrackMouseDown={vi.fn()}
        setTrackElement={vi.fn()}
        timelineCommits={commits}
      />,
    );

    expect(screen.getByTestId('timeline-current')).toBeDisabled();
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });
});
