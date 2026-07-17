export interface CliError {
  action?: string;
  code: string;
  message: string;
}

interface ParsedOutput {
  action?: unknown;
  error?: unknown;
  message?: unknown;
  [key: string]: unknown;
}

export function parseCliOutput(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

export function readCliError(output: unknown): CliError {
  if (typeof output !== 'object' || output === null) {
    return { code: 'command_failed', message: String(output) };
  }
  const parsed = output as ParsedOutput;
  const code = typeof parsed.error === 'string' ? parsed.error : 'command_failed';
  const message = typeof parsed.message === 'string' ? parsed.message : 'Command failed.';
  return {
    code,
    message,
    ...(typeof parsed.action === 'string' ? { action: parsed.action } : {}),
  };
}
