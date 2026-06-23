import type {
  DiagnosticContextValue,
  DiagnosticEventFormatter,
} from '../../contracts';
import {
  formatContextDetail,
  joinDetails,
} from '../parts';

const ANALYSIS_EVENT_FORMATTERS = new Map<string, DiagnosticEventFormatter>([
  ['request-started', context => `Starting analysis: ${joinDetails([
    formatContextDetail(context, 'requestId', 'request'),
    formatContextDetail(context, 'mode'),
    formatContextDetail(context, 'filterPatternCount', 'filters'),
    formatContextDetail(context, 'disabledPluginCount', 'disabledPlugins'),
  ])}`],
  ['request-completed', context => `Analysis complete: ${joinDetails([
    formatContextDetail(context, 'requestId', 'request'),
    formatContextDetail(context, 'mode'),
    formatContextDetail(context, 'durationMs', 'durationMs'),
  ])}`],
  ['request-failed', context => `Analysis failed: ${joinDetails([
    formatContextDetail(context, 'requestId', 'request'),
    formatContextDetail(context, 'mode'),
    formatContextDetail(context, 'durationMs', 'durationMs'),
    formatContextDetail(context, 'error'),
  ])}`],
  ['load-decision', context => `Analysis load decision: ${joinDetails([
    formatContextDetail(context, 'route'),
    formatContextDetail(context, 'mode'),
    formatContextDetail(context, 'shouldDiscover'),
    formatContextDetail(context, 'canReplayCache'),
    formatContextDetail(context, 'indexFreshness', 'freshness'),
  ])}`],
]);

export function formatAnalysisEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  return ANALYSIS_EVENT_FORMATTERS.get(event)?.(context);
}
