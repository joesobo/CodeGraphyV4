import { z } from 'zod';

export const unknownRecordSchema = z.record(z.string(), z.unknown());

export const looseStringArraySchema = z
  .array(z.unknown())
  .catch([])
  .transform(entries => entries.filter((entry): entry is string => typeof entry === 'string'));
