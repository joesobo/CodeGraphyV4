import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Status from '../../../../../src/webview/components/timeline/view/Status';

describe('timeline/Status', () => {
  it('renders a disabled Index Git History button when graph data is unavailable', () => {
    render(
      <Status
        hasGraphData={false}
        isGraphLoading={false}
        isIndexing={false}
        indexProgress={null}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Index Git History' })).toBeDisabled();
  });

  it('renders an Index Git History button when graph data is available', () => {
    render(
      <Status
        hasGraphData
        isGraphLoading={false}
        isIndexing={false}
        indexProgress={null}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Index Git History' })).toBeInTheDocument();
  });

  it('calls onIndexRepo when the Index Git History button is clicked', () => {
    const onIndexRepo = vi.fn();

    render(
      <Status
        hasGraphData
        isGraphLoading={false}
        isIndexing={false}
        indexProgress={null}
        onIndexRepo={onIndexRepo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Index Git History' }));

    expect(onIndexRepo).toHaveBeenCalledTimes(1);
  });

  it('renders progress details and fill width when indexing with progress', () => {
    render(
      <Status
        hasGraphData={false}
        isGraphLoading={true}
        isIndexing
        indexProgress={{ phase: 'Scanning commits', current: 50, total: 200 }}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByText('Scanning commits (50/200)')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-status-progress-fill')).toHaveStyle({ width: '25%' });
  });

  it('renders zero progress when the total count is zero', () => {
    render(
      <Status
        hasGraphData={false}
        isGraphLoading={true}
        isIndexing
        indexProgress={{ phase: 'Scanning commits', current: 50, total: 0 }}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByText('Scanning commits (50/0)')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-status-progress-fill')).toHaveStyle({ width: '0%' });
  });

  it('renders a generic indexing message when progress is unavailable', () => {
    render(
      <Status
        hasGraphData={false}
        isGraphLoading={true}
        isIndexing
        indexProgress={null}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByText('Indexing repository...')).toBeInTheDocument();
  });

  it('keeps the Index Git History button disabled while the graph is still loading', () => {
    render(
      <Status
        hasGraphData={false}
        isGraphLoading
        isIndexing={false}
        indexProgress={null}
        onIndexRepo={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Index Git History' })).toBeDisabled();
  });
});
