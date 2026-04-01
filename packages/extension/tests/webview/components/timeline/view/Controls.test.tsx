import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Controls from '../../../../../src/webview/components/timeline/view/Controls';

describe('timeline/Controls', () => {
  it('renders the timeline navigation controls, date readout, and disabled states', () => {
    render(
      <Controls
        currentDateLabel="Jan 4, 2024"
        isAtEnd={false}
        isAtStart={true}
        isPlaying={false}
        onJumpToCurrent={vi.fn()}
        onJumpToNext={vi.fn()}
        onJumpToPrevious={vi.fn()}
        onJumpToStart={vi.fn()}
        onPlayPause={vi.fn()}
      />,
    );

    expect(screen.getByText('Viewing Date')).toBeInTheDocument();
    expect(screen.getByText('Jan 4, 2024')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Play' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Current' })).toBeEnabled();
  });

  it('delegates click handlers for the navigation controls', () => {
    const onJumpToStart = vi.fn();
    const onJumpToPrevious = vi.fn();
    const onPlayPause = vi.fn();
    const onJumpToNext = vi.fn();
    const onJumpToCurrent = vi.fn();

    render(
      <Controls
        currentDateLabel="Jan 4, 2024"
        isAtEnd={false}
        isAtStart={false}
        isPlaying={true}
        onJumpToCurrent={onJumpToCurrent}
        onJumpToNext={onJumpToNext}
        onJumpToPrevious={onJumpToPrevious}
        onJumpToStart={onJumpToStart}
        onPlayPause={onPlayPause}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Current' }));

    expect(onJumpToStart).toHaveBeenCalledTimes(1);
    expect(onJumpToPrevious).toHaveBeenCalledTimes(1);
    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onJumpToNext).toHaveBeenCalledTimes(1);
    expect(onJumpToCurrent).toHaveBeenCalledTimes(1);
  });
});
