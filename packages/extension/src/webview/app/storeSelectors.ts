/**
 * @fileoverview Store selector hooks for the App component.
 * @module webview/appStoreSelectors
 */

import { useGraphStore } from '../store/state';

export function useAppState() {
  const graphData = useGraphStore(s => s.graphData);
  const isLoading = useGraphStore(s => s.isLoading);
  const searchQuery = useGraphStore(s => s.searchQuery);
  const searchOptions = useGraphStore(s => s.searchOptions);
  const groups = useGraphStore(s => s.groups);
  const showOrphans = useGraphStore(s => s.showOrphans);
  const timelineActive = useGraphStore(s => s.timelineActive);
  const activePanel = useGraphStore(s => s.activePanel);
  const nodeDecorations = useGraphStore(s => s.nodeDecorations);
  const edgeDecorations = useGraphStore(s => s.edgeDecorations);

  return { graphData, isLoading, searchQuery, searchOptions, groups, showOrphans, timelineActive, activePanel, nodeDecorations, edgeDecorations };
}

export function useAppActions() {
  const setSearchQuery = useGraphStore(s => s.setSearchQuery);
  const setSearchOptions = useGraphStore(s => s.setSearchOptions);
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  return { setSearchQuery, setSearchOptions, setActivePanel };
}
