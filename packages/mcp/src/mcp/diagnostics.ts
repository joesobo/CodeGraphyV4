import {
  collectDiagnosticEvents,
  type DiagnosticEventSink,
} from '@codegraphy-dev/core';

export interface McpVerboseDiagnosticsInput {
  verboseDiagnostics?: unknown;
}

export function createMcpDiagnostics(input: McpVerboseDiagnosticsInput): {
  diagnostics?: DiagnosticEventSink;
  withDiagnostics<T extends Record<string, unknown>>(result: T): T & { diagnostics?: unknown };
} {
  const enabled = input.verboseDiagnostics === true;
  const collector = collectDiagnosticEvents(enabled);

  return {
    ...(enabled ? { diagnostics: collector } : {}),
    withDiagnostics<T extends Record<string, unknown>>(result: T): T & { diagnostics?: unknown } {
      return enabled ? { ...result, diagnostics: collector.events } : result;
    },
  };
}
