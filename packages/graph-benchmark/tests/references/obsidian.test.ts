import { readFile, readdir, stat } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';

const EXPECTED_SCENARIOS = [
  'cold-load-settle',
  'cold-load-settle-10k',
  'drag-hub-release',
  'drag-leaf-release',
  'filter-swap',
  'force-slider-sweep',
  'pin-two-nodes-drag',
  'rapid-drag-shake',
];

describe('Obsidian graph feel references', () => {
  it('pins media and metrics to deterministic fixtures', async () => {
    const referenceDirectory = new URL('../../references/obsidian/', import.meta.url);
    const entries = await readdir(referenceDirectory, { withFileTypes: true });
    const scenarioNames = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const environment = JSON.parse(
      await readFile(new URL('capture-environment.json', referenceDirectory), 'utf8'),
    ) as { fixtures: Record<'1k' | '10k', { hash: string }> };

    expect(scenarioNames).toEqual(EXPECTED_SCENARIOS);
    expect(environment.fixtures['1k'].hash).toBe(createSyntheticFixture('1k', 307).fixtureHash);
    expect(environment.fixtures['10k'].hash).toBe(createSyntheticFixture('10k', 307).fixtureHash);

    await Promise.all(scenarioNames.map(async (scenarioName) => {
      const scenarioUrl = new URL(`${scenarioName}/`, referenceDirectory);
      const metrics = JSON.parse(
        await readFile(new URL('metrics.json', scenarioUrl), 'utf8'),
      ) as { frameCount: number; rmsDisplacementPerSample: number[] };
      const video = await stat(new URL('reference.mp4', scenarioUrl));
      const strip = await stat(new URL('motion-strip.png', scenarioUrl));

      expect(metrics.frameCount).toBeGreaterThanOrEqual(28);
      expect(metrics.rmsDisplacementPerSample).toHaveLength(metrics.frameCount - 1);
      expect(video.size).toBeGreaterThan(10_000);
      expect(strip.size).toBeGreaterThan(10_000);
    }));
  });
});
