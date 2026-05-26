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

      const speedSlider = getSliderByRange('1', '10');

      fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });
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

      const speedSlider = getSliderByRange('1', '10');

      fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });
      fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });

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
});
