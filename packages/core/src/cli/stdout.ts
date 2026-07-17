export function handleCliStdoutError(
  error: Error,
  exit: (code: number) => never | void = code => process.exit(code),
): void {
  if ((error as NodeJS.ErrnoException).code === 'EPIPE') {
    exit(0);
    return;
  }

  throw error;
}

export function installCliStdoutErrorHandler(): void {
  process.stdout.on('error', handleCliStdoutError);
}
