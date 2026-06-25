import type { DiagnosticContextValue } from '../../contracts';
import {
  formatContextDetail,
  formatCount,
  joinDetails,
} from '../parts';

export function formatGraphQueryEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'started') {
    return `Starting Graph Query: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatContextDetail(context, 'operationId', 'operation'),
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
    ])}`;
  }

  if (event === 'cache-missing') {
    return `Graph Cache missing: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatContextDetail(context, 'cacheState'),
      formatContextDetail(context, 'operationId', 'operation'),
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
    ])}`;
  }

  if (event === 'completed') {
    return `Graph Query complete: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatCount(context?.nodeCount, 'node'),
      formatCount(context?.edgeCount, 'edge'),
      formatContextDetail(context, 'durationMs', 'durationMs'),
      formatContextDetail(context, 'operationId', 'operation'),
    ])}`;
  }

  return undefined;
}
