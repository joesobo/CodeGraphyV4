import type { DiagnosticEvent, DiagnosticEventInput } from './contracts';
import { normalizeContext } from './normalize/context';

export function createDiagnosticEvent(input: DiagnosticEventInput): DiagnosticEvent {
  return {
    area: input.area,
    event: input.event,
    ...(input.context ? { context: normalizeContext(input.context) } : {}),
  };
}
