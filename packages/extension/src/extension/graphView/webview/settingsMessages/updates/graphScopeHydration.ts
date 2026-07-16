import { requiresSymbolAnalysisCacheTier } from '../../../../pipeline/service/cache/tiers';
import type { GraphViewSettingsMessageHandlers } from '../router';

export function shouldHydrateGraphScope(
  previousVisibility: Record<string, boolean>,
  nextVisibility: Record<string, boolean>,
): boolean {
  return !requiresSymbolAnalysisCacheTier(previousVisibility)
    && requiresSymbolAnalysisCacheTier(nextVisibility);
}

export async function hydrateOrReprocessGraphScope(
  handlers: GraphViewSettingsMessageHandlers,
): Promise<void> {
  if (!await handlers.hydrateGraphScope()) {
    await handlers.reprocessGraphScope();
  }
}
