/** Mutation-target regression coverage for App.tsx. */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppMutationComponent, getAppMutationGraphStore, resetAppMutationHarness } from './fixture';

const App = getAppMutationComponent();

const graphStore = getAppMutationGraphStore();

describe('App mutation coverage: graph counts',()=>{
  beforeEach(() => resetAppMutationHarness());
  afterEach(() => vi.restoreAllMocks());

  it('passes totalCount from graphData when graphData has nodes', () => {
      graphStore.setState({
        graphData: {
          nodes: [
            { id: 'a.ts', label: 'a', color: '#111' },
            { id: 'b.ts', label: 'b', color: '#222' },
          ],
          edges: [],
        },
      });
      render(<App />);
      expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-total-count', '2');
    });

  it('passes resultCount from filteredData.nodes when search is active', () => {
      graphStore.setState({
        graphData: {
          nodes: [
            { id: 'src/App.ts', label: 'App', color: '#111' },
            { id: 'src/Todo.ts', label: 'Todo', color: '#222' },
          ],
          edges: [],
        },
        searchQuery: 'App',
      });
      render(<App />);
      expect(screen.getByTestId('mock-search-bar')).toHaveAttribute('data-result-count', '1');
    });

  it('passes resultCount equal to node count when search is blank', () => {
      graphStore.setState({
        graphData: {
          nodes: [
            { id: 'src/App.ts', label: 'App', color: '#111' },
          ],
          edges: [],
        },
        searchQuery: '',
      });
      render(<App />);
      // When search is blank, filteredData === graphData, so resultCount === node count
      const searchBar = screen.getByTestId('mock-search-bar');
      const resultCount = searchBar.getAttribute('data-result-count');
      expect(resultCount).toBe('1');
    });

  it('does not render the search bar when graphData is null', () => {
      graphStore.setState({
        graphData: null,
      });
      render(<App />);
      expect(screen.queryByTestId('mock-search-bar')).not.toBeInTheDocument();
    });
});
