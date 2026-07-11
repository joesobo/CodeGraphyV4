import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { hashGraphFixture } from '../../src/fixture/hash';
import type { RealBenchmarkFixture } from '../../src/snapshot/normalize';

const FIXTURE_NAMES = [
  'claude-max-api-proxy',
  'codegraphy-v4',
  'quality-tools',
] as const;

describe('real repository fixtures', () => {
  it.each(FIXTURE_NAMES)('keeps %s internally consistent and sanitized', async (name) => {
    const fixtureUrl = new URL(`../../fixtures/real/${name}.json`, import.meta.url);
    const serialized = await readFile(fixtureUrl, 'utf8');
    const fixture = JSON.parse(serialized) as RealBenchmarkFixture;

    expect(fixture.summary).toEqual({
      nodeCount: fixture.graph.nodes.length,
      edgeCount: fixture.graph.edges.length,
    });
    expect(hashGraphFixture(fixture.graph)).toBe(fixture.fixtureHash);
    expect(fixture.source.repositoryUrl).toMatch(/^https:\/\/github\.com\//);
    expect(fixture.source.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(fixture.source.license).toBe('MIT');
    expect(serialized).not.toContain('/Users/');
    expect(serialized).not.toContain('pluginName');
  });
});
