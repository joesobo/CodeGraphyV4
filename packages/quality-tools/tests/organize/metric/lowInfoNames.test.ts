import { describe, expect, it } from 'vitest';
import { checkLowInfoName, type LowInfoNameConfig } from '../../../src/organize/metric/lowInfoNames';

describe('checkLowInfoName', () => {
  const defaultConfig: LowInfoNameConfig = {
    banned: ['utils', 'helpers', 'misc', 'common', 'shared', '_shared', 'lib', 'index'],
    discouraged: ['types', 'constants', 'config', 'base', 'core']
  };

  it('detects banned name: utils.ts', () => {
    const issue = checkLowInfoName('utils.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
    expect(issue?.detail).toContain('Catch-all dumping ground');
  });

  it('detects banned name: helpers.ts', () => {
    const issue = checkLowInfoName('helpers.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
    expect(issue?.detail).toContain('Vague semantics');
  });

  it('detects discouraged name: types.ts', () => {
    const issue = checkLowInfoName('types.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-discouraged');
    expect(issue?.detail).toContain('dump for unrelated type definitions');
  });

  it('detects discouraged name: constants.ts', () => {
    const issue = checkLowInfoName('constants.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-discouraged');
    expect(issue?.detail).toContain('dump for unrelated values');
  });

  it('allows normal file names', () => {
    const issue = checkLowInfoName('analyze.ts', defaultConfig);
    expect(issue).toBeUndefined();
  });

  it('allows index.ts when isPackageEntryPoint is true', () => {
    const issue = checkLowInfoName('index.ts', defaultConfig, true);
    expect(issue).toBeUndefined();
  });

  it('flags index.ts when isPackageEntryPoint is false', () => {
    const issue = checkLowInfoName('index.ts', defaultConfig, false);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('flags index.ts when isPackageEntryPoint is not provided', () => {
    const issue = checkLowInfoName('index.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('performs case-insensitive matching: Utils.ts', () => {
    const issue = checkLowInfoName('Utils.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('performs case-insensitive matching: HELPERS.TS', () => {
    const issue = checkLowInfoName('HELPERS.TS', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('performs case-insensitive matching: Types.tsx', () => {
    const issue = checkLowInfoName('Types.tsx', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-discouraged');
  });

  it('handles compound test extension: utils.test.ts', () => {
    const issue = checkLowInfoName('utils.test.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('handles compound spec extension: helpers.spec.tsx', () => {
    const issue = checkLowInfoName('helpers.spec.tsx', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('provides generic message for custom banned names not in detail map', () => {
    const customConfig: LowInfoNameConfig = {
      banned: ['junk'],
      discouraged: []
    };
    const issue = checkLowInfoName('junk.ts', customConfig);
    expect(issue).toBeDefined();
    expect(issue?.detail).toBe('Low-information filename');
  });

  it('provides generic message for custom discouraged names not in detail map', () => {
    const customConfig: LowInfoNameConfig = {
      banned: [],
      discouraged: ['orphaned']
    };
    const issue = checkLowInfoName('orphaned.ts', customConfig);
    expect(issue).toBeDefined();
    expect(issue?.detail).toBe('Low-information filename');
  });

  it('returns issue with correct fileName field', () => {
    const issue = checkLowInfoName('misc.ts', defaultConfig);
    expect(issue?.fileName).toBe('misc.ts');
  });

  it('detects all default banned names', () => {
    const bannedNames = ['utils', 'helpers', 'misc', 'common', 'shared', '_shared', 'lib', 'index'];
    for (const name of bannedNames) {
      const issue = checkLowInfoName(`${name}.ts`, defaultConfig);
      expect(issue?.kind).toBe('low-info-banned');
    }
  });

  it('detects all default discouraged names', () => {
    const discouragedNames = ['types', 'constants', 'config', 'base', 'core'];
    for (const name of discouragedNames) {
      const issue = checkLowInfoName(`${name}.ts`, defaultConfig);
      expect(issue?.kind).toBe('low-info-discouraged');
    }
  });

  it('handles index as both banned and in special case', () => {
    const issue1 = checkLowInfoName('index.ts', defaultConfig, true);
    expect(issue1).toBeUndefined();

    const issue2 = checkLowInfoName('index.ts', defaultConfig, false);
    expect(issue2?.kind).toBe('low-info-banned');
  });

  it('handles multiple extensions: .test.tsx', () => {
    const issue = checkLowInfoName('utils.test.tsx', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('handles .spec.js extension', () => {
    const issue = checkLowInfoName('helpers.spec.js', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('returns null for files without extensions', () => {
    const issue = checkLowInfoName('normalname', defaultConfig);
    expect(issue).toBeUndefined();
  });

  it('correctly identifies banned names even without extension', () => {
    const issue = checkLowInfoName('utils', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('correctly identifies discouraged names even without extension', () => {
    const issue = checkLowInfoName('types', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-discouraged');
  });

  it('respects isDirectory flag as false by default for index.ts', () => {
    const issue = checkLowInfoName('index.ts', defaultConfig, false);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('allows index only when isPackageEntryPoint is explicitly true', () => {
    const issue = checkLowInfoName('index.ts', defaultConfig, true);
    expect(issue).toBeUndefined();
  });

  it('handles lastDot at position 0 correctly', () => {
    // File like ".ts" should not match
    const issue = checkLowInfoName('.ts', defaultConfig);
    expect(issue).toBeUndefined();
  });

  it('strips single extension before checking', () => {
    // "utils.test" after stripping compound would be "utils"
    const issue = checkLowInfoName('utils.other', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('handles multiple dots in filename correctly', () => {
    // "utils.service.ts" should strip to "utils.service" which is not in the list
    const issue = checkLowInfoName('utils.service.ts', defaultConfig);
    expect(issue).toBeUndefined();
  });

  it('allows filenames with extension that match banned names after stripping', () => {
    const issue = checkLowInfoName('common.ts', defaultConfig);
    expect(issue).toBeDefined();
    expect(issue?.kind).toBe('low-info-banned');
  });

  it('returns undefined for non-matching lowercase name', () => {
    const issue = checkLowInfoName('model.ts', defaultConfig);
    expect(issue).toBeUndefined();
  });

  it('case-insensitive matching works for all banned names', () => {
    const bannedNames = ['UTILS', 'Helpers', 'MISC', 'Common', 'Shared', '_SHARED', 'LIB', 'INDEX'];
    for (const name of bannedNames) {
      const issue = checkLowInfoName(`${name}.ts`, defaultConfig);
      expect(issue?.kind).toBe('low-info-banned');
    }
  });

  it('case-insensitive matching works for all discouraged names', () => {
    const discouragedNames = ['TYPES', 'Constants', 'CONFIG', 'Base', 'CORE'];
    for (const name of discouragedNames) {
      const issue = checkLowInfoName(`${name}.ts`, defaultConfig);
      expect(issue?.kind).toBe('low-info-discouraged');
    }
  });
});
