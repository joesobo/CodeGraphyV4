import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { matchPathPattern, resolveWithPaths } from '../src/pathMatcher';

describe('matchPathPattern', () => {
  it('should match wildcard pattern and return captured part', () => {
    expect(matchPathPattern('@/components/Button', '@/*')).toBe('components/Button');
  });

  it('should match exact pattern and return empty string', () => {
    expect(matchPathPattern('jquery', 'jquery')).toBe('');
  });

  it('should return null for non-matching pattern', () => {
    expect(matchPathPattern('lodash', '@/*')).toBeNull();
  });

  it('should handle pattern with prefix and suffix', () => {
    expect(matchPathPattern('@components/Button.comp', '@components/*.comp')).toBe('Button');
  });

  it('should return null when suffix does not match', () => {
    expect(matchPathPattern('@components/Button.tsx', '@components/*.comp')).toBeNull();
  });

  it('should match pattern with only prefix', () => {
    expect(matchPathPattern('#/helpers/parse', '#/*')).toBe('helpers/parse');
  });

  it('should return null when specifier does not equal exact pattern', () => {
    // Distinguishes the specifier === pattern always-true mutation: a non-matching
    // exact pattern must return null, not '' (empty string match)
    expect(matchPathPattern('lodash', 'jquery')).toBeNull();
  });
});

describe('resolveWithPaths', () => {
  let tempDir: string;

  function createFile(relativePath: string): string {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '');
    return fullPath;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathmatcher-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should resolve specifier through matching path alias', () => {
    createFile('src/components/Button.ts');
    const paths = { '@/*': ['src/*'] };

    const result = resolveWithPaths('@/components/Button', paths, tempDir);

    expect(result).toBe(path.join(tempDir, 'src', 'components', 'Button.ts'));
  });

  it('should return null when no path aliases match', () => {
    const paths = { '@/*': ['src/*'] };

    const result = resolveWithPaths('lodash', paths, tempDir);

    expect(result).toBeNull();
  });

  it('should return null when paths config is undefined', () => {
    const result = resolveWithPaths('@/foo', undefined, tempDir);

    expect(result).toBeNull();
  });

  it('should try multiple targets for same alias', () => {
    createFile('lib/utils.ts');
    const paths = { '@/*': ['src/*', 'lib/*'] };

    const result = resolveWithPaths('@/utils', paths, tempDir);

    expect(result).toBe(path.join(tempDir, 'lib', 'utils.ts'));
  });

  it('should resolve exact match pattern', () => {
    createFile('vendor/jquery.ts');
    const paths = { 'jquery': ['vendor/jquery'] };

    const result = resolveWithPaths('jquery', paths, tempDir);

    expect(result).toBe(path.join(tempDir, 'vendor', 'jquery.ts'));
  });
});
