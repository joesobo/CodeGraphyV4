import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorGraphStore, getAppBehaviorHarness, resetAppBehaviorHarness } from './fixture';

const App = getAppBehaviorComponent();

const graphStore = getAppBehaviorGraphStore();

const harness = getAppBehaviorHarness();

describe('App graph request behavior', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('opens the filter popover with a glob from graph requests', async () => {
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          filterPatterns: ['existing/**'],
        });
  
        render(<App />);
        harness.sentMessages.length = 0;
  
        await act(async () => {
          (harness.graphProps?.onAddFilterRequested as ((patterns: string[]) => void))(['src/App.ts']);
        });
  
        expect(harness.searchBarProps?.filterPopover).toMatchObject({
          open: true,
          pendingPatterns: ['**/src/App.ts'],
        });
        expect(harness.sentMessages).toEqual([]);
      });

  it('keeps duplicate filter requests in the popover without sending an update', async () => {
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          filterPatterns: ['**/src/App.ts'],
        });
  
        render(<App />);
        harness.sentMessages.length = 0;
  
        await act(async () => {
          (harness.graphProps?.onAddFilterRequested as ((patterns: string[]) => void))(['src/App.ts']);
        });
  
        expect(graphStore.getState().filterPatterns).toEqual(['**/src/App.ts']);
        expect(harness.searchBarProps?.filterPopover).toMatchObject({
          open: true,
          pendingPatterns: ['**/src/App.ts'],
        });
        expect(harness.sentMessages).toEqual([]);
      });

  it('adds legend rules from graph requests and sends the optimistic legend list', async () => {
        vi.spyOn(Date, 'now').mockReturnValue(123456);
        vi.spyOn(Math, 'random').mockReturnValue(0.123456);
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          legends: [{ id: 'plugin-default', pattern: 'generated/**', color: '#aaaaaa', isPluginDefault: true }],
        });
  
        render(<App />);
        harness.sentMessages.length = 0;
  
        await act(async () => {
          (
            harness.graphProps?.onAddLegendRequested as (rule: {
              pattern: string;
              color: string;
              target: 'node' | 'edge';
            }) => void
          )({ pattern: ' src/** ', color: '#ff0000', target: 'node' });
        });
  
        fireEvent.change(screen.getByLabelText('Legend rule color'), {
          target: { value: '#00ff00' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  
        expect(graphStore.getState().legends).toEqual([
          {
            id: 'legend:123456:4fzyo8',
            pattern: 'src/**',
            color: '#00ff00',
            target: 'node',
          },
          {
            id: 'plugin-default',
            pattern: 'generated/**',
            color: '#aaaaaa',
            isPluginDefault: true,
          },
        ]);
        expect(harness.sentMessages).toContainEqual({
          type: 'UPDATE_LEGENDS',
          payload: {
            legends: [
              {
                id: 'legend:123456:4fzyo8',
                pattern: 'src/**',
                color: '#00ff00',
                target: 'node',
              },
            ],
          },
        });
        expect(screen.queryByLabelText('Add Legend Group pattern')).not.toBeInTheDocument();
      });

  it('applies the first enabled matching group and preserves unmatched node styling', () => {
        graphStore.setState({
          graphData: {
            nodes: [
              { id: 'src/App.ts', label: 'App', color: '#123456' },
              { id: 'notes/Todo.txt', label: 'Todo', color: '#abcdef' },
            ],
            edges: [],
          },
          legends: [
            { id: 'disabled-group', pattern: 'src/**', color: '#ff0000', disabled: true },
            { id: 'enabled-group', pattern: 'src/**', color: '#00ff00', shape2D: 'diamond', imageUrl: 'https://example.com/icon.png' },
          ],
        });
  
        render(<App />);
  
        expect(screen.getByTestId('graph-node-colors')).toHaveTextContent('#00ff00,#abcdef');
        expect(screen.getByTestId('graph-node-shapes')).toHaveTextContent('diamond,none');
        expect(screen.getByTestId('graph-node-images')).toHaveTextContent('https://example.com/icon.png,');
      });
});
