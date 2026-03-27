import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { baselinePathFor, writeScrapBaseline } from '../../src/scrap/writeScrapBaseline';
import { createMetrics } from './runScrapCli.testSupport';

const { mkdirSync, writeFileSync } = vi.hoisted(() => ({
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

vi.mock('fs', () => ({
  mkdirSync,
  writeFileSync
}));

describe('writeScrapBaseline', () => {
  it('builds a repo baseline path for the repo target', () => {
    expect(baselinePathFor('.')).toBe(join(REPO_ROOT, 'reports', 'scrap', 'repo.json'));
  });

  it('builds a sanitized baseline path for nested targets', () => {
    expect(baselinePathFor('packages/quality-tools/tests')).toBe(
      join(REPO_ROOT, 'reports', 'scrap', 'packages-quality-tools-tests.json')
    );
  });

  it('creates the directory and writes the metrics json', () => {
    mkdirSync.mockClear();
    writeFileSync.mockClear();

    const metrics = createMetrics();
    const baselinePath = baselinePathFor('packages/quality-tools/tests');
    writeScrapBaseline('packages/quality-tools/tests', metrics);

    expect(mkdirSync).toHaveBeenCalledWith(join(baselinePath, '..'), { recursive: true });
    expect(writeFileSync).toHaveBeenCalledWith(
      baselinePath,
      JSON.stringify(metrics, null, 2)
    );
  });
});
