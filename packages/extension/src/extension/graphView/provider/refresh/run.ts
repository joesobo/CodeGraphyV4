import type { GraphViewProviderRefreshMethodsSource } from '../refresh';
import type { IGraphData } from '../../../../shared/graph/contracts';

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
  _reason: RefreshStateReason = 'direct',
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

function hasGraphData(graphData: IGraphData | undefined): boolean {
  return (graphData?.nodes.length ?? 0) > 0 || (graphData?.edges.length ?? 0) > 0;
}

export function canRunIncrementalChangedFileRefresh(
  source: GraphViewProviderRefreshMethodsSource,
): boolean {
  if (!source._analyzer || !source._incrementalAnalyzeAndSendData) {
    return false;
  }

  return source._analyzer.hasIndex()
    || hasGraphData(source._rawGraphData)
    || hasGraphData(source._graphData);
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
