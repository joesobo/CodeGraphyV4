import type { GraphViewProviderRefreshMethodsSource } from './contracts';

export type ChangedFileRefreshMode = 'analysis' | 'incremental' | 'primary';

export function sendRefreshState(
  source: GraphViewProviderRefreshMethodsSource,
): void {
  source._sendAllSettings();
  source._sendGraphControls?.();
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

export function canRunIncrementalChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
): boolean {
  if (!source._analyzer || !source._incrementalAnalyzeAndSendData) {
    return false;
  }

  return source._analyzer.hasIndex();
}

export async function runChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
  filePaths: readonly string[],
): Promise<ChangedFileRefreshMode> {
  if (canRunIncrementalChangedFileRefresh(source)) {
    await source._incrementalAnalyzeAndSendData!(filePaths);
    return 'incremental';
  }

  if (!source._analyzer?.hasIndex()) {
    await runPrimaryRefresh(source);
    return 'primary';
  }

  await source._analyzeAndSendData();
  return 'analysis';
}
