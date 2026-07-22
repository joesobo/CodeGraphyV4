import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    showMinimap: true,
    graphHasIndex: false,
    graphIsIndexing: false,
    graphIndexProgress: null,
    depthMode: false,
    depthLimit: 1,
    maxDepthLimit: 10,
    legends: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    pluginStatuses: [],
    graphNodeTypes: [],
    graphEdgeTypes: [],
    nodeColors: {},
    nodeVisibility: {},
    edgeVisibility: {},
    activePanel: 'none',
    maxFiles: 500,
    ...overrides,
  });
}

function renderContent(storeOverrides: Record<string, unknown> = {}) {
  setStoreState(storeOverrides);
  return render(<DisplaySection />);
}

function getSliderByRange(min: string, max: string, occurrence = 0): HTMLElement {
  const slider = screen.getAllByRole('slider').filter(
    (element) =>
      element.getAttribute('aria-valuemin') === min &&
      element.getAttribute('aria-valuemax') === max,
  )[occurrence];

  expect(slider).toBeTruthy();
  return slider;
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
    expect(screen.queryByText('Renderer')).not.toBeInTheDocument();
  });

  it('updates and persists the minimap display setting', () => {
    renderContent({ showMinimap: true });

    fireEvent.click(screen.getByLabelText('Show Minimap'));

    expect(graphStore.getState().showMinimap).toBe(false);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_SHOW_MINIMAP',
      payload: { showMinimap: false },
    });
  });

  it('posts depth mode and depth limit updates from Display settings', () => {
      renderContent({ graphHasIndex: true, depthMode: false, depthLimit: 2, maxDepthLimit: 5 });

      expect(screen.queryByRole('slider', { name: 'Depth limit' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Depth Mode'));
      expect(graphStore.getState().depthMode).toBe(true);
      expect(sentMessages).toContainEqual({
        type: 'UPDATE_DEPTH_MODE',
        payload: { depthMode: true },
      });

      const depthSlider = getSliderByRange('1', '5');
      fireEvent.keyDown(depthSlider, { key: 'ArrowRight' });

      expect(sentMessages).toContainEqual({
        type: 'CHANGE_DEPTH_LIMIT',
        payload: { depthLimit: 3 },
      });
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



    it('does not render the direction color setting', () => {
      renderContent();

      expect(screen.queryByLabelText('Direction Color')).not.toBeInTheDocument();
    });
});
