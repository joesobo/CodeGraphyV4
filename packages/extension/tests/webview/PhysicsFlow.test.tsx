import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../src/webview/app/App';
import { graphStore } from '../../src/webview/store/state';

const messageListeners: Array<(event: MessageEvent) => void> = [];

vi.stubGlobal('addEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    messageListeners.push(listener);
  }
});

vi.stubGlobal('removeEventListener', (type: string, listener: (event: MessageEvent) => void) => {
  if (type === 'message') {
    const index = messageListeners.indexOf(listener);
    if (index > -1) messageListeners.splice(index, 1);
  }
});

function resetStore() {
  graphStore.setState({
    graphData: null,
    isLoading: true,
    searchQuery: '',
    searchOptions: { matchCase: false, wholeWord: false, regex: false },
    favorites: new Set<string>(),
    bidirectionalMode: 'separate',
    showOrphans: true,
    directionMode: 'arrows',
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    graphMode: '2d',
    nodeSizeMode: 'connections',
    physicsSettings: { repelForce: 10, linkDistance: 80, linkForce: 0.15, damping: 0.7, centerForce: 0.1 },
    depthLimit: 1,
    groups: [],
    filterPatterns: [],
    pluginFilterPatterns: [],
    availableViews: [],
    activeViewId: 'codegraphy.connections',
    pluginStatuses: [],
    activePanel: 'none',
    maxFiles: 500,
  });
}

function sendMessage(data: unknown) {
  const event = new MessageEvent('message', { data });
  messageListeners.forEach((listener) => listener(event));
}

describe('Physics flow', () => {
  beforeEach(() => {
    messageListeners.length = 0;
    resetStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((globalThis as any).__vscodeSentMessages as unknown[]).length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates store physics when PHYSICS_SETTINGS_UPDATED is received', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'PHYSICS_SETTINGS_UPDATED',
        payload: { repelForce: 7, linkDistance: 120, linkForce: 0.3, damping: 0.55, centerForce: 0.2 },
      });
    });

    expect(graphStore.getState().physicsSettings).toEqual({
      repelForce: 7,
      linkDistance: 120,
      linkForce: 0.3,
      damping: 0.55,
      centerForce: 0.2,
    });
  });

  it('debounces UPDATE_PHYSICS_SETTING when slider changes in Settings panel', async () => {
    render(<App />);

    await act(async () => {
      sendMessage({
        type: 'GRAPH_DATA_UPDATED',
        payload: {
          nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#A1A1AA' }],
          edges: [],
        },
      });
    });

    fireEvent.click(screen.getByTitle('Settings'));
    fireEvent.click(screen.getByText('Forces'));

    const sliders = screen.getAllByRole('slider');
    const repelSlider = sliders.find(
      (el) => el.getAttribute('aria-valuemin') === '0' && el.getAttribute('aria-valuemax') === '20'
    );
    expect(repelSlider).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string; payload?: unknown }>;
    sentMessages.length = 0;

    fireEvent.keyDown(repelSlider!, { key: 'ArrowRight' });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    const physicsMessage = sentMessages.find(msg => msg.type === 'UPDATE_PHYSICS_SETTING');
    expect(physicsMessage).toEqual({
      type: 'UPDATE_PHYSICS_SETTING',
      payload: { key: 'repelForce', value: 11 },
    });
  });
});
