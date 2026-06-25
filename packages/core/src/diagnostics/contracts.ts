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

export type DiagnosticEventFormatter = (
  context: Record<string, DiagnosticContextValue> | undefined,
) => string | undefined;
