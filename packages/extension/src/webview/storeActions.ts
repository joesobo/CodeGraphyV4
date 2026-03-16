/**
 * @fileoverview Store action implementations.
 * @module webview/storeActions
 */

import type { StoreApi } from 'zustand/vanilla';
import type { ExtensionToWebviewMessage } from '../shared/types';
import type { GraphState } from './store';
import { postMessage } from './vscodeApi';
import { MESSAGE_HANDLERS } from './storeMessages';

type SetState = StoreApi<GraphState>['setState'];
type GetState = StoreApi<GraphState>['getState'];

export function createActions(set: SetState, get: GetState) {
  return {
    setExpandedGroupId: (id: string | null) => set({ expandedGroupId: id }),
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSearchOptions: (options: GraphState['searchOptions']) => set({ searchOptions: options }),
    setActivePanel: (panel: GraphState['activePanel']) => set({ activePanel: panel }),
    setGraphMode: (mode: GraphState['graphMode']) => set({ graphMode: mode }),
    setNodeSizeMode: (mode: GraphState['nodeSizeMode']) => set({ nodeSizeMode: mode }),
    setPhysicsSettings: (settings: GraphState['physicsSettings']) => set({ physicsSettings: settings }),
    setGroups: (groups: GraphState['groups']) => set({ groups }),
    setFilterPatterns: (patterns: string[]) => set({ filterPatterns: patterns }),
    setShowOrphans: (show: boolean) => set({ showOrphans: show }),
    setDirectionMode: (mode: GraphState['directionMode']) => set({ directionMode: mode }),
    setDirectionColor: (color: string) => set({ directionColor: color }),
    setParticleSpeed: (speed: number) => set({ particleSpeed: speed }),
    setParticleSize: (size: number) => set({ particleSize: size }),
    setBidirectionalMode: (mode: GraphState['bidirectionalMode']) => set({ bidirectionalMode: mode }),
    setShowLabels: (show: boolean) => set({ showLabels: show }),
    setActiveViewId: (id: string) => set({ activeViewId: id }),
    setDagMode: (mode: GraphState['dagMode']) => set({ dagMode: mode }),
    setFolderNodeColor: (color: string) => set({ folderNodeColor: color }),
    setMaxFiles: (max: number) => set({ maxFiles: max }),
    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    handleExtensionMessage: (message: ExtensionToWebviewMessage) => {
      const handler = MESSAGE_HANDLERS[message.type];
      if (!handler) return;
      const ctx = {
        getState: get,
        postMessage: postMessage as (msg: { type: string; payload: unknown }) => void,
      };
      const update = handler(message, ctx);
      if (update) set(update);
    },
  };
}
