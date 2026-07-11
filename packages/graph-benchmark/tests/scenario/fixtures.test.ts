import { readdir, readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { parseFeelScenario } from '../../src/scenario/model';

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

describe('standard graph feel scenarios', () => {
  it('keeps the complete standard set valid and uniquely identified', async () => {
    const scenarioDirectory = new URL('../../scenarios/', import.meta.url);
    const fileNames = (await readdir(scenarioDirectory))
      .filter((fileName) => fileName.endsWith('.json'))
      .sort();
    const scenarios = await Promise.all(fileNames.map(async (fileName) =>
      parseFeelScenario(JSON.parse(await readFile(new URL(fileName, scenarioDirectory), 'utf8'))),
    ));

    expect(scenarios.map((scenario) => scenario.id).sort()).toEqual(EXPECTED_SCENARIOS);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);
  });
});
