import { nonEmptyStringSchema, stringValueSchema } from '../../../values';

export function parseOptionalJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  const parsed = JSON.parse(value) as T | null;
  return parsed ?? undefined;
}

export function readOptionalString(value: unknown): string | undefined {
  const parsed = nonEmptyStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function readRequiredString(value: unknown): string | undefined {
  const parsed = stringValueSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' || typeof value === 'bigint'
    ? Number(value)
    : undefined;
}
