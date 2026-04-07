export function getMeasuredSize(
  element: HTMLDivElement | null,
  key: 'clientWidth' | 'clientHeight',
): number {
  if (!element) return 0;
  const measured = element[key];
  return Number.isFinite(measured) ? measured : 0;
}
