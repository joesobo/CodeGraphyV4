import type {
  GraphViewProviderRefreshMethodsSource,
  RefreshCoordinatorState,
} from '../contracts';
import {
  canRunIndexedChangedFileRefresh,
  prepareRefreshInputs,
} from '../coordinator';
import {
  runChangedFileRefresh,
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
  refreshChangedFiles: (filePaths: readonly string[]) => Promise<void>,
): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.indexRefreshPromise) {
      await state.indexRefreshPromise;
      return;
    }

    state.indexRefreshPromise = runIndexRefreshWithInputs(source);
    try {
      await state.indexRefreshPromise;
    } finally {
      state.indexRefreshPromise = undefined;
    }

    const queuedFilePaths = [...state.queuedChangedFilePaths];
    state.queuedChangedFilePaths = new Set<string>();
    if (queuedFilePaths.length > 0) {
      await refreshChangedFiles(queuedFilePaths);
    }
  };
}

export function createRefreshChangedFilesMethod(
  source: GraphViewProviderRefreshMethodsSource,
  state: RefreshCoordinatorState,
): (filePaths: readonly string[]) => Promise<void> {
  return async (filePaths: readonly string[]): Promise<void> => {
    if (state.indexRefreshPromise) {
      state.queuedChangedFilePaths = new Set([
        ...state.queuedChangedFilePaths,
        ...filePaths,
      ]);
      return;
    }

    if (!canRunIndexedChangedFileRefresh(source)) {
      prepareRefreshInputs(source);
    }
    const refreshMode = await runChangedFileRefresh(source, filePaths);
    if (refreshMode !== 'incremental') {
      sendRefreshState(source);
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
