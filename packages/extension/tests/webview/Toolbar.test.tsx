import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toolbar from '../../src/webview/components/Toolbar';
import { graphStore } from '../../src/webview/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getSentMessages = (): any[] => (globalThis as any).__vscodeSentMessages;
const clearSentMessages = (): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__vscodeSentMessages.length = 0;
};

const mockViews = [
  { id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: 'Shows all files', active: true },
  { id: 'codegraphy.depth-graph', name: 'Depth Graph', icon: 'target', description: 'Focus on current file', active: false },
  { id: 'codegraphy.folder', name: 'Folder', icon: 'folder', description: 'Shows folder hierarchy', active: false },
];

describe('Toolbar', () => {
  beforeEach(() => {
    clearSentMessages();
    graphStore.setState({
      availableViews: mockViews,
      activeViewId: 'codegraphy.connections',
      dagMode: null,
      graphMode: '2d',
      depthLimit: 1,
      activePanel: 'none',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders view buttons from availableViews', () => {
    render(<Toolbar />);
    // Each view should have a tooltip trigger button
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(3);
  });

  it('clicking view button sends CHANGE_VIEW message', () => {
    render(<Toolbar />);
    // Click all buttons, find the one for depth-graph by checking sent messages
    const buttons = screen.getAllByRole('button');
    // The view buttons are the first 3 in the view segmented control
    // Click the second view button (Depth Graph)
    fireEvent.click(buttons[1]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = getSentMessages().find((m: any) => m.type === 'CHANGE_VIEW');
    expect(msg).toBeTruthy();
  });

  it('clicking DAG mode button sends UPDATE_DAG_MODE message', () => {
    render(<Toolbar />);
    // DAG buttons come after view buttons. Click on Radial Out (2nd DAG button)
    // Find by looking for all buttons and finding the DAG section ones
    const buttons = screen.getAllByRole('button');
    // Views (3) + DAG modes (4) + 2D/3D (1) + separator + Refresh (1) + Plugins (1) + Settings (1) = ~10
    // DAG buttons start after view buttons. Let's click button index 4 (second DAG mode = radialout)
    fireEvent.click(buttons[4]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = getSentMessages().find((m: any) => m.type === 'UPDATE_DAG_MODE');
    expect(msg).toBeTruthy();
    expect(msg.payload.dagMode).toBe('radialout');
  });

  it('renders refresh button that sends REFRESH_GRAPH', () => {
    render(<Toolbar />);
    // Find the refresh button by title
    const refreshBtn = screen.getByTitle('Reset Graph');
    fireEvent.click(refreshBtn);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = getSentMessages().find((m: any) => m.type === 'REFRESH_GRAPH');
    expect(msg).toBeTruthy();
  });

  it('settings button calls setActivePanel', () => {
    render(<Toolbar />);
    const settingsBtn = screen.getByTitle('Settings');
    fireEvent.click(settingsBtn);
    expect(graphStore.getState().activePanel).toBe('settings');
  });

  it('plugins button calls setActivePanel', () => {
    render(<Toolbar />);
    const pluginsBtn = screen.getByTitle('Plugins');
    fireEvent.click(pluginsBtn);
    expect(graphStore.getState().activePanel).toBe('plugins');
  });

  it('depth slider visible only when depth view active', () => {
    const { container, rerender } = render(<Toolbar />);
    // With connections view, slider should be hidden (maxWidth: 0px)
    const sliderContainer = container.querySelector('[style*="max-width"]');
    expect(sliderContainer).toBeTruthy();
    expect(sliderContainer?.getAttribute('style')).toContain('max-width: 0px');

    // Switch to depth view
    act(() => {
      graphStore.setState({ activeViewId: 'codegraphy.depth-graph' });
    });
    rerender(<Toolbar />);
    const sliderContainer2 = container.querySelector('[style*="max-width"]');
    expect(sliderContainer2?.getAttribute('style')).toContain('max-width: 8rem');
  });
});
