import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { baselineMetricsByPath, readBaselineMetrics } from '../../src/scrap/baselineFiles';

describe('baseline files', () => {
  it('reads baseline metrics from disk', () => {
    const baselinePath = join(mkdtempSync(join(tmpdir(), 'quality-tools-scrap-baseline-')), 'baseline.json');
    writeFileSync(baselinePath, JSON.stringify([{ filePath: '/repo/file.test.ts', averageScore: 5 }]));

    expect(readBaselineMetrics(baselinePath)).toEqual([
      { filePath: '/repo/file.test.ts', averageScore: 5 }
    ]);
  });

  it('indexes only metrics with file paths', () => {
    const indexed = baselineMetricsByPath([
      { averageScore: 1 },
      { filePath: '/repo/a.test.ts', averageScore: 2 },
      { filePath: '/repo/b.test.ts', averageScore: 3 }
    ]);

    expect([...indexed.entries()]).toEqual([
      ['/repo/a.test.ts', { filePath: '/repo/a.test.ts', averageScore: 2 }],
      ['/repo/b.test.ts', { filePath: '/repo/b.test.ts', averageScore: 3 }]
    ]);
  });
});
