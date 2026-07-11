import type { GraphState } from '../state';
import type { SetState } from './types';

export function createDisplayActions(set: SetState) {
  return {
    setExpandedGroupId: (id: string | null) => set({ expandedGroupId: id }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSearchOptions: (options: GraphState['searchOptions']) => set({ searchOptions: options }),
    setActivePanel: (panel: GraphState['activePanel']) => set({ activePanel: panel }),
    setCompareSelectedPath: (path: string | null) => set({ compareSelectedPath: path }),
    setGraphMode: (mode: GraphState['graphMode']) => set({ graphMode: mode }),
    setGraphViewportScale: (scale: GraphState['graphViewportScale']) => set({ graphViewportScale: scale }),
    setNodeSizeMode: (mode: GraphState['nodeSizeMode']) => set({ nodeSizeMode: mode }),
    setPhysicsSettings: (settings: GraphState['physicsSettings']) => set({ physicsSettings: settings }),
    setLegends: (legends: GraphState['legends']) => set({ legends }),
    setFilterPatterns: (patterns: string[]) => set({ filterPatterns: patterns }),
    toggleFavoritesOptimistically: (paths: readonly string[]) => set((state) => {
      const favorites = new Set(state.favorites);
      for (const path of paths) {
        if (favorites.has(path)) {
          favorites.delete(path);
        } else {
          favorites.add(path);
        }
      }
      return { favorites, pendingFavoriteSnapshot: new Set(favorites) };
    }),
    setDisabledCustomFilterPatterns: (patterns: string[]) => set({ disabledCustomFilterPatterns: patterns }),
    setDisabledPluginFilterPatterns: (patterns: string[]) => set({ disabledPluginFilterPatterns: patterns }),
    setRespectFilesExclude: (enabled: boolean) => set({ respectFilesExclude: enabled }),
    setShowOrphans: (show: boolean) => set({ showOrphans: show }),
    setShowLabels: (show: boolean) => set({ showLabels: show }),
    setCssSnippets: (snippets: Record<string, boolean>) => set({ cssSnippets: snippets }),
  };
}
