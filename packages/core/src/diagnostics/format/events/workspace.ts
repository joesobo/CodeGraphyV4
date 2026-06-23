import type { DiagnosticContextValue } from '../../contracts';
import {
  formatContextDetail,
  formatScalar,
  joinDetails,
} from '../parts';

export function formatWorkspaceEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'index-started') {
    const details = joinDetails([
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
      formatContextDetail(context, 'operationId', 'operation'),
    ]);
    return `Starting indexing: ${details}`;
  }

  if (event === 'status-read') {
    const state = formatScalar(context?.state);
    const cacheDescription = state ? `${state} Graph Cache` : 'Graph Cache';
    const details = joinDetails([
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
      formatContextDetail(context, 'graphCache', 'cache'),
      formatContextDetail(context, 'enabledPluginCount', 'plugins'),
    ]);
    return details
      ? `Workspace status read: ${cacheDescription}, ${details}`
      : `Workspace status read: ${cacheDescription}`;
  }

  return undefined;
}
