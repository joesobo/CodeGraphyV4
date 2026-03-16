/**
 * @fileoverview Store action implementations.
 * @module webview/storeActions
 */

import type { StoreApi } from 'zustand/vanilla';
import type { ExtensionToWebviewMessage } from '../shared/types';
import type { GraphState } from './store';
import { postMessage } from './vscodeApi';
import { MESSAGE_HANDLERS } from './storeMessages';
import { createDisplayActions } from './storeActionsDisplay';

type SetState = StoreApi<GraphState>['setState'];
type GetState = StoreApi<GraphState>['getState'];

export function createActions(set: SetState, get: GetState) {
  return {
    ...createDisplayActions(set),
    setDirectionMode: (mode: GraphState['directionMode']) => set({ directionMode: mode }),
    setDirectionColor: (color: string) => set({ directionColor: color }),
    setParticleSpeed: (speed: number) => set({ particleSpeed: speed }),
    setParticleSize: (size: number) => set({ particleSize: size }),
    setBidirectionalMode: (mode: GraphState['bidirectionalMode']) => set({ bidirectionalMode: mode }),
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
