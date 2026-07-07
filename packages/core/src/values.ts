import { z } from 'zod';

// Kept package-local so the published core API does not expose generic zod helpers.
export const unknownRecordSchema = z.record(z.string(), z.unknown());

export const looseStringArraySchema = z
  .array(z.unknown())
  .catch([])
  .transform(entries => entries.filter((entry): entry is string => typeof entry === 'string'));

export const stringValueSchema = z.string();

export const nonEmptyStringSchema = z.string().min(1);
