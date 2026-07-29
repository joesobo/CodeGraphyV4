import type { GraphViewProviderRefreshMethodsSource } from './contracts';
import { resolveGraphIndexStatus } from '../../analysis/execution/publish/status';

export function sendRefreshState(
  source: GraphViewProviderRefreshMethodsSource,
): void {
  const hasIndex = source._analyzer?.hasIndex() ?? false;
  const status = resolveGraphIndexStatus(undefined, hasIndex);
  source._sendMessage({
    type: 'GRAPH_INDEX_STATUS_UPDATED',
    payload: {
      hasIndex,
      freshness: status.freshness,
      detail: status.detail,
    },
  });
  source._sendAllSettings();
  source._sendGraphControls?.();
}

export async function runPrimaryRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  await source._loadAndSendData();
}

export async function runIndexRefresh(source: GraphViewProviderRefreshMethodsSource): Promise<void> {
  await source._refreshAndSendData();
}
