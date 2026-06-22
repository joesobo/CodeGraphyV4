import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
