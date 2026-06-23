import { collectDiagnosticEvents as collectDiagnosticEventsImpl } from './collector';
import type {
  DiagnosticEvent,
  DiagnosticEventInput,
  DiagnosticEventSink,
} from './contracts';
import { createDiagnosticEvent as createDiagnosticEventImpl } from './create';
import { formatDiagnosticEventLine as formatDiagnosticEventLineImpl } from './format/line';

export type {
  DiagnosticContextValue,
  DiagnosticEvent,
  DiagnosticEventInput,
  DiagnosticEventSink,
} from './contracts';

export function createDiagnosticEvent(input: DiagnosticEventInput): DiagnosticEvent {
  return createDiagnosticEventImpl(input);
}

export function collectDiagnosticEvents(enabled: boolean): DiagnosticEventSink & { readonly events: DiagnosticEvent[] } {
  return collectDiagnosticEventsImpl(enabled);
}

export function formatDiagnosticEventLine(event: DiagnosticEvent): string {
  return formatDiagnosticEventLineImpl(event);
}
