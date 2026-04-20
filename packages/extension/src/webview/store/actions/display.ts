/**
 * @fileoverview Display-related store action setters.
 * @module webview/storeActionsDisplay
 */

import type { StoreApi } from 'zustand/vanilla';
import type { GraphState } from '../state';

type SetState = StoreApi<GraphState>['setState'];

export function createDisplayActions(set: SetState) {
  return {
    setExpandedGroupId: (id: string | null) => set({ expandedGroupId: id }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSearchOptions: (options: GraphState['searchOptions']) => set({ searchOptions: options }),
    setActivePanel: (panel: GraphState['activePanel']) => set({ activePanel: panel }),
    setGraphMode: (mode: GraphState['graphMode']) => set({ graphMode: mode }),
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
