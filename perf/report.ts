import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

const measurementSchema = z.number().finite().nonnegative();
const nonemptyStringSchema = z.string().min(1);

const operationMetricsSchema = z.strictObject({
  save: measurementSchema,
  rename: measurementSchema,
  create: measurementSchema,
  delete: measurementSchema,
  batch100: measurementSchema,
});

const fileOperationMetricsSchema = z.strictObject({
  rename: measurementSchema,
  create: measurementSchema,
  delete: measurementSchema,
  reveal: measurementSchema,
});

export const perfReportSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fixture: z.enum(['small', 'medium', 'large', 'huge', 'giant', 'self']),
  variant: z.enum(['default', 'symbols']),
  runner: z.strictObject({
    os: nonemptyStringSchema,
    arch: nonemptyStringSchema,
    cpuModel: nonemptyStringSchema,
    nodeVersion: nonemptyStringSchema,
    vscodeVersion: nonemptyStringSchema,
    runnerClass: nonemptyStringSchema,
  }),
  metrics: z.strictObject({
    coldOpenMs: measurementSchema,
    warmOpenMs: measurementSchema,
    incrementalRefreshMs: operationMetricsSchema,
    payloadBytes: measurementSchema,
    watcherToGraphMs: operationMetricsSchema,
    fileOpRoundtripMs: fileOperationMetricsSchema,
    layoutResets: measurementSchema,
    cacheSaveMs: measurementSchema,
    cacheBytes: measurementSchema,
    treeSitterParseMs: measurementSchema,
    graphBuildMs: measurementSchema,
    scopeToggleMs: z.record(nonemptyStringSchema, measurementSchema).refine(
      scopeMeasurements => Object.keys(scopeMeasurements).length > 0,
      'At least one scope-toggle measurement is required',
    ),
    settleTimeMs: measurementSchema,
    idleCpuPct: measurementSchema,
    simTicksAfterSettle: measurementSchema,
  }),
  webview: z.strictObject({
    fpsIdle: measurementSchema,
    fpsDrag: measurementSchema,
    fpsSettle: measurementSchema,
    longTasksPerInteraction: measurementSchema,
    heapUsedBytes: measurementSchema,
  }),
  explorer: z.strictObject({
    explorerRenameMs: measurementSchema,
    explorerCreateMs: measurementSchema,
    explorerDeleteMs: measurementSchema,
    explorerRevealMs: measurementSchema,
  }),
  ratios: z.strictObject({
    renameRatio: measurementSchema,
    createRatio: measurementSchema,
    deleteRatio: measurementSchema,
    revealRatio: measurementSchema,
  }),
});

export type PerfReport = z.infer<typeof perfReportSchema>;
export type PerfFixture = PerfReport['fixture'];
export type PerfVariant = PerfReport['variant'];

export function parsePerfReport(value: unknown): PerfReport {
  return perfReportSchema.parse(value);
}

function reportFileName(report: PerfReport): string {
  return report.variant === 'default'
    ? `${report.fixture}.json`
    : `${report.fixture}-${report.variant}.json`;
}

function sortScopeMeasurements(
  scopeMeasurements: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(scopeMeasurements).sort(([left], [right]) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }),
  );
}

export async function writePerfReport(
  outputDirectory: string,
  value: unknown,
): Promise<string> {
  const report = parsePerfReport(value);
  const fileName = reportFileName(report);
  const outputPath = join(outputDirectory, fileName);
  const temporaryPath = join(
    outputDirectory,
    `.${fileName}.${process.pid}.${randomUUID()}.tmp`,
  );
  const stableReport = {
    ...report,
    metrics: {
      ...report.metrics,
      scopeToggleMs: sortScopeMeasurements(report.metrics.scopeToggleMs),
    },
  };
  const contents = `${JSON.stringify(stableReport, null, 2)}\n`;

  await mkdir(outputDirectory, { recursive: true });
  try {
    await writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, outputPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }

  return outputPath;
}
