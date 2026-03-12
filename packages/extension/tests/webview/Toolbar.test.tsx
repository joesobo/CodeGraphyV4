import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from '../../src/webview/components/Toolbar';
import { graphStore } from '../../src/webview/store';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

const mockViews = [
  { id: 'codegraphy.connections', name: 'Connections', icon: 'symbol-file', description: 'Shows all files', active: true },
  { id: 'codegraphy.depth-graph', name: 'Depth Graph', icon: 'target', description: 'Focus on current file', active: false },
  { id: 'codegraphy.folder', name: 'Folder', icon: 'folder', description: 'Shows folder hierarchy', active: false },
];

function setDefaultState(overrides: Record<string, unknown> = {}) {
  graphStore.setState({
    availableViews: mockViews,
    activeViewId: 'codegraphy.connections',
    dagMode: null,
    graphMode: '2d',
    depthLimit: 1,
    activePanel: 'none',
    ...overrides,
  });
}

/**
 * Helper to get button groups from the toolbar DOM.
 * Layout: [depth-slider] [view-buttons-group] [dag-buttons-group] [2d/3d] [separator] [refresh] [export] [plugins] [settings]
 */
function getButtonGroups(container: HTMLElement) {
  // The bordered groups contain view and DAG buttons
  const groups = container.querySelectorAll('.rounded-md.border');
  const viewGroup = groups[0]; // First bordered group = view buttons
  const dagGroup = groups[1]; // Second bordered group = DAG buttons
  return {
    viewButtons: viewGroup ? Array.from(viewGroup.querySelectorAll('button')) : [],
    dagButtons: dagGroup ? Array.from(dagGroup.querySelectorAll('button')) : [],
  };
}

describe('Toolbar', () => {
  beforeEach(() => {
    clearSentMessages();
    setDefaultState();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('view buttons', () => {
    it('renders a button for each available view', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      expect(viewButtons).toHaveLength(mockViews.length);
    });

    it('sends CHANGE_VIEW with correct viewId when view button is clicked', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      // Click the second view button (Depth Graph)
      fireEvent.click(viewButtons[1]);
      const msg = findMessage('CHANGE_VIEW');
      expect(msg).toBeTruthy();
      expect(msg!.payload.viewId).toBe('codegraphy.depth-graph');
    });

    it('active view button has default variant', () => {
      const { container } = render(<Toolbar />);
      const { viewButtons } = getButtonGroups(container);
      // First button (Connections) is active — should NOT have ghost class
      expect(viewButtons[0].className).not.toContain('hover:bg-accent');
      // Second button should have ghost variant
      expect(viewButtons[1].className).toContain('hover:bg-accent');
    });
  });

  describe('DAG mode buttons', () => {
    it('renders all four DAG mode buttons', () => {
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      expect(dagButtons).toHaveLength(4);
    });

    it('sends UPDATE_DAG_MODE when a DAG button is clicked', () => {
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      // Click "Radial Out" (index 1 in DAG_MODES: [null, radialout, td, lr])
      fireEvent.click(dagButtons[1]);
      const msg = findMessage('UPDATE_DAG_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.dagMode).toBe('radialout');
    });

    it('sends null dagMode when Default button is clicked', () => {
      setDefaultState({ dagMode: 'td' });
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      fireEvent.click(dagButtons[0]);
      const msg = findMessage('UPDATE_DAG_MODE');
      expect(msg).toBeTruthy();
      expect(msg!.payload.dagMode).toBeNull();
    });

    it('active DAG mode button has default variant', () => {
      setDefaultState({ dagMode: 'td' });
      const { container } = render(<Toolbar />);
      const { dagButtons } = getButtonGroups(container);
      // "Top Down" is index 2 — should be active (not ghost)
      expect(dagButtons[2].className).not.toContain('hover:bg-accent');
      // Others should be ghost
      expect(dagButtons[0].className).toContain('hover:bg-accent');
      expect(dagButtons[1].className).toContain('hover:bg-accent');
      expect(dagButtons[3].className).toContain('hover:bg-accent');
    });
  });

  describe('2D/3D toggle', () => {
    it('toggles graphMode from 2d to 3d', () => {
      const { container } = render(<Toolbar />);
      // The 2D/3D toggle is a standalone outline button after the DAG group
      const outlineButtons = container.querySelectorAll('button');
      // Find it by process of elimination: not in view/dag group, not title="Reset Graph"
      const { viewButtons, dagButtons } = getButtonGroups(container);
      const groupButtonSet = new Set([...viewButtons, ...dagButtons]);
      const standaloneButtons = Array.from(outlineButtons).filter(
        btn => !groupButtonSet.has(btn) && !btn.getAttribute('title')
      );
      // First standalone button without title is the 2D/3D toggle
      fireEvent.click(standaloneButtons[0]);
      expect(graphStore.getState().graphMode).toBe('3d');
    });

    it('toggles graphMode from 3d back to 2d', () => {
      setDefaultState({ graphMode: '3d' });
      const { container } = render(<Toolbar />);
      const outlineButtons = container.querySelectorAll('button');
      const { viewButtons, dagButtons } = getButtonGroups(container);
      const groupButtonSet = new Set([...viewButtons, ...dagButtons]);
      const standaloneButtons = Array.from(outlineButtons).filter(
        btn => !groupButtonSet.has(btn) && !btn.getAttribute('title')
      );
      fireEvent.click(standaloneButtons[0]);
      expect(graphStore.getState().graphMode).toBe('2d');
    });
  });

  describe('depth slider', () => {
    it('is hidden when depth view is not active', () => {
      const { container } = render(<Toolbar />);
      const sliderContainer = container.querySelector('[style*="max-width"]');
      expect(sliderContainer).toBeTruthy();
      expect(sliderContainer?.getAttribute('style')).toContain('max-width: 0px');
      expect(sliderContainer?.getAttribute('style')).toContain('opacity: 0');
    });

    it('is visible when depth view is active', () => {
      setDefaultState({ activeViewId: 'codegraphy.depth-graph' });
      const { container } = render(<Toolbar />);
      const sliderContainer = container.querySelector('[style*="max-width"]');
      expect(sliderContainer?.getAttribute('style')).toContain('max-width: 8rem');
      expect(sliderContainer?.getAttribute('style')).toContain('opacity: 1');
    });

    it('displays current depth limit value', () => {
      setDefaultState({ activeViewId: 'codegraphy.depth-graph', depthLimit: 3 });
      render(<Toolbar />);
      expect(screen.getByText('3')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('refresh button sends REFRESH_GRAPH', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Reset Graph'));
      expect(findMessage('REFRESH_GRAPH')).toBeTruthy();
    });

    it('settings button opens settings panel', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Settings'));
      expect(graphStore.getState().activePanel).toBe('settings');
    });

    it('plugins button opens plugins panel', () => {
      render(<Toolbar />);
      fireEvent.click(screen.getByTitle('Plugins'));
      expect(graphStore.getState().activePanel).toBe('plugins');
    });
  });
});
