import type { DiagnosticEvent } from '../contracts';
import {
  formatContextDetail,
  joinDetails,
} from './parts';
import { humanizeEventName } from './humanize';

export function formatFallbackEvent(event: DiagnosticEvent): string {
  const details = joinDetails([
    formatContextDetail({ area: event.area }, 'area'),
    ...Object.keys(event.context ?? {}).map(key => formatContextDetail(event.context, key)),
  ]);
  const message = humanizeEventName(event.event);
  if (details) {
    return `${message}: ${details}`;
  }

  return message;
}
