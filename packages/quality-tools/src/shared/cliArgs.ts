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

export function parseTargetArg(args: string[]): string | undefined {
  return args.find((arg) => !arg.startsWith('--'));
}
