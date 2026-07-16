/** Mutation-target regression coverage for App.tsx. */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppMutationComponent, getAppMutationGraphStore, resetAppMutationHarness } from './fixture';

const App = getAppMutationComponent();

const graphStore = getAppMutationGraphStore();

describe('App mutation coverage: panels',()=>{
  beforeEach(() => resetAppMutationHarness());
  afterEach(() => vi.restoreAllMocks());

  it('plugins panel isOpen is false when activePanel is settings', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'settings',
      });
      render(<App />);
      // Plugins panel should be present but closed
      expect(screen.getByTestId('plugins-panel-closed')).toBeInTheDocument();
      expect(screen.queryByTestId('plugins-panel')).not.toBeInTheDocument();
      // Settings panel should be open
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });

  it('settings panel isOpen is false when activePanel is plugins', () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'plugins',
      });
      render(<App />);
      // Settings panel should be present but closed
      expect(screen.getByTestId('settings-panel-closed')).toBeInTheDocument();
      expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
      // Plugins panel should be open
      expect(screen.getByTestId('plugins-panel')).toBeInTheDocument();
    });

  it('closes plugins panel by setting activePanel to none', async () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'plugins',
      });
      render(<App />);
  
      await act(async () => {
        fireEvent.click(screen.getByTestId('plugins-panel'));
      });
      expect(graphStore.getState().activePanel).toBe('none');
    });

  it('closes settings panel by setting activePanel to none', async () => {
      graphStore.setState({
        graphData: { nodes: [{ id: 'a.ts', label: 'a', color: '#111' }], edges: [] },
        activePanel: 'settings',
      });
      render(<App />);
  
      await act(async () => {
        fireEvent.click(screen.getByTestId('settings-panel'));
      });
      expect(graphStore.getState().activePanel).toBe('none');
    });
});
