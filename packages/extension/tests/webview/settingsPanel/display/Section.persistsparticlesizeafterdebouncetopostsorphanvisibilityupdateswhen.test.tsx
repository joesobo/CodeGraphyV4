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



    it('does not render the legacy folder color field', () => {
      renderContent();

      expect(screen.queryByLabelText('Folder Node Color')).not.toBeInTheDocument();
    });



    it('cancels pending debounced posts on unmount', () => {
      vi.useFakeTimers();
      const { unmount } = renderContent({
        directionMode: 'particles',
        particleSpeed: 0.0005,
      });

      const speedSlider = getSliderByRange('1', '10');

      fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });

      unmount();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(sentMessages).toEqual([]);
      vi.useRealTimers();
    });



    it('posts label visibility updates when toggled', () => {
      renderContent({ showLabels: true });

      fireEvent.click(screen.getByLabelText('Show Labels'));

      expect(graphStore.getState().showLabels).toBe(false);
      expect(sentMessages).toContainEqual({
        type: 'UPDATE_SHOW_LABELS',
        payload: { showLabels: false },
      });
    });



    it('posts orphan visibility updates when toggled', () => {
      renderContent({ showOrphans: true });

      fireEvent.click(screen.getByLabelText('Show Orphans'));

      expect(graphStore.getState().showOrphans).toBe(false);
      expect(sentMessages).toContainEqual({
        type: 'UPDATE_SHOW_ORPHANS',
        payload: { showOrphans: false },
      });
    });
});
