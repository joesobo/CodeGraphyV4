import {
  createDiagnosticEvent,
  formatDiagnosticEventLine,
  type DiagnosticEventInput,
} from '@codegraphy-dev/core';

export interface ExtensionDiagnosticLogger {
  emit(this: void, input: DiagnosticEventInput): void;
}

export interface ExtensionDiagnosticLoggerOptions {
  isEnabled(this: void): boolean;
  write?(this: void, line: string): void;
}

export function createExtensionDiagnosticLogger(
  options: ExtensionDiagnosticLoggerOptions,
): ExtensionDiagnosticLogger {
  const write = options.write ?? (line => console.log(line));

  return {
    emit(input): void {
      if (!options.isEnabled()) {
        return;
      }

      write(formatDiagnosticEventLine(createDiagnosticEvent(input)));
    },
  };
}
