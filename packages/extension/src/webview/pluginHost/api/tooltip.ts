/**
 * @fileoverview Tooltip content aggregation for plugin host.
 * @module webview/pluginHost/tooltip
 */

import type { TooltipAction, TooltipProviderFn, TooltipContent, TooltipContext } from './contracts/types';

/**
 * Aggregate tooltip content from all registered providers.
 */
export function aggregateTooltipContent(
  context: TooltipContext,
  tooltipProviders: Array<{ pluginId: string; fn: TooltipProviderFn }>,
): TooltipContent | null {
  const sections: Array<{ title: string; content: string }> = [];
  const actions: TooltipAction[] = [];
  for (const provider of tooltipProviders) {
    try {
      const content = provider.fn(context);
      if (content?.sections) sections.push(...content.sections);
      if (content?.actions) actions.push(...content.actions);
    } catch (e) {
      console.error(`[CG] Tooltip provider error:`, e);
    }
  }
  return sections.length > 0 || actions.length > 0 ? { sections, actions } : null;
}
