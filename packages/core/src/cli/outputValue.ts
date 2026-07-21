export interface CliError {
  action?: string;
  code: string;
  message: string;
}

interface ParsedOutput {
  action?: unknown;
  code?: unknown;
  error?: unknown;
  message?: unknown;
  [key: string]: unknown;
}

function isParsedOutput(value: unknown): value is ParsedOutput {
  return typeof value === 'object' && value !== null;
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
  const nested = isParsedOutput(parsed.error) ? parsed.error : undefined;
  const code = typeof parsed.error === 'string'
    ? parsed.error
    : typeof nested?.code === 'string' ? nested.code : 'command_failed';
  const message = typeof nested?.message === 'string'
    ? nested.message
    : typeof parsed.message === 'string' ? parsed.message : 'Command failed.';
  const action = typeof nested?.action === 'string' ? nested.action : parsed.action;
  return {
    code,
    message,
    ...(typeof action === 'string' ? { action } : {}),
  };
}
