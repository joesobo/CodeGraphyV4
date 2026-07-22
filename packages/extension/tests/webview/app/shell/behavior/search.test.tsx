import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorGraphStore, getAppBehaviorHarness, resetAppBehaviorHarness } from './fixture';

const App = getAppBehaviorComponent();

const graphStore = getAppBehaviorGraphStore();

const harness = getAppBehaviorHarness();

describe('App search behavior', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('filters nodes and edges for whole-word searches', () => {
        graphStore.setState({
          graphData: {
            nodes: [
              { id: 'src/App.ts', label: 'App', color: '#123456' },
              { id: 'src/AppService.ts', label: 'AppService', color: '#654321' },
            ],
            edges: [{ id: 'src/App.ts->src/AppService.ts', from: 'src/App.ts', to: 'src/AppService.ts' , kind: 'import', sources: [] }],
          },
          searchQuery: 'App',
          searchOptions: { matchCase: false, wholeWord: true, regex: false },
        });
  
        render(<App />);
  
        expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts');
        expect(screen.getByTestId('graph-edge-ids')).toHaveTextContent('');
        expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '1');
        expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-total-count', '2');
      });

  it('passes through blank search queries without filtering', () => {
        graphStore.setState({
          graphData: {
            nodes: [
              { id: 'src/App.ts', label: 'App', color: '#123456' },
              { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
            ],
            edges: [{ id: 'src/App.ts->src/Todo.ts', from: 'src/App.ts', to: 'src/Todo.ts' , kind: 'import', sources: [] }],
          },
          searchQuery: '   ',
        });
  
        render(<App />);
  
        expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts,src/Todo.ts');
        expect(screen.getByTestId('graph-edge-ids')).toHaveTextContent('src/App.ts->src/Todo.ts');
      });

  it('surfaces regex errors and renders an empty filtered graph when the regex is invalid', () => {
        graphStore.setState({
          graphData: {
            nodes: [{ id: 'src/App.ts', label: 'App', color: '#123456' }],
            edges: [],
          },
          searchQuery: '[',
          searchOptions: { matchCase: false, wholeWord: false, regex: true },
        });
  
        render(<App />);
  
        expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('');
        expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '0');
        expect(screen.getByTestId('mock-search-bar').getAttribute('data-regex-error')).toMatch(/unterminated|invalid|character/i);
      });

  it('supports valid regex searches', () => {
        graphStore.setState({
          graphData: {
            nodes: [
              { id: 'src/App.ts', label: 'App', color: '#123456' },
              { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
            ],
            edges: [],
          },
          searchQuery: '^App src/App\\.ts$',
          searchOptions: { matchCase: true, wholeWord: false, regex: true },
        });
  
        render(<App />);
  
        expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/App.ts');
      });

  it('updates search query and search options through SearchBar callbacks', async () => {
        graphStore.setState({
          graphData: {
            nodes: [
              { id: 'src/App.ts', label: 'App', color: '#123456' },
              { id: 'src/Todo.ts', label: 'Todo', color: '#654321' },
            ],
            edges: [],
          },
        });
  
        render(<App />);
  
        await act(async () => {
          (harness.searchBarProps?.onChange as ((value: string) => void))('Todo');
          (harness.searchBarProps?.onOptionsChange as ((value: { matchCase: boolean; wholeWord: boolean; regex: boolean }) => void))({
            matchCase: true,
            wholeWord: false,
            regex: false,
          });
        });
  
        expect(graphStore.getState().searchQuery).toBe('Todo');
        expect(graphStore.getState().searchOptions).toEqual({
          matchCase: true,
          wholeWord: false,
          regex: false,
        });
        expect(screen.getByTestId('graph-node-ids')).toHaveTextContent('src/Todo.ts');
      });
});
