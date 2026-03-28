export function parseTargetArg(args: string[], valueFlags: string[]): string | undefined {
  const flags = valueFlags;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      return arg;
    }

    const nextArg = args[index + 1];
    if (flags.includes(arg) && nextArg !== undefined && !nextArg.startsWith('--')) {
      index += 1;
    }
  }

  return undefined;
}
