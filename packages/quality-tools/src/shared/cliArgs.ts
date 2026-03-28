export function cleanCliArgs(args: string[]): string[] {
  return args.filter((arg) => arg !== '--');
}

export function parseBareTargetArg(args: string[]): string | undefined {
  return args.find((arg) => !arg.startsWith('--'));
}

// Re-exports for backward compatibility
export { flagValue } from './flagValue';
export { parseTargetArg } from './parseTarget';
