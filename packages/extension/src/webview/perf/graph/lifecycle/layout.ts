export function graphLayoutChanged(
  layoutKey: string | undefined,
  previousLayoutKey: string | undefined,
): boolean {
  return layoutKey !== undefined && layoutKey !== previousLayoutKey;
}
