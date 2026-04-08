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
  const activeViewId = useGraphStore(s => s.activeViewId);
  const nodeColors = useGraphStore(s => s.nodeColors);
  const nodeVisibility = useGraphStore(s => s.nodeVisibility);
  const edgeVisibility = useGraphStore(s => s.edgeVisibility);
  const edgeColors = useGraphStore(s => s.edgeColors);
  const folderNodeColor = useGraphStore(s => s.folderNodeColor);
  const nodeDecorations = useGraphStore(s => s.nodeDecorations);
  const edgeDecorations = useGraphStore(s => s.edgeDecorations);
  const activeFilePath = useGraphStore(s => s.activeFilePath);
  const isIndexing = useGraphStore(s => s.isIndexing);
  const indexProgress = useGraphStore(s => s.indexProgress);

  return {
    graphData,
    isLoading,
    searchQuery,
    searchOptions,
    groups,
    showOrphans,
    timelineActive,
    activePanel,
    activeViewId,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    edgeColors,
    folderNodeColor,
    nodeDecorations,
    edgeDecorations,
    activeFilePath,
    isIndexing,
    indexProgress,
  };
}

export function useAppActions() {
  const setSearchQuery = useGraphStore(s => s.setSearchQuery);
  const setSearchOptions = useGraphStore(s => s.setSearchOptions);
  const setActivePanel = useGraphStore(s => s.setActivePanel);

  return { setSearchQuery, setSearchOptions, setActivePanel };
}
