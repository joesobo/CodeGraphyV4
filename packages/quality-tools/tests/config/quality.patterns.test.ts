import { describe, expect, it } from 'vitest';
import {
  resolvePackageToolGlobs,
  resolvePackageToolPatterns
} from '../../src/config/quality';
import {
  createQualityConfigRepo,
  DEFAULT_QUALITY_CONFIG,
  OVERRIDE_ONLY_QUALITY_CONFIG
} from './qualityRepo';

describe('resolvePackageToolPatterns', () => {
  it('merges default and package-specific tool patterns', () => {
    expect(
      resolvePackageToolPatterns(createQualityConfigRepo(DEFAULT_QUALITY_CONFIG), 'example', 'mutation')
    ).toEqual({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', '**/index.ts', 'src/ignored.ts']
    });
  });

  it('handles package overrides when no defaults are configured', () => {
    expect(
      resolvePackageToolPatterns(
        createQualityConfigRepo(OVERRIDE_ONLY_QUALITY_CONFIG, 'quality-tools-config-override-'),
        'example',
        'mutation'
      )
    ).toEqual({
      include: [],
      exclude: ['src/ignored.ts']
    });
  });
});

describe('resolvePackageToolGlobs', () => {
  it('expands package-relative patterns into repo-relative globs', () => {
    expect(resolvePackageToolGlobs(createQualityConfigRepo(DEFAULT_QUALITY_CONFIG), 'example', 'mutation')).toEqual({
      include: ['packages/example/src/**/*.ts'],
      exclude: [
        'packages/example/src/**/*.d.ts',
        'packages/example/**/index.ts',
        'packages/example/src/ignored.ts'
      ]
    });
  });
});
