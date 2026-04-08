import { describe, expect, it } from 'vitest';
import { pathIncludedByTool } from '../../src/config/quality';
import {
  createQualityConfigRepo,
  DEFAULT_QUALITY_CONFIG
} from './qualityRepo';

describe('pathIncludedByTool', () => {
  it('matches include and exclude sources for tool-specific paths', () => {
    const repoRoot = createQualityConfigRepo(DEFAULT_QUALITY_CONFIG);

    expect(pathIncludedByTool(repoRoot, 'example', 'crap', 'src/main.ts')).toBe(true);
    expect(pathIncludedByTool(repoRoot, 'example', 'crap', 'src/generated/file.ts')).toBe(false);
    expect(pathIncludedByTool(repoRoot, 'example', 'scrap', 'tests/unit/file.test.ts')).toBe(true);
    expect(pathIncludedByTool(repoRoot, 'example', 'scrap', 'tests/helpers/file.test.ts')).toBe(false);
    expect(pathIncludedByTool(repoRoot, 'example', 'scrap', 'tests/legacy/file.test.ts')).toBe(false);
  });
});
