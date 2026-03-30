import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ICommitInfo } from '@/shared/timeline/types';

vi.mock('../../../../../src/webview/components/ui/overlay/tooltip', async () => {
  const React = await import('react');

  const TooltipContext = React.createContext<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
  }>({
    onOpenChange: () => undefined,
    open: false,
  });

  function TooltipProvider({ children }: React.PropsWithChildren): React.ReactElement {
    return <>{children}</>;
  }

  function Tooltip({
    children,
    open = false,
    onOpenChange = () => undefined,
  }: React.PropsWithChildren<{
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
  }>): React.ReactElement {
    return (
      <TooltipContext.Provider value={{ onOpenChange, open }}>
        {children}
      </TooltipContext.Provider>
    );
  }

  function TooltipTrigger({
    children,
  }: React.PropsWithChildren<{ asChild?: boolean }>): React.ReactElement {
    const { onOpenChange } = React.useContext(TooltipContext);
    const child = React.Children.only(children) as React.ReactElement<{
      onBlur?: React.FocusEventHandler<HTMLElement>;
      onFocus?: React.FocusEventHandler<HTMLElement>;
      tabIndex?: number;
    }>;

    return React.cloneElement(child, {
      onBlur: (event) => {
        child.props.onBlur?.(event);
        onOpenChange(false);
      },
      onFocus: (event) => {
        child.props.onFocus?.(event);
        onOpenChange(true);
      },
      tabIndex: child.props.tabIndex ?? 0,
    });
  }

  function TooltipContent({
    children,
    side: _side,
    sideOffset: _sideOffset,
    ...props
  }: React.PropsWithChildren<{
    className?: string;
    side?: string;
    sideOffset?: number;
  }>): React.ReactElement | null {
    const { open } = React.useContext(TooltipContext);

    if (!open) {
      return null;
    }

    return (
      <div role="tooltip" {...props}>
        {children}
      </div>
    );
  }

  return { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
});

import Track from '../../../../../src/webview/components/timeline/view/Track';

const startTimestamp = Math.floor(Date.UTC(2024, 0, 1, 12, 0, 0) / 1000);
const middleTimestamp = Math.floor(Date.UTC(2024, 0, 3, 12, 0, 0) / 1000);
const endTimestamp = Math.floor(Date.UTC(2024, 0, 5, 12, 0, 0) / 1000);
const firstTickTimestamp = Math.floor(Date.UTC(2024, 0, 2, 12, 0, 0) / 1000);
const secondTickTimestamp = Math.floor(Date.UTC(2024, 0, 4, 12, 0, 0) / 1000);

const commits: ICommitInfo[] = [
  {
    author: 'Alice',
    message: 'Initial commit',
    parents: [],
    sha: 'aaa111aaa111aaa111aaa111aaa111aaa111aaa1',
    timestamp: startTimestamp,
  },
  {
    author: 'Bob',
    message: 'Add feature X',
    parents: ['aaa111aaa111aaa111aaa111aaa111aaa111aaa1'],
    sha: 'bbb222bbb222bbb222bbb222bbb222bbb222bbb2',
    timestamp: middleTimestamp,
  },
  {
    author: 'Cara',
    message: 'Ship the release candidate',
    parents: ['bbb222bbb222bbb222bbb222bbb222bbb222bbb2'],
    sha: 'ccc333ccc333ccc333ccc333ccc333ccc333ccc3',
    timestamp: endTimestamp,
  },
];

function formatAxisLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp * 1000));
}

function renderTrack(overrides: Partial<React.ComponentProps<typeof Track>> = {}) {
  return render(
    <Track
      dateTicks={[firstTickTimestamp, secondTickTimestamp]}
      indicatorPosition={50}
      isAtEnd={false}
      isPlaying={false}
      onJumpToEnd={vi.fn()}
      onPlayPause={vi.fn()}
      onTrackMouseDown={vi.fn()}
      setTrackElement={vi.fn()}
      timelineCommits={commits}
      {...overrides}
    />,
  );
}

