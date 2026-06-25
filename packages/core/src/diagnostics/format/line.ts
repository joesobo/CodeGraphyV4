import type { DiagnosticEvent } from '../contracts';
import { formatFallbackEvent } from './fallback';
import { formatKnownEvent } from './known';

export function formatDiagnosticEventLine(event: DiagnosticEvent): string {
  return `[CodeGraphy] ${formatKnownEvent(event) ?? formatFallbackEvent(event)}`;
}
