import { z } from 'zod';

// Kept extension-local so webview/e2e code does not depend on core's public API surface.
export const unknownRecordSchema = z.record(z.string(), z.unknown());

export const looseStringArraySchema = z
  .array(z.unknown())
  .catch([])
  .transform(entries => entries.filter((entry): entry is string => typeof entry === 'string'));

export const nonEmptyStringSchema = z.string().min(1);

export const trimmedNonEmptyStringSchema = z.string().trim().min(1);
