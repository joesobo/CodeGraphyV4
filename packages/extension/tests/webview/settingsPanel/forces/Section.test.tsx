import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForcesSection } from '../../../../src/webview/components/settingsPanel/forces/Section';
import { graphStore } from '../../../../src/webview/store';
import type { IPhysicsSettings } from '../../../../src/shared/types';

vi.mock('../../../../src/webview/components/ui/slider', () => ({
  Slider: ({
    'data-testid': testId,
    step,
    value,
    onValueChange,
    onValueCommit,
  }: {
    'data-testid'?: string;
    step?: number;
    value?: number[];
    onValueChange?: (values: number[]) => void;
    onValueCommit?: (values: number[]) => void;
  }) => {
    const currentValue = value?.[0] ?? 0;
    const nextValue = Number((currentValue + (step ?? 1)).toFixed(2));
    return (
      <div>
        <button data-testid={`${testId}-change`} onClick={() => onValueChange?.([nextValue])} />
        <button data-testid={`${testId}-commit`} onClick={() => onValueCommit?.([nextValue])} />
      </div>
    );
  },
}));

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/lib/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

const DEFAULT_PHYSICS: IPhysicsSettings = {
  repelForce: 5,
  centerForce: 0.01,
  linkDistance: 100,
  linkForce: 0.08,
  damping: 0.4,
};

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    physicsSettings: DEFAULT_PHYSICS,
    ...overrides,
  });
}

function renderSection(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  return render(<ForcesSection />);
}

describe('ForcesSection', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('renders the four physics controls', () => {
    renderSection();

    expect(screen.getByText('Repel Force')).toBeInTheDocument();
    expect(screen.getByText('Center Force')).toBeInTheDocument();
    expect(screen.getByText('Link Distance')).toBeInTheDocument();
    expect(screen.getByText('Link Force')).toBeInTheDocument();
  });

  it('persists repel force updates after debounce', () => {
    vi.useFakeTimers();
    renderSection();

    fireEvent.click(screen.getByTestId('repel-force-slider-change'));

    expect(graphStore.getState().physicsSettings.repelForce).toBe(6);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 6 },
    });
    vi.useRealTimers();
  });

  it('persists center force updates on commit', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('center-force-slider-change'));
    fireEvent.click(screen.getByTestId('center-force-slider-commit'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'centerForce', value: 0.02 },
    });
  });

  it('persists link distance updates on commit', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('link-distance-slider-change'));
    fireEvent.click(screen.getByTestId('link-distance-slider-commit'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'linkDistance', value: 110 },
    });
  });

  it('persists link force updates on commit', () => {
    renderSection();

    fireEvent.click(screen.getByTestId('link-force-slider-change'));
    fireEvent.click(screen.getByTestId('link-force-slider-commit'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'linkForce', value: 0.09 },
    });
  });

  it('keeps only the latest pending value for the same slider', () => {
    vi.useFakeTimers();
    renderSection();

    fireEvent.click(screen.getByTestId('repel-force-slider-change'));
    fireEvent.click(screen.getByTestId('repel-force-slider-change'));

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const physicsMessages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_PHYSICS_SETTING'
    );
    expect(physicsMessages).toHaveLength(1);
    expect(physicsMessages.at(-1)).toEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 7 },
    });
    vi.useRealTimers();
  });

  it('flushes repel force immediately on commit and clears the pending timer', () => {
    vi.useFakeTimers();
    renderSection();

    fireEvent.click(screen.getByTestId('repel-force-slider-change'));
    fireEvent.click(screen.getByTestId('repel-force-slider-commit'));

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 6 },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    const physicsMessages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_PHYSICS_SETTING'
    );
    expect(physicsMessages).toHaveLength(1);
    vi.useRealTimers();
  });

  it('cancels pending physics updates on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderSection();

    fireEvent.click(screen.getByTestId('repel-force-slider-change'));
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(sentMessages).toEqual([]);
    vi.useRealTimers();
  });
});
