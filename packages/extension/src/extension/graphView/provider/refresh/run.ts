import type { GraphViewProviderRefreshMethodsSource } from '../refresh';
import { recordExtensionPerformanceEvent } from '../../../performance/marks';

export type RefreshStateReason =
  | 'analysisScope'
  | 'changedFiles'
  | 'direct'
  | 'gitignoreMetadata'
  | 'pluginFiles'
  | 'refresh'
  | 'refreshIndex';
export type ChangedFileRefreshMode = 'analysis' | 'incremental' | 'primary';

export function sendRefreshState(
  source: GraphViewProviderRefreshMethodsSource,
  reason: RefreshStateReason = 'direct',
): void {
  recordExtensionPerformanceEvent('graphWebview.refreshState.send', { reason });
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

export async function runChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
  filePaths: readonly string[],
): Promise<ChangedFileRefreshMode> {
  if (!source._analyzer?.hasIndex()) {
    await runPrimaryRefresh(source);
    return 'primary';
  }

  if (source._incrementalAnalyzeAndSendData) {
    await source._incrementalAnalyzeAndSendData(filePaths);
    return 'incremental';
  }

  await source._analyzeAndSendData();
  return 'analysis';
}
