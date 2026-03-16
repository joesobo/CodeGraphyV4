import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFilteredGraph } from '../../src/webview/hooks/useFilteredGraph';
import type { IGraphData } from '../../src/shared/types';

const defaultOptions = { matchCase: false, wholeWord: false, regex: false };

const sampleData: IGraphData = {
  nodes: [
    { id: 'src/App.tsx', label: 'App.tsx', color: '#3B82F6' },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#3B82F6' },
    { id: 'src/index.ts', label: 'index.ts', color: '#3B82F6' },
  ],
  edges: [
    { from: 'src/App.tsx', to: 'src/utils.ts' },
    { from: 'src/App.tsx', to: 'src/index.ts' },
  ],
};

describe('useFilteredGraph', () => {
  describe('when graphData is null', () => {
    it('returns null for filteredData and coloredData', () => {
      const { result } = renderHook(() =>
        useFilteredGraph(null, '', defaultOptions, [])
      );
      expect(result.current.filteredData).toBeNull();
      expect(result.current.coloredData).toBeNull();
      expect(result.current.regexError).toBeNull();
    });
  });

  describe('when search query is empty', () => {
    it('returns the full graphData unchanged as filteredData', () => {
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '', defaultOptions, [])
      );
      expect(result.current.filteredData).toBe(sampleData);
    });

    it('returns no regex error', () => {
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '', defaultOptions, [])
      );
      expect(result.current.regexError).toBeNull();
    });
  });

  describe('when search query matches some nodes', () => {
    it('filteredData contains only matching nodes', () => {
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, 'App', defaultOptions, [])
      );
      expect(result.current.filteredData?.nodes).toHaveLength(1);
      expect(result.current.filteredData?.nodes[0].id).toBe('src/App.tsx');
    });

    it('filteredData contains only edges connecting matching nodes', () => {
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, 'App', defaultOptions, [])
      );
      expect(result.current.filteredData?.edges).toHaveLength(0);
    });
  });

  describe('when groups are provided', () => {
    it('coloredData applies group color to matching nodes', () => {
      const groups = [{ id: 'g1', pattern: 'src/*.tsx', color: '#FF0000', disabled: false }];
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '', defaultOptions, groups)
      );
      const appNode = result.current.coloredData?.nodes.find(n => n.id === 'src/App.tsx');
      expect(appNode?.color).toBe('#FF0000');
    });

    it('coloredData does not alter nodes that do not match any group', () => {
      const groups = [{ id: 'g1', pattern: 'src/*.tsx', color: '#FF0000', disabled: false }];
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '', defaultOptions, groups)
      );
      const utilsNode = result.current.coloredData?.nodes.find(n => n.id === 'src/utils.ts');
      expect(utilsNode?.color).not.toBe('#FF0000');
    });

    it('coloredData skips disabled groups', () => {
      const groups = [{ id: 'g1', pattern: 'src/*.tsx', color: '#FF0000', disabled: true }];
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '', defaultOptions, groups)
      );
      const appNode = result.current.coloredData?.nodes.find(n => n.id === 'src/App.tsx');
      expect(appNode?.color).not.toBe('#FF0000');
    });
  });

  describe('when regex search has an invalid pattern', () => {
    it('returns a regexError string', () => {
      const regexOptions = { matchCase: false, wholeWord: false, regex: true };
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '[invalid', regexOptions, [])
      );
      expect(result.current.regexError).not.toBeNull();
    });

    it('returns empty filteredData nodes on invalid regex', () => {
      const regexOptions = { matchCase: false, wholeWord: false, regex: true };
      const { result } = renderHook(() =>
        useFilteredGraph(sampleData, '[invalid', regexOptions, [])
      );
      expect(result.current.filteredData?.nodes).toHaveLength(0);
    });
  });
});
