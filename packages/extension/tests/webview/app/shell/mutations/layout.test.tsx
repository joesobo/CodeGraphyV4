/** Mutation-target regression coverage for App.tsx. */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getAppMutationComponent,
  getAppMutationGraphStore,
  getAppMutationMessageListeners,
  resetAppMutationHarness,
} from './fixture';

const App = getAppMutationComponent();
const graphStore = getAppMutationGraphStore();
const messageListeners = getAppMutationMessageListeners();

describe('App mutation coverage: layout',()=>{
  beforeEach(() => resetAppMutationHarness());
  afterEach(() => vi.restoreAllMocks());

  it('renders toolbar when activePanel is none', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'none',
      });
      render(<App />);
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('plugins-panel')).not.toBeInTheDocument();
    });

  it('renders plugins panel alongside the toolbar when activePanel is plugins', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'plugins',
      });
      render(<App />);
      expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

  it('renders settings panel alongside the toolbar when activePanel is settings', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'settings',
      });
      render(<App />);
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar')).toBeInTheDocument();
    });

  it('shows loading state when isLoading is true regardless of graphData', () => {
      graphStore.setState({
        isLoading: true,
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      });
      render(<App />);
      expect(screen.getByText('Loading graph...')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-graph')).not.toBeInTheDocument();
    });

  it('shows empty state when graphData is null', () => {
      graphStore.setState({
        graphData: null,
      });
      render(<App />);
      expect(screen.getByText(/No files found/)).toBeInTheDocument();
    });

  it('shows empty state when graphData has zero nodes', () => {
      graphStore.setState({
        graphData: { nodes: [], edges: [] },
      });
      render(<App />);
      expect(screen.getByText(/No files found/)).toBeInTheDocument();
    });

  it('always renders the search bar when graph data is available', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      });
      render(<App />);
      expect(screen.getByTestId('mock-search-bar')).toBeInTheDocument();
    });

  it('sets up message listener on mount and cleans up on unmount', () => {
      const { unmount } = render(<App />);
      const listenersBeforeUnmount = [...messageListeners];
      expect(listenersBeforeUnmount.length).toBeGreaterThan(0);
      unmount();
      // After unmount, the listener should be removed
      expect(messageListeners.length).toBeLessThan(listenersBeforeUnmount.length);
    });

  it('renders the outer layout with correct CSS classes', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
      });
      const { container } = render(<App />);
      const outerDiv = container.firstElementChild as HTMLElement;
      expect(outerDiv.className).toContain('relative');
      expect(outerDiv.className).toContain('w-full');
      expect(outerDiv.className).toContain('h-screen');
      expect(outerDiv.className).toContain('flex');
      expect(outerDiv.className).toContain('flex-col');
    });

  it('shows hidden-files hint when graph data is empty and orphans are disabled', () => {
      graphStore.setState({
        graphData: { nodes: [], edges: [] },
        graphHasIndex: true,
        showOrphans: false,
      });
      render(<App />);
      expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
    });
});
