import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIRECTION_COLOR } from '../../../../src/shared/fileColors';
import { DisplaySection } from '../../../../src/webview/components/settingsPanel/display/Section';
import { graphStore } from '../../../../src/webview/store/state';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

function setStoreState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    edgeColors: {},
    activePanel: 'none',
    maxFiles: 500,
    ...overrides,
  });
}

function renderContent(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  return render(<DisplaySection />);
}

describe('DisplaySection', () => {
  beforeEach(() => {
    sentMessages.length = 0;
  });

  it('renders direction mode buttons', () => {
    renderContent();

    expect(screen.getByRole('button', { name: /^Arrows$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Particles$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^None$/i })).toBeInTheDocument();
  });

  it('marks the current direction mode button as pressed', () => {
    const { rerender } = renderContent({ directionMode: 'arrows' });

    expect(screen.getByRole('button', { name: /^Arrows$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Particles$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      setStoreState({ directionMode: 'particles' });
      rerender(<DisplaySection />);
    });

    expect(screen.getByRole('button', { name: /^Arrows$/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /^Particles$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      setStoreState({ directionMode: 'none' });
      rerender(<DisplaySection />);
    });

    expect(screen.getByRole('button', { name: /^None$/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the current bidirectional mode button as pressed', () => {
    const { rerender } = renderContent({ bidirectionalMode: 'separate' });

    expect(screen.getByRole('button', { name: /^Separate$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Combined$/i })).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      setStoreState({ bidirectionalMode: 'combined' });
      rerender(<DisplaySection />);
    });

    expect(screen.getByRole('button', { name: /^Combined$/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the current direction color from store state', () => {
    renderContent({
      directionColor: '#123ABC',
      folderNodeColor: '#654321',
    });

    expect(screen.getByLabelText('Direction Color')).toHaveValue('#123abc');
  });

  it('posts direction mode updates when selecting particles', () => {
    renderContent();

    fireEvent.click(screen.getByRole('button', { name: /^Particles$/i }));

    expect(graphStore.getState().directionMode).toBe('particles');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_DIRECTION_MODE',
      payload: { directionMode: 'particles' },
    });
  });

  it('posts direction mode updates when selecting arrows', () => {
    renderContent({ directionMode: 'particles' });

    fireEvent.click(screen.getByRole('button', { name: /^Arrows$/i }));

    expect(graphStore.getState().directionMode).toBe('arrows');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_DIRECTION_MODE',
      payload: { directionMode: 'arrows' },
    });
  });

  it('posts bidirectional mode updates when selecting combined', () => {
    renderContent();

    fireEvent.click(screen.getByRole('button', { name: /^Combined$/i }));

    expect(graphStore.getState().bidirectionalMode).toBe('combined');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_BIDIRECTIONAL_MODE',
      payload: { bidirectionalMode: 'combined' },
    });
  });

  it('posts bidirectional mode updates when selecting separate', () => {
    renderContent({ bidirectionalMode: 'combined' });

    fireEvent.click(screen.getByRole('button', { name: /^Separate$/i }));

    expect(graphStore.getState().bidirectionalMode).toBe('separate');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_BIDIRECTIONAL_MODE',
      payload: { bidirectionalMode: 'separate' },
    });
  });

  it('shows particle controls only for particle direction mode', () => {
    const { rerender } = renderContent({ directionMode: 'particles' });
    expect(screen.getByText('Particle Speed')).toBeInTheDocument();
    expect(screen.getByText('Particle Size')).toBeInTheDocument();

    act(() => {
      setStoreState({ directionMode: 'arrows' });
      rerender(<DisplaySection />);
    });

    expect(screen.queryByText('Particle Speed')).not.toBeInTheDocument();
    expect(screen.queryByText('Particle Size')).not.toBeInTheDocument();
  });

  it('persists normalized particle speed after debounce', () => {
    vi.useFakeTimers();
    renderContent({ directionMode: 'particles', particleSpeed: 0.0005 });

    const speedSlider = screen.getAllByRole('slider').find(
      (element) =>
        element.getAttribute('aria-valuemin') === '1' &&
        element.getAttribute('aria-valuemax') === '10'
    );

    expect(speedSlider).toBeTruthy();

    fireEvent.keyDown(speedSlider!, { key: 'ArrowRight' });
    expect(graphStore.getState().particleSpeed).toBeCloseTo(0.001, 6);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PARTICLE_SETTING',
      payload: { key: 'particleSpeed', value: 0.001 },
    });
    vi.useRealTimers();
  });

  it('reports the latest particle speed value after repeated changes', () => {
    vi.useFakeTimers();
    renderContent({ directionMode: 'particles', particleSpeed: 0.0005 });

    const speedSlider = screen.getAllByRole('slider').find(
      (element) =>
        element.getAttribute('aria-valuemin') === '1' &&
        element.getAttribute('aria-valuemax') === '10'
    );

    expect(speedSlider).toBeTruthy();

    fireEvent.keyDown(speedSlider!, { key: 'ArrowRight' });
    fireEvent.keyDown(speedSlider!, { key: 'ArrowRight' });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const particleMessages = sentMessages.filter(
      (message) => (message as { type?: string }).type === 'UPDATE_PARTICLE_SETTING'
    ) as Array<{ type: string; payload: { key: string; value: number } }>;

    expect(particleMessages.at(-1)).toEqual({
      type: 'UPDATE_PARTICLE_SETTING',
      payload: { key: 'particleSpeed', value: 0.0015 },
    });
    vi.useRealTimers();
  });

  it('persists particle size after debounce', () => {
    vi.useFakeTimers();
    renderContent({ directionMode: 'particles', particleSize: 4 });

    const sizeSlider = screen.getAllByRole('slider').find(
      (element) =>
        element.getAttribute('aria-valuemin') === '1' &&
        element.getAttribute('aria-valuemax') === '10' &&
        element.getAttribute('aria-valuenow') === '4'
    );

    expect(sizeSlider).toBeTruthy();

    fireEvent.keyDown(sizeSlider!, { key: 'ArrowRight' });
    expect(graphStore.getState().particleSize).toBe(4.5);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_PARTICLE_SETTING',
      payload: { key: 'particleSize', value: 4.5 },
    });
    vi.useRealTimers();
  });

  it('falls back to the default direction color and posts normalized updates', () => {
    vi.useFakeTimers();
    renderContent({ directionColor: 'invalid-color' });

    const input = screen.getByLabelText('Direction Color');
    expect(input).toHaveValue(DEFAULT_DIRECTION_COLOR);

    fireEvent.change(input, { target: { value: '#abcdef' } });
    expect(graphStore.getState().directionColor).toBe('#ABCDEF');

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_DIRECTION_COLOR',
      payload: { directionColor: '#ABCDEF' },
    });
    vi.useRealTimers();
  });

  it('does not render the legacy folder color field', () => {
    renderContent({
      folderNodeColor: 'bad-color',
    });

    expect(screen.queryByLabelText('Folder Node Color')).not.toBeInTheDocument();
  });

  it('cancels pending debounced posts on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = renderContent({
      directionMode: 'particles',
      particleSpeed: 0.0005,
    });

    const speedSlider = screen.getAllByRole('slider').find(
      (element) =>
        element.getAttribute('aria-valuemin') === '1' &&
        element.getAttribute('aria-valuemax') === '10'
    );

    expect(speedSlider).toBeTruthy();

    fireEvent.keyDown(speedSlider!, { key: 'ArrowRight' });
    fireEvent.change(screen.getByLabelText('Direction Color'), {
      target: { value: '#abcdef' },
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(sentMessages).toEqual([]);
    vi.useRealTimers();
  });

  it('posts label visibility updates when toggled', () => {
    renderContent({ showLabels: true });

    fireEvent.click(screen.getByRole('switch'));

    expect(graphStore.getState().showLabels).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_LABELS',
      payload: { showLabels: false },
    });
  });
});
