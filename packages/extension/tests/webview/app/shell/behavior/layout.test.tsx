import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorGraphStore, resetAppBehaviorHarness } from './fixture';

const App = getAppBehaviorComponent();

const graphStore = getAppBehaviorGraphStore();

describe('App shell layout behavior', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('shows the hidden-files hint when the graph is empty and orphans are disabled', () => {
        graphStore.setState({
          graphData: { nodes: [], edges: [] },
          graphHasIndex: true,
          showOrphans: false,
        });
  
        render(<App />);
  
        expect(screen.getByText(/All files are hidden/)).toBeInTheDocument();
      });

  it('closes plugin and settings panels back to none', async () => {
        graphStore.setState({
          graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
          activePanel: 'plugins',
        });
        const { rerender } = render(<App />);
  
        await act(async () => {
          screen.getByTestId('plugins-panel').click();
        });
        expect(graphStore.getState().activePanel).toBe('none');
  
        await act(async () => {
          graphStore.setState({ activePanel: 'settings' });
        });
        rerender(<App />);
  
        await act(async () => {
          screen.getByTestId('settings-panel').click();
        });
        expect(graphStore.getState().activePanel).toBe('none');
      });

  it('shows the toolbar when activePanel is none', () => {
        graphStore.setState({
          graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
          activePanel: 'none',
        });
  
        render(<App />);
  
        expect(screen.getByTestId('toolbar')).toBeInTheDocument();
      });

  it('renders the active file breadcrumb under the search bar', () => {
        graphStore.setState({
          graphData: { nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }], edges: [] },
          activeFilePath: 'src/game/player.gd',
        });
  
        render(<App />);
  
        expect(screen.getByRole('button', { name: 'Open src/game/player.gd' })).toBeInTheDocument();
      });
});
