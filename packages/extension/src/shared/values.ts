import { z } from 'zod';

export const unknownRecordSchema = z.record(z.string(), z.unknown());
