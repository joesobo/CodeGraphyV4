import { describe, expect, it } from 'vitest';
import {
  mergeBoundaryPatterns,
  mergeToolPatterns,
  packagePattern
} from '../../src/config/patterns';

describe('mergeToolPatterns', () => {
  it('normalizes and merges default and override tool patterns', () => {
    expect(
      mergeToolPatterns(
        { exclude: ['src\\generated\\**'], include: ['src\\**\\*.ts'] },
        { exclude: ['src/ignored.ts'], include: ['tests/**/*.ts'] }
      )
    ).toEqual({
      exclude: ['src/generated/**', 'src/ignored.ts'],
      include: ['src/**/*.ts', 'tests/**/*.ts']
    });
  });

  it('falls back to empty arrays when both tool pattern inputs are missing', () => {
    expect(mergeToolPatterns(undefined, undefined)).toEqual({
      exclude: [],
      include: []
    });
  });
});

describe('mergeBoundaryPatterns', () => {
  it('prefers override layers while merging include, exclude, and entrypoint patterns', () => {
    expect(
      mergeBoundaryPatterns(
        {
          entrypoints: ['src/main.ts'],
          exclude: ['src/generated/**'],
          include: ['src/**/*.ts'],
          layers: [{ allow: [], include: ['src/shared/**'], name: 'shared' }]
        },
        {
          entrypoints: ['src/extension/activate.ts'],
          exclude: ['src/ignored.ts'],
          include: ['src/**/*.tsx'],
          layers: [{ allow: ['shared'], include: ['src/extension/**'], name: 'extension' }]
        }
      )
    ).toEqual({
      entrypoints: ['src/main.ts', 'src/extension/activate.ts'],
      exclude: ['src/generated/**', 'src/ignored.ts'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      layers: [{ allow: ['shared'], include: ['src/extension/**'], name: 'extension' }]
    });
  });

  it('falls back to default layers when overrides omit them', () => {
    expect(
      mergeBoundaryPatterns(
        {
          layers: [{ allow: [], include: ['src/shared/**'], name: 'shared' }]
        },
        {}
      )
    ).toMatchObject({
      layers: [{ allow: [], include: ['src/shared/**'], name: 'shared' }]
    });
  });

  it('falls back to empty arrays when boundary pattern inputs are missing', () => {
    expect(mergeBoundaryPatterns(undefined, undefined)).toEqual({
      entrypoints: [],
      exclude: [],
      include: [],
      layers: []
    });
  });
});

describe('packagePattern', () => {
  it('expands package-relative patterns into repo-relative globs', () => {
    expect(packagePattern('extension', 'src/**/*.ts')).toBe('packages/extension/src/**/*.ts');
  });
});
