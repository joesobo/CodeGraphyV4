export function flagValue(args: string[], name: string): string | undefined {
  const inlineFlag = args.find((arg) => arg.startsWith(`${name}=`));
  if (inlineFlag) {
    return inlineFlag.slice(name.length + 1);
  }

  const flagIndex = args.indexOf(name);
  return flagIndex >= 0 ? args[flagIndex + 1] : undefined;
}
