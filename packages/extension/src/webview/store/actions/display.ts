import type { GraphState } from '../state';
import type { SetState } from './types';

export function createDisplayActions(set: SetState) {
  return {
    setExpandedGroupId: (id: string | null) => set({ expandedGroupId: id }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSearchOptions: (options: GraphState['searchOptions']) => set({ searchOptions: options }),
    setActivePanel: (panel: GraphState['activePanel']) => set({ activePanel: panel }),
    setGraphMode: (mode: GraphState['graphMode']) => set({ graphMode: mode }),
    setGraphViewportScale: (scale: GraphState['graphViewportScale']) => set({ graphViewportScale: scale }),
    setNodeSizeMode: (mode: GraphState['nodeSizeMode']) => set({ nodeSizeMode: mode }),
    setPhysicsSettings: (settings: GraphState['physicsSettings']) => set({ physicsSettings: settings }),
    setLegends: (legends: GraphState['legends']) => set({ legends }),
    setFilterPatterns: (patterns: string[]) => set({ filterPatterns: patterns }),
    setDisabledCustomFilterPatterns: (patterns: string[]) => set({ disabledCustomFilterPatterns: patterns }),
    setDisabledPluginFilterPatterns: (patterns: string[]) => set({ disabledPluginFilterPatterns: patterns }),
    setShowOrphans: (show: boolean) => set({ showOrphans: show }),
    setShowLabels: (show: boolean) => set({ showLabels: show }),
  };
}
