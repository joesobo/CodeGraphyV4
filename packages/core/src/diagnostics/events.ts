export type DiagnosticContextValue =
  | null
  | string
  | number
  | boolean
  | DiagnosticContextValue[]
  | { [key: string]: DiagnosticContextValue };

export interface DiagnosticEvent {
  area: string;
  event: string;
  context?: Record<string, DiagnosticContextValue>;
}

export interface DiagnosticEventInput {
  area: string;
  event: string;
  context?: Record<string, unknown>;
}

export interface DiagnosticEventSink {
  emit(event: DiagnosticEvent): void;
}

function normalizeError(error: Error): Record<string, DiagnosticContextValue> {
  return {
    name: error.name,
    message: error.message,
  };
}

function normalizeContextValue(value: unknown): DiagnosticContextValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeContextValue);
  }

  if (value instanceof Set) {
    return [...value].map(normalizeContextValue);
  }

  if (value instanceof Map) {
    return [...value.entries()].map(([key, entryValue]) => ({
      key: normalizeContextValue(key),
      value: normalizeContextValue(entryValue),
    }));
  }

  if (typeof value === 'object') {
    const normalized: Record<string, DiagnosticContextValue> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      normalized[key] = normalizeContextValue(entryValue);
    }
    return normalized;
  }

  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'symbol') {
    return value.description ? `Symbol(${value.description})` : 'Symbol()';
  }

  if (typeof value === 'function') {
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  }

  return 'unknown';
}

function normalizeContext(context: Record<string, unknown> | undefined): Record<string, DiagnosticContextValue> | undefined {
  if (!context) {
    return undefined;
  }

  const normalized: Record<string, DiagnosticContextValue> = {};
  for (const [key, value] of Object.entries(context)) {
    normalized[key] = normalizeContextValue(value);
  }
  return normalized;
}

export function createDiagnosticEvent(input: DiagnosticEventInput): DiagnosticEvent {
  return {
    area: input.area,
    event: input.event,
    ...(input.context ? { context: normalizeContext(input.context) } : {}),
  };
}

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

export function formatDiagnosticEventLine(event: DiagnosticEvent): string {
  const context = event.context ? ` ${JSON.stringify(event.context)}` : '';
  return `[CodeGraphy][Diagnostics] ${event.area} ${event.event}${context}`;
}