describe('timeline/Track', () => {
  it('renders the controls, markers, and axis labels', () => {
    renderTrack();

    expect(screen.getByTitle('Play')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-track')).toBeInTheDocument();
    expect(screen.getAllByTestId('timeline-commit-marker')).toHaveLength(3);
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText(formatAxisLabel(firstTickTimestamp))).toBeInTheDocument();
    expect(screen.getByText(formatAxisLabel(secondTickTimestamp))).toBeInTheDocument();
  });

  it('sets the track element and applies the expected track, marker, and wrapper styles', () => {
    const setTrackElement = vi.fn();

    renderTrack({ indicatorPosition: 37, setTrackElement });

    expect(setTrackElement).toHaveBeenCalledWith(expect.any(HTMLDivElement));

    const track = screen.getByTestId('timeline-track');
    const markers = screen.getAllByTestId('timeline-commit-marker');
    const firstMarkerFill = markers[0].firstElementChild as HTMLElement;
    const axisWrapper = screen.getByText('Now').parentElement?.parentElement as HTMLElement;

    expect(track).toHaveStyle({
      border: '1px solid var(--vscode-panel-border, #333)',
      height: '24px',
    });
    expect(markers[0]).toHaveStyle({ left: '0%', width: '2px', zIndex: '1' });
    expect(markers[1]).toHaveStyle({ left: '50%' });
    expect(markers[2]).toHaveStyle({ left: '100%' });
    expect(firstMarkerFill).toHaveStyle({
      backgroundColor: 'var(--vscode-foreground, #ccc)',
      opacity: '0.4',
    });
    expect(screen.getByTestId('timeline-indicator')).toHaveStyle({ left: '37%' });
    expect(axisWrapper).toHaveStyle({ marginLeft: '22px' });
  });

  it('delegates playback, current, and track interactions', () => {
    const onPlayPause = vi.fn();
    const onJumpToEnd = vi.fn();
    const onTrackMouseDown = vi.fn();

    renderTrack({
      indicatorPosition: 25,
      onJumpToEnd,
      onPlayPause,
      onTrackMouseDown,
    });

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

    renderTrack({ indicatorPosition: 25, timelineCommits: tooltipCommits });

    fireEvent.mouseEnter(screen.getAllByTestId('timeline-commit-marker')[0]);

    const tooltip = screen.getByRole('tooltip');

    expect(within(tooltip).getByText('aaa111a')).toBeInTheDocument();
    expect(within(tooltip).getByText(
      'A very long commit message that exceeds the tooltip truncation limit by quite...',
    )).toBeInTheDocument();
    expect(within(tooltip).getByText(
      `Alice · ${new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(startTimestamp * 1000))}`,
    )).toBeInTheDocument();
  });

  it('closes the tooltip when the hovered marker is left', () => {
    renderTrack();

    const firstMarker = screen.getAllByTestId('timeline-commit-marker')[0];

    fireEvent.mouseEnter(firstMarker);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(firstMarker);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('responds to tooltip open state changes from the trigger', () => {
    renderTrack();

    const firstMarker = screen.getAllByTestId('timeline-commit-marker')[0];

    fireEvent.focus(firstMarker);

    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('aaa111a')).toBeInTheDocument();

    fireEvent.blur(firstMarker);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('positions axis labels and the now label relative to the commit range', () => {
    renderTrack();

    const firstAxisLabel = screen.getByText(formatAxisLabel(firstTickTimestamp));
    const secondAxisLabel = screen.getByText(formatAxisLabel(secondTickTimestamp));
    const nowLabel = screen.getByText('Now');

    expect(firstAxisLabel).toHaveStyle({ left: '25%', top: '2px' });
    expect(secondAxisLabel).toHaveStyle({ left: '75%', top: '2px' });
    expect(nowLabel).toHaveStyle({ right: '56px', top: '2px' });
  });

  it('renders the formatted author and date line in the tooltip', () => {
    renderTrack({ indicatorPosition: 25 });

    fireEvent.mouseEnter(screen.getAllByTestId('timeline-commit-marker')[0]);

    const tooltip = screen.getByRole('tooltip');

    expect(tooltip).toHaveTextContent(
      new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(startTimestamp * 1000)),
    );
  });

  it('disables the current button when the latest commit is already selected', () => {
    renderTrack({ indicatorPosition: 100, isAtEnd: true, isPlaying: true });

    expect(screen.getByTestId('timeline-current')).toBeDisabled();
    expect(screen.getByTitle('Pause')).toBeInTheDocument();
  });
});
