/**
 * @fileoverview Tooltip content aggregation for plugin host.
 * @module webview/pluginHost/pluginHostTooltip
 */

import type { TooltipProviderFn, TooltipContent, TooltipContext } from './types';

/**
 * Aggregate tooltip content from all registered providers.
 */
export function aggregateTooltipContent(
  context: TooltipContext,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
): TooltipContent | null {
  const sections: Array<{ title: string; content: string }> = [];
  for (const provider of tooltipProviders) {
    try {
      const content = provider.fn(context);
      if (content?.sections) sections.push(...content.sections);
    } catch (e) {
      console.error(`[CG] Tooltip provider error:`, e);
    }
  }
  return sections.length > 0 ? { sections } : null;
}
