/**
 * @fileoverview Store selector hooks for the App component.
 * @module webview/appStoreSelectors
 */

import { useGraphStore } from '../../store/state';

export function useAppState() {
  const graphData = useGraphStore(s => s.graphData);
  const isLoading = useGraphStore(s => s.isLoading);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);
  const graphIndexProgress = useGraphStore(s => s.graphIndexProgress);
  const searchQuery = useGraphStore(s => s.searchQuery);
  const searchOptions = useGraphStore(s => s.searchOptions);
  const legends = useGraphStore(s => s.legends);
  const filterPatterns = useGraphStore(s => s.filterPatterns);
  const pluginFilterPatterns = useGraphStore(s => s.pluginFilterPatterns);
  const disabledCustomFilterPatterns = useGraphStore(s => s.disabledCustomFilterPatterns);
  const disabledPluginFilterPatterns = useGraphStore(s => s.disabledPluginFilterPatterns);
  const showOrphans = useGraphStore(s => s.showOrphans);
  const timelineActive = useGraphStore(s => s.timelineActive);
  const activePanel = useGraphStore(s => s.activePanel);
  const depthMode = useGraphStore(s => s.depthMode);
  const nodeColors = useGraphStore(s => s.nodeColors);
  const nodeVisibility = useGraphStore(s => s.nodeVisibility);
  const edgeVisibility = useGraphStore(s => s.edgeVisibility);
  const graphEdgeTypes = useGraphStore(s => s.graphEdgeTypes);
  const nodeDecorations = useGraphStore(s => s.nodeDecorations);
  const edgeDecorations = useGraphStore(s => s.edgeDecorations);
  const activeFilePath = useGraphStore(s => s.activeFilePath);
  return {
    graphData,
    isLoading,
    graphIsIndexing,
    graphIndexProgress,
    searchQuery,
    searchOptions,
    legends,
    filterPatterns,
    pluginFilterPatterns,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    showOrphans,
    timelineActive,
    activePanel,
    depthMode,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphEdgeTypes,
    nodeDecorations,
    edgeDecorations,
    activeFilePath,
  };
}

export function useAppActions() {
  const setSearchQuery = useGraphStore(s => s.setSearchQuery);
  const setSearchOptions = useGraphStore(s => s.setSearchOptions);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const setFilterPatterns = useGraphStore(s => s.setFilterPatterns);
  const setDisabledCustomFilterPatterns = useGraphStore(s => s.setDisabledCustomFilterPatterns);
  const setDisabledPluginFilterPatterns = useGraphStore(s => s.setDisabledPluginFilterPatterns);

  return {
    setSearchQuery,
    setSearchOptions,
    setActivePanel,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
  };
}
