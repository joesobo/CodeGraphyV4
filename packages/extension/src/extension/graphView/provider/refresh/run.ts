import type { GraphViewProviderRefreshMethodsSource } from '../refresh';

export function sendRefreshState(source: GraphViewProviderRefreshMethodsSource): void {
  source._sendAllSettings();
  source._sendGraphControls?.();
  source._sendFavorites();
}

export async function runPrimaryRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  if (source._loadAndSendData) {
    await source._loadAndSendData();
    return;
  }

  await source._analyzeAndSendData();
}

export async function runIndexRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  if (source._refreshAndSendData) {
    await source._refreshAndSendData();
    return;
  }

  await source._analyzeAndSendData();
}

export async function runChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
  filePaths: readonly string[],
): Promise<void> {
  if (!source._analyzer?.hasIndex()) {
    await runPrimaryRefresh(source);
    return;
  }

  if (source._incrementalAnalyzeAndSendData) {
    await source._incrementalAnalyzeAndSendData(filePaths);
    return;
  }

  await source._analyzeAndSendData();
}
