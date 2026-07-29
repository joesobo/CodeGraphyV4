import type {
  GraphViewProviderRefreshMethodsSource,
  RefreshCoordinatorState,
} from '../contracts';
import { prepareRefreshInputs } from '../coordinator';
import {
  runIndexRefresh,
  runPrimaryRefresh,
  sendRefreshState,
} from '../run';

export function createRefreshMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
      return;
    }

    prepareRefreshInputs(source);
    await runPrimaryRefresh(source);
    sendRefreshState(source);
  };
}

export function createRefreshIndexMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
  beforeRefreshIndex?: () => void,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
      return;
    }

    beforeRefreshIndex?.();
    state.hydratedAnalysisCacheTiers.clear();
    state.indexRefreshPromise = runIndexRefreshWithInputs(source);
    try {
      await state.indexRefreshPromise;
    } finally {
      state.indexRefreshPromise = undefined;
    }
  };
}

async function runIndexRefreshWithInputs(
  source: GraphViewProviderRefreshMethodsSource,
): Promise<void> {
  prepareRefreshInputs(source);
  await runIndexRefresh(source);
  sendRefreshState(source);
}
