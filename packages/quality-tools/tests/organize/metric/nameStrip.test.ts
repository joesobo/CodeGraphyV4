import { describe, expect, it } from 'vitest';
import { stripExtension } from '../../../src/organize/metric/nameStrip';

describe('stripExtension', () => {
  it('strips compound test extension .test.ts', () => {
    expect(stripExtension('utils.test.ts')).toBe('utils');
  });

  it('strips compound test extension .test.tsx', () => {
    expect(stripExtension('Component.test.tsx')).toBe('Component');
  });

  it('strips compound spec extension .spec.ts', () => {
    expect(stripExtension('helpers.spec.ts')).toBe('helpers');
  });

  it('strips compound spec extension .spec.js', () => {
    expect(stripExtension('helpers.spec.js')).toBe('helpers');
  });

  it('strips single extension when no compound extension found', () => {
    expect(stripExtension('model.ts')).toBe('model');
  });

  it('strips single extension .tsx', () => {
    expect(stripExtension('Button.tsx')).toBe('Button');
  });

  it('strips single extension .js', () => {
    expect(stripExtension('index.js')).toBe('index');
  });

  it('strips single extension .jsx', () => {
    expect(stripExtension('Component.jsx')).toBe('Component');
  });

  it('strips last extension for filenames with multiple dots', () => {
    expect(stripExtension('utils.service.ts')).toBe('utils.service');
  });

  it('returns filename as-is when no extension exists', () => {
    expect(stripExtension('README')).toBe('README');
  });

  it('returns filename as-is when filename is just extension', () => {
    expect(stripExtension('.ts')).toBe('.ts');
  });

  it('returns filename as-is for dot-starting filenames without proper extension', () => {
    expect(stripExtension('.gitignore')).toBe('.gitignore');
  });

  it('handles empty string', () => {
    expect(stripExtension('')).toBe('');
  });

  it('prioritizes compound extension over single extension', () => {
    // "utils.test.ts" should strip compound, not just ".ts"
    expect(stripExtension('utils.test.ts')).toBe('utils');
  });

  it('handles edge case with just dot at position 0', () => {
    const result = stripExtension('.ts');
    // lastDot is at 0, so condition (lastDot > 0) is false, returns original
    expect(result).toBe('.ts');
  });

  it('strips extension from files with underscores and hyphens', () => {
    expect(stripExtension('_shared.ts')).toBe('_shared');
    expect(stripExtension('my-file.ts')).toBe('my-file');
  });

  it('strips extension from CamelCase filenames', () => {
    expect(stripExtension('MyComponent.tsx')).toBe('MyComponent');
  });

  it('preserves intermediate dots in filename', () => {
    expect(stripExtension('api.client.ts')).toBe('api.client');
  });
});
