import { nonEmptyStringSchema, stringValueSchema } from '../../../values';

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
