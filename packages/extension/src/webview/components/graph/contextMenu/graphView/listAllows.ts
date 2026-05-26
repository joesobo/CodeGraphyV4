export function listAllows<T extends string>(
  allowed: readonly T[] | undefined,
  value: string | undefined,
): boolean {
  return !allowed?.length || (!!value && (allowed as readonly string[]).includes(value));
}
