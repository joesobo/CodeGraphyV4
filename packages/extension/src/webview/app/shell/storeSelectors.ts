/**
 * @fileoverview Store selector hooks for the App component.
 * @module webview/appStoreSelectors
 */

import { useGraphStore } from '../../store/state';

export function useAppState() {
  const graphData = useGraphStore(s => s.graphData);
  const ghostGraphVisible = useGraphStore(s => s.ghostGraphVisible);
  const isLoading = useGraphStore(s => s.isLoading);
  const graphHasIndex = useGraphStore(s => s.graphHasIndex);
  const graphIsIndexing = useGraphStore(s => s.graphIsIndexing);
  const graphIndexProgress = useGraphStore(s => s.graphIndexProgress);
  const searchQuery = useGraphStore(s => s.searchQuery);
  const searchOptions = useGraphStore(s => s.searchOptions);
  const legends = useGraphStore(s => s.legends);
  const filterPatterns = useGraphStore(s => s.filterPatterns);
  const pluginFilterPatterns = useGraphStore(s => s.pluginFilterPatterns);
  const pluginFilterGroups = useGraphStore(s => s.pluginFilterGroups);
  const disabledCustomFilterPatterns = useGraphStore(s => s.disabledCustomFilterPatterns);
  const disabledPluginFilterPatterns = useGraphStore(s => s.disabledPluginFilterPatterns);
  const respectFilesExclude = useGraphStore(s => s.respectFilesExclude);
  const filesExcludedCount = useGraphStore(s => s.filesExcludedCount);
  const showOrphans = useGraphStore(s => s.showOrphans);
  const timelineActive = useGraphStore(s => s.timelineActive);
  const activePanel = useGraphStore(s => s.activePanel);
  const depthMode = useGraphStore(s => s.depthMode);
  const nodeColors = useGraphStore(s => s.nodeColors);
  const nodeVisibility = useGraphStore(s => s.nodeVisibility);
  const edgeVisibility = useGraphStore(s => s.edgeVisibility);
  const graphScopeProjectionRevision = useGraphStore(s => s.graphScopeProjectionRevision);
  const graphNodeTypes = useGraphStore(s => s.graphNodeTypes);
  const graphEdgeTypes = useGraphStore(s => s.graphEdgeTypes);
  const nodeDecorations = useGraphStore(s => s.nodeDecorations);
  const nativeNodeDecorations = useGraphStore(s => s.nativeNodeDecorations);
  const edgeDecorations = useGraphStore(s => s.edgeDecorations);
  const activeFilePath = useGraphStore(s => s.activeFilePath);
  const pendingFileMutations = useGraphStore(s => s.pendingFileMutations);
  return {
    graphData,
    ghostGraphVisible,
    isLoading,
    graphHasIndex,
    graphIsIndexing,
    graphIndexProgress,
    searchQuery,
    searchOptions,
    legends,
    filterPatterns,
    pluginFilterPatterns,
    pluginFilterGroups,
    disabledCustomFilterPatterns,
    disabledPluginFilterPatterns,
    respectFilesExclude,
    filesExcludedCount,
    showOrphans,
    timelineActive,
    activePanel,
    depthMode,
    nodeColors,
    nodeVisibility,
    edgeVisibility,
    graphScopeProjectionRevision,
    graphNodeTypes,
    graphEdgeTypes,
    nodeDecorations,
    nativeNodeDecorations,
    edgeDecorations,
    activeFilePath,
    pendingFileMutations,
  };
}

export function useAppActions() {
  const setSearchQuery = useGraphStore(s => s.setSearchQuery);
  const setSearchOptions = useGraphStore(s => s.setSearchOptions);
  const setActivePanel = useGraphStore(s => s.setActivePanel);
  const setFilterPatterns = useGraphStore(s => s.setFilterPatterns);
  const setDisabledCustomFilterPatterns = useGraphStore(s => s.setDisabledCustomFilterPatterns);
  const setDisabledPluginFilterPatterns = useGraphStore(s => s.setDisabledPluginFilterPatterns);
  const setRespectFilesExclude = useGraphStore(s => s.setRespectFilesExclude);

  return {
    setSearchQuery,
    setSearchOptions,
    setActivePanel,
    setFilterPatterns,
    setDisabledCustomFilterPatterns,
    setDisabledPluginFilterPatterns,
    setRespectFilesExclude,
  };
}
