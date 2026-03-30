import { describe, expect, it } from 'vitest';
import { resolveImportToFile } from '../../../src/organize/cohesion/resolve';

describe('resolveImportToFile', () => {
  it('resolves relative import with ./ prefix to file', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('./foo', availableFiles);

    expect(result).toBe('foo.ts');
  });

  it('returns undefined for imports without ./ prefix', () => {
    const availableFiles = new Map([
      ['react', 'react.ts']
    ]);

    const result = resolveImportToFile('react', availableFiles);

    expect(result).toBeUndefined();
  });

  it('returns undefined for parent directory imports', () => {
    const availableFiles = new Map([
      ['utils', 'utils.ts']
    ]);

    const result = resolveImportToFile('../utils', availableFiles);

    expect(result).toBeUndefined();
  });

  it('strips single extension before lookup', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('./foo.ts', availableFiles);

    expect(result).toBe('foo.ts');
  });

  it('strips .js extension before lookup', () => {
    const availableFiles = new Map([
      ['module', 'module.ts']
    ]);

    const result = resolveImportToFile('./module.js', availableFiles);

    expect(result).toBe('module.ts');
  });

  it('strips .tsx extension before lookup', () => {
    const availableFiles = new Map([
      ['Button', 'Button.ts']
    ]);

    const result = resolveImportToFile('./Button.tsx', availableFiles);

    expect(result).toBe('Button.ts');
  });

  it('strips .jsx extension before lookup', () => {
    const availableFiles = new Map([
      ['Component', 'Component.ts']
    ]);

    const result = resolveImportToFile('./Component.jsx', availableFiles);

    expect(result).toBe('Component.ts');
  });

  it('strips compound extension .test.ts before lookup', () => {
    const availableFiles = new Map([
      ['utils', 'utils.ts']
    ]);

    const result = resolveImportToFile('./utils.test.ts', availableFiles);

    expect(result).toBe('utils.ts');
  });

  it('strips compound extension .test.tsx before lookup', () => {
    const availableFiles = new Map([
      ['Button', 'Button.tsx']
    ]);

    const result = resolveImportToFile('./Button.test.tsx', availableFiles);

    expect(result).toBe('Button.tsx');
  });

  it('strips compound extension .spec.ts before lookup', () => {
    const availableFiles = new Map([
      ['math', 'math.ts']
    ]);

    const result = resolveImportToFile('./math.spec.ts', availableFiles);

    expect(result).toBe('math.ts');
  });

  it('strips compound extension .spec.tsx before lookup', () => {
    const availableFiles = new Map([
      ['Component', 'Component.tsx']
    ]);

    const result = resolveImportToFile('./Component.spec.tsx', availableFiles);

    expect(result).toBe('Component.tsx');
  });

  it('prioritizes compound extensions over single extensions', () => {
    const availableFiles = new Map([
      ['utils', 'utils.ts']
    ]);

    // .test.ts should be stripped before .ts
    const result = resolveImportToFile('./utils.test.ts', availableFiles);

    expect(result).toBe('utils.ts');
  });

  it('returns undefined when file not found after stripping extension', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('./bar.ts', availableFiles);

    expect(result).toBeUndefined();
  });

  it('handles import without extension when file not found', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('./bar', availableFiles);

    expect(result).toBeUndefined();
  });

  it('resolves when basename matches after compound extension stripped', () => {
    const availableFiles = new Map([
      ['index', 'index.ts'],
    ['app', 'app.ts']
  ]);

    const result = resolveImportToFile('./app.test.ts', availableFiles);

    expect(result).toBe('app.ts');
  });

  it('handles empty available files map', () => {
    const availableFiles = new Map<string, string>();

    const result = resolveImportToFile('./foo', availableFiles);

    expect(result).toBeUndefined();
  });

  it('handles relative import with multiple dots in filename', () => {
    const availableFiles = new Map([
      ['my.utils.helpers', 'my.utils.helpers.ts']
    ]);

    // Import './my.utils.helpers.ts' should strip .ts and look up 'my.utils.helpers'
    const result = resolveImportToFile('./my.utils.helpers.ts', availableFiles);

    expect(result).toBe('my.utils.helpers.ts');
  });

  it('handles case-sensitive filename lookup', () => {
    const availableFiles = new Map([
      ['Button', 'Button.tsx'],
    ['button', 'button.tsx']
  ]);

    const result = resolveImportToFile('./Button', availableFiles);

    expect(result).toBe('Button.tsx');
  });

  it('does not resolve non-relative paths like absolute paths', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('/foo', availableFiles);

    expect(result).toBeUndefined();
  });

  it('returns undefined for empty import specifier', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    const result = resolveImportToFile('', availableFiles);

    expect(result).toBeUndefined();
  });

  it('does not resolve non-relative paths that would match after slicing', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    expect(resolveImportToFile('xxfoo.ts', availableFiles)).toBeUndefined();
  });

  it('handles ./. directory reference', () => {
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    // './..' should not match './'
    const result = resolveImportToFile('./..', availableFiles);

    expect(result).toBeUndefined();
  });

  it('resolves import with trailing slash stripped', () => {
    const availableFiles = new Map([
      ['index', 'index.ts']
    ]);

    // Note: our implementation slices after './', so './' alone becomes ''
    const result = resolveImportToFile('./', availableFiles);

    expect(result).toBeUndefined();
  });

  it('kills L16 mutation: startsWith("./") check is essential', () => {
    // The .startsWith('./') check must stay. If removed or changed, non-relative imports would be processed
    const availableFiles = new Map([
      ['foo', 'foo.ts']
    ]);

    // Without './' prefix, should always return undefined
    expect(resolveImportToFile('foo', availableFiles)).toBeUndefined();
    expect(resolveImportToFile('../foo', availableFiles)).toBeUndefined();
    expect(resolveImportToFile('/absolute/foo', availableFiles)).toBeUndefined();

    // Only with './' should it resolve
    expect(resolveImportToFile('./foo', availableFiles)).toBe('foo.ts');
  });

  it('kills L43 mutation: availableFiles.has() lookup is required', () => {
    // The has() check at L43 is necessary to avoid undefined returns
    const availableFiles = new Map([
      ['foo', 'foo.ts'],
      ['bar', 'bar.ts']
    ]);

    // Path that exists in map
    expect(resolveImportToFile('./foo', availableFiles)).toBe('foo.ts');
    expect(resolveImportToFile('./bar', availableFiles)).toBe('bar.ts');

    // Path that does NOT exist in map
    expect(resolveImportToFile('./baz', availableFiles)).toBeUndefined();
  });

  it('kills L26 mutation: compound extension stripping is essential', () => {
    // The compound extension loop must execute and correctly remove compound extensions
    const availableFiles = new Map([
      ['utils', 'utils.ts']
    ]);

    // .test.ts should be stripped to find 'utils'
    const result = resolveImportToFile('./utils.test.ts', availableFiles);
    expect(result).toBe('utils.ts');
  });
});
