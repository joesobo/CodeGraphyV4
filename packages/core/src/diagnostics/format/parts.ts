import type { DiagnosticContextValue } from '../contracts';

export function formatCount(value: DiagnosticContextValue | undefined, noun: string): string | undefined {
  if (typeof value !== 'number') {
    return undefined;
  }
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

export function formatScalar(value: DiagnosticContextValue | undefined): string | undefined {
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

export function formatContextDetail(
  context: Record<string, DiagnosticContextValue> | undefined,
  key: string,
  label: string = key,
): string | undefined {
  const value = formatScalar(context?.[key]);
  return value ? `${label}=${value}` : undefined;
}

export function joinDetails(details: Array<string | undefined>): string {
  return details.filter((detail): detail is string => Boolean(detail)).join(', ');
}
