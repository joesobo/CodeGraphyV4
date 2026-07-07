import { unknownRecordSchema } from '../values';

const EXPORT_CONDITIONS = ['default', 'import', 'node', 'require'] as const;

export function getEntrypointFromExports(exportsValue: unknown): string | undefined {
  if (typeof exportsValue === 'string') {
    return exportsValue;
  }

  const exportsRecord = unknownRecordSchema.safeParse(exportsValue);
  if (!exportsRecord.success) {
    return undefined;
  }

  const rootExport = exportsRecord.data['.'] ?? exportsRecord.data;
  if (typeof rootExport === 'string') {
    return rootExport;
  }

  const rootRecord = unknownRecordSchema.safeParse(rootExport);
  if (!rootRecord.success) {
    return undefined;
  }

  for (const condition of EXPORT_CONDITIONS) {
    const conditionTarget = rootRecord.data[condition];
    if (typeof conditionTarget === 'string') {
      return conditionTarget;
    }
  }

  return undefined;
}
