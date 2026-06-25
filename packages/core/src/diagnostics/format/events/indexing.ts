import type { DiagnosticContextValue } from '../../contracts';
import {
  formatContextDetail,
  formatCount,
  joinDetails,
} from '../parts';

export function formatIndexingEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'completed') {
    const counts = joinDetails([
      formatCount(context?.files, 'file'),
      formatCount(context?.nodes, 'node'),
      formatCount(context?.edges, 'edge'),
    ]);
    const details = joinDetails([
      counts,
      formatContextDetail(context, 'durationMs', 'durationMs'),
      formatContextDetail(context, 'operationId', 'operation'),
      formatContextDetail(context, 'graphCache', 'cache'),
    ]);
    return details ? `Indexing complete: ${details}` : 'Indexing complete';
  }

  if (event === 'phase-completed') {
    const details = joinDetails([
      formatContextDetail(context, 'phase'),
      formatContextDetail(context, 'durationMs', 'durationMs'),
      formatContextDetail(context, 'files'),
      formatContextDetail(context, 'directories'),
      formatContextDetail(context, 'totalFound', 'totalFound'),
      formatContextDetail(context, 'limitReached', 'limitReached'),
      formatContextDetail(context, 'cacheHits', 'cacheHits'),
      formatContextDetail(context, 'cacheMisses', 'cacheMisses'),
      formatContextDetail(context, 'nodes'),
      formatContextDetail(context, 'edges'),
      formatContextDetail(context, 'loadedPackagePlugins', 'loadedPackagePlugins'),
      formatContextDetail(context, 'registeredPlugins', 'registeredPlugins'),
    ]);
    return details ? `Indexing phase complete: ${details}` : 'Indexing phase complete';
  }

  return undefined;
}
