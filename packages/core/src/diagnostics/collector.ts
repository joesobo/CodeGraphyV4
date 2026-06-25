import type { DiagnosticEvent, DiagnosticEventSink } from './contracts';

export function collectDiagnosticEvents(enabled: boolean): DiagnosticEventSink & { readonly events: DiagnosticEvent[] } {
  const events: DiagnosticEvent[] = [];
  return {
    get events(): DiagnosticEvent[] {
      return events;
    },
    emit(event: DiagnosticEvent): void {
      if (enabled) {
        events.push(event);
      }
    },
  };
}
