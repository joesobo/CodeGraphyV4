export function cleanCliArgs(args: string[]): string[] {
  return args.filter((arg) => arg !== '--');
}

export function flagValue(args: string[], name: string): string | undefined {
  const inlineFlag = args.find((arg) => arg.startsWith(`${name}=`));
  if (inlineFlag) {
    return inlineFlag.slice(name.length + 1);
  }

  const flagIndex = args.indexOf(name);
  return flagIndex >= 0 ? args[flagIndex + 1] : undefined;
}

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

export function parseBareTargetArg(args: string[]): string | undefined {
  return args.find((arg) => !arg.startsWith('--'));
}
