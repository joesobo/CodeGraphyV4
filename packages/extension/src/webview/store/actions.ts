/**
 * @fileoverview Store action implementations.
 * @module webview/storeActions
 */

import type { StoreApi } from 'zustand/vanilla';
import type { GraphState } from './state';
import { postMessage } from '../vscodeApi';
import { MESSAGE_HANDLERS } from './messages';
import { createDisplayActions } from './displayActions';
import type { ExtensionToWebviewMessage } from '../../shared/protocol/extensionToWebview';
import {
  clearPendingGroupUpdate,
  createPendingUserGroupsUpdate,
  mergePendingGroupUpdate,
} from './optimistic/groups';

type SetState = StoreApi<GraphState>['setState'];
type GetState = StoreApi<GraphState>['getState'];

export function createActions(set: SetState, get: GetState) {
  const replaceUserGroups = (
    currentGroups: GraphState['legends'],
    userGroups: GraphState['legends'],
  ): GraphState['legends'] => [
    ...userGroups,
    ...currentGroups.filter((group) => group.isPluginDefault),
  ];

  return {
    ...createDisplayActions(set),
    setDirectionMode: (mode: GraphState['directionMode']) => set({ directionMode: mode }),
    setDirectionColor: (color: string) => set({ directionColor: color }),
    setParticleSpeed: (speed: number) => set({ particleSpeed: speed }),
    setParticleSize: (size: number) => set({ particleSize: size }),
    setPhysicsPaused: (paused: boolean) => set({ physicsPaused: paused }),
    setBidirectionalMode: (mode: GraphState['bidirectionalMode']) => set({ bidirectionalMode: mode }),
    setDepthMode: (depthMode: boolean) => set({ depthMode }),
    setDagMode: (mode: GraphState['dagMode']) => set({ dagMode: mode }),
    setMaxFiles: (max: number) => set({ maxFiles: max }),
    setPlaybackSpeed: (speed: number) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
    setOptimisticLegendUpdate: (groupId: string, updates: Partial<GraphState['legends'][number]>) =>
      set((state) => ({
        optimisticLegendUpdates: mergePendingGroupUpdate(
          state.optimisticLegendUpdates,
          groupId,
          updates,
        ),
      })),
    clearOptimisticLegendUpdate: (groupId: string) =>
      set((state) => ({
        optimisticLegendUpdates: clearPendingGroupUpdate(
          state.optimisticLegendUpdates,
          groupId,
        ),
      })),
    setOptimisticUserLegends: (legends: GraphState['legends']) =>
      set((state) => ({
        legends: replaceUserGroups(state.legends, legends),
        optimisticUserLegends: createPendingUserGroupsUpdate(legends),
      })),
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
