import type { GraphState } from '../state';
import type { SetState } from './types';

type InitialLoadingState = Pick<
  GraphState,
  'bootstrapComplete' | 'graphData'
>;

function canFinishInitialLoading(state: InitialLoadingState): boolean {
  return state.bootstrapComplete
    && state.graphData !== null;
}

export function createBootstrapActions(set: SetState) {
  return {
    beginInitialBootstrap: () =>
      set((state) => {
        if (state.graphData !== null || !state.isLoading) {
          return {};
        }

        return {
          awaitingInitialBootstrap: true,
          bootstrapComplete: false,
          isLoading: true,
        };
      }),
    beginPluginAssetLoad: () =>
      set((state) => ({
        pendingPluginAssetLoads: state.pendingPluginAssetLoads + 1,
      })),
    finishPluginAssetLoad: () =>
      set((state) => {
        const pendingPluginAssetLoads = Math.max(0, state.pendingPluginAssetLoads - 1);
        const nextState = {
          ...state,
          pendingPluginAssetLoads,
        };
        const initialLoadingFinished = canFinishInitialLoading(nextState);

        return {
          pendingPluginAssetLoads,
          awaitingInitialBootstrap: initialLoadingFinished ? false : state.awaitingInitialBootstrap,
          isLoading: initialLoadingFinished ? false : state.isLoading,
        };
      }),
  };
}
