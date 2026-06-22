import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

test('performance runner writes bounded JSON metrics', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'codegraphy-perf-'));
  const outputPath = path.join(tempDir, 'metrics.json');

  try {
    const moduleUrl = pathToFileURL(
      path.resolve('scripts/performance/measure-codegraphy-monorepo.mjs'),
    ).href;
    const { writeMetrics } = await import(moduleUrl);

    await writeMetrics({
      outputPath,
      workspacePath: tempDir,
      measurements: {
        coldIndexMs: 100,
        warmCacheLoadMs: 20,
        nodeCount: 2,
        edgeCount: 1,
        payloadBytes: 512,
      },
    });

    const metrics = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(metrics.workspacePath, tempDir);
    assert.equal(metrics.measurements.coldIndexMs, 100);
    assert.equal(metrics.measurements.warmCacheLoadMs, 20);
    assert.equal(metrics.measurements.nodeCount, 2);
    assert.equal(metrics.measurements.edgeCount, 1);
    assert.equal(metrics.measurements.payloadBytes, 512);
    assert.match(metrics.recordedAt, /^\d{4}-\d{2}-\d{2}T/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('performance runner parses verbose indexing phase timings', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'codegraphy-perf-phases-'));
  const logPath = path.join(tempDir, 'index.log');

  try {
    await writeFile(logPath, [
      '[CodeGraphy] Indexing phase complete: phase=discover-files, durationMs=1900, files=2367, directories=3180, totalFound=2367, limitReached=false',
      '[CodeGraphy] Indexing phase complete: phase=analyze-files, durationMs=88321, files=2367, cacheHits=0, cacheMisses=2367',
      '[CodeGraphy] Indexing phase complete: phase=build-graph, durationMs=62, nodes=5078, edges=9114',
      '      213.93 real        93.33 user        25.41 sys',
      '{',
      '  "graphCache": ".codegraphy/graph.lbug",',
      '  "files": 2367,',
      '  "nodes": 5078,',
      '  "edges": 9114',
      '}',
      '',
    ].join('\n'));

    const moduleUrl = pathToFileURL(
      path.resolve('scripts/performance/measure-codegraphy-monorepo.mjs'),
    ).href;
    const { readColdIndexLogMetrics } = await import(moduleUrl);
    const metrics = await readColdIndexLogMetrics({
      logPath,
      workspacePath: tempDir,
    });

    assert.deepEqual(metrics.indexPhases['discover-files'], {
      phase: 'discover-files',
      durationMs: 1900,
      files: 2367,
      directories: 3180,
      totalFound: 2367,
      limitReached: false,
    });
    assert.deepEqual(metrics.indexPhases['analyze-files'], {
      phase: 'analyze-files',
      durationMs: 88321,
      files: 2367,
      cacheHits: 0,
      cacheMisses: 2367,
    });
    assert.deepEqual(metrics.indexPhases['build-graph'], {
      phase: 'build-graph',
      durationMs: 62,
      nodes: 5078,
      edges: 9114,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('performance runner summarizes repeated timing samples deterministically', async () => {
  const moduleUrl = pathToFileURL(
    path.resolve('scripts/performance/measure-codegraphy-monorepo.mjs'),
  ).href;
  const { summarizeDurations } = await import(moduleUrl);

  assert.deepEqual(summarizeDurations([50.4, 10.2, 30.6, 20.1, 40.5]), {
    iterations: 5,
    minMs: 10,
    medianMs: 31,
    p95Ms: 50,
    maxMs: 50,
  });
});
