import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import { parsePerfReport, writePerfReport } from './report';

const validReport = {
  schemaVersion: 1,
  fixture: 'small',
  variant: 'default',
  runner: {
    os: 'darwin',
    arch: 'arm64',
    cpuModel: 'Apple M4',
    nodeVersion: 'v22.22.0',
    vscodeVersion: '1.128.0',
    runnerClass: 'local-reference',
  },
  metrics: {
    coldOpenMs: 1_000,
    warmOpenMs: 500,
    incrementalRefreshMs: {
      save: 10,
      rename: 20,
      create: 30,
      delete: 40,
      batch100: 50,
    },
    payloadBytes: 2_048,
    watcherToGraphMs: {
      save: 11,
      rename: 21,
      create: 31,
      delete: 41,
      batch100: 51,
    },
    fileOpRoundtripMs: {
      rename: 25,
      create: 35,
      delete: 45,
      reveal: 15,
    },
    layoutResets: 0,
    cacheSaveMs: 12,
    cacheBytes: 4_096,
    treeSitterParseMs: 120,
    graphBuildMs: 180,
    pluginActivationMs: {
      'codegraphy.markdown': 12,
    },
    scopeToggleMs: {
      files: 8,
    },
    settleTimeMs: 300,
    idleCpuPct: 0.5,
    simTicksAfterSettle: 0,
  },
  webview: {
    fpsIdle: 60,
    fpsDrag: 58,
    fpsSettle: 55,
    longTasksPerInteraction: 0,
    heapUsedBytes: 1_048_576,
  },
  explorer: {
    explorerRenameMs: 20,
    explorerCreateMs: 30,
    explorerDeleteMs: 40,
    explorerRevealMs: 10,
  },
  ratios: {
    renameRatio: 1.25,
    createRatio: 1.17,
    deleteRatio: 1.13,
    revealRatio: 1.5,
  },
} as const;

describe('performance report', () => {
  it('parses a complete report', () => {
    expect(parsePerfReport(validReport)).toEqual(validReport);
  });

  it('rejects a report with a missing metric', () => {
    const incompleteReport = structuredClone(validReport) as {
      metrics: { cacheBytes?: number };
    };
    delete incompleteReport.metrics.cacheBytes;

    expect(() => parsePerfReport(incompleteReport)).toThrow();
  });

  it.each([
    { label: 'negative', value: -1 },
    { label: 'not-a-number', value: Number.NaN },
  ])('rejects a $label measurement', ({ value }) => {
    const invalidReport = structuredClone(validReport) as {
      metrics: { coldOpenMs: number };
    };
    invalidReport.metrics.coldOpenMs = value;

    expect(() => parsePerfReport(invalidReport)).toThrow();
  });

  it('rejects an unknown field', () => {
    const reportWithUnknownField = structuredClone(validReport) as {
      metrics: Record<string, unknown>;
    };
    reportWithUnknownField.metrics.unmeasuredValue = 1;

    expect(() => parsePerfReport(reportWithUnknownField)).toThrow();
  });

  it('rejects empty runner metadata', () => {
    const reportWithEmptyMetadata = structuredClone(validReport) as {
      runner: { cpuModel: string };
    };
    reportWithEmptyMetadata.runner.cpuModel = '';

    expect(() => parsePerfReport(reportWithEmptyMetadata)).toThrow();
  });

  it.each([
    '../escaped',
    'linux/x64',
    String.raw`linux\x64`,
    'linux x64',
    'con',
  ])('rejects runner class %j when it is not a filename-safe slug', (runnerClass) => {
    const invalidReport = structuredClone(validReport) as {
      runner: { runnerClass: string };
    };
    invalidReport.runner.runnerClass = runnerClass;

    expect(() => parsePerfReport(invalidReport)).toThrow(/runner class/i);
  });

  it('rejects an empty scope-toggle measurement map', () => {
    const reportWithoutScopeMeasurements = structuredClone(validReport) as {
      metrics: { scopeToggleMs: Record<string, number> };
    };
    reportWithoutScopeMeasurements.metrics.scopeToggleMs = {};

    expect(() => parsePerfReport(reportWithoutScopeMeasurements)).toThrow();
  });

  it('atomically replaces a fixture report with schema-valid JSON', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'codegraphy-perf-report-'));
    onTestFinished(() => rm(outputDirectory, { recursive: true, force: true }));
    const expectedPath = join(outputDirectory, 'small.json');
    await writeFile(expectedPath, '{"incomplete":true}\n', 'utf8');

    const outputPath = await writePerfReport(outputDirectory, validReport);
    const output = await readFile(outputPath, 'utf8');

    expect(outputPath).toBe(expectedPath);
    expect(parsePerfReport(JSON.parse(output))).toEqual(validReport);
    expect(await readdir(outputDirectory)).toEqual(['small.json']);
  });

  it('writes stable pretty JSON for equivalent reports', async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'codegraphy-perf-stable-'));
    onTestFinished(() => rm(outputDirectory, { recursive: true, force: true }));
    const firstReport = structuredClone(validReport) as {
      metrics: { scopeToggleMs: Record<string, number> };
    };
    const secondReport = structuredClone(validReport) as {
      metrics: { scopeToggleMs: Record<string, number> };
    };
    firstReport.metrics.scopeToggleMs = { symbols: 9, files: 8 };
    secondReport.metrics.scopeToggleMs = { files: 8, symbols: 9 };

    const outputPath = await writePerfReport(outputDirectory, firstReport);
    const firstOutput = await readFile(outputPath, 'utf8');
    await writePerfReport(outputDirectory, secondReport);
    const secondOutput = await readFile(outputPath, 'utf8');

    expect(secondOutput).toBe(firstOutput);
    expect(firstOutput).toContain('\n  "fixture": "small",\n');
    expect(firstOutput.endsWith('\n')).toBe(true);
  });
});
