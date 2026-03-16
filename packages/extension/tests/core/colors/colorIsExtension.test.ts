import { describe, it, expect } from 'vitest';
import { isExtension } from '../../../src/core/colors/colorIsExtension';

describe('isExtension', () => {
  it('returns true for a simple extension like .ts', () => {
    expect(isExtension('.ts')).toBe(true);
  });

  it('returns true for .js', () => {
    expect(isExtension('.js')).toBe(true);
  });

  it('returns true for .py', () => {
    expect(isExtension('.py')).toBe(true);
  });

  it('returns true for a 4-character extension like .java', () => {
    expect(isExtension('.java')).toBe(true);
  });

  it('returns true for a single character extension like .c', () => {
    expect(isExtension('.c')).toBe(true);
  });

  it('returns false for extensions longer than 4 characters after the dot', () => {
    expect(isExtension('.scala')).toBe(false);
  });

  it('returns false for a pattern containing a wildcard', () => {
    expect(isExtension('*.ts')).toBe(false);
  });

  it('returns false for a pattern containing a forward slash', () => {
    expect(isExtension('src/file.ts')).toBe(false);
  });

  it('returns false for a pattern containing a backslash', () => {
    expect(isExtension('src\\file.ts')).toBe(false);
  });

  it('returns false for a pattern not starting with a dot', () => {
    expect(isExtension('ts')).toBe(false);
  });

  it('returns false for just a dot', () => {
    expect(isExtension('.')).toBe(false);
  });

  it('returns false for a compound extension like .test.ts', () => {
    expect(isExtension('.test.ts')).toBe(false);
  });

  it('returns false for a double extension like .d.ts', () => {
    expect(isExtension('.d.ts')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isExtension('')).toBe(false);
  });

  it('returns false for a filename like Makefile', () => {
    expect(isExtension('Makefile')).toBe(false);
  });

  it('returns false for glob pattern like **/*.ts', () => {
    expect(isExtension('**/*.ts')).toBe(false);
  });

  it('returns true for exactly 4 chars after dot like .json', () => {
    expect(isExtension('.json')).toBe(true);
  });

  it('returns false for 5 chars after dot like .jsonl', () => {
    expect(isExtension('.jsonl')).toBe(false);
  });

  it('returns true for .md', () => {
    expect(isExtension('.md')).toBe(true);
  });

  it('returns true for .go', () => {
    expect(isExtension('.go')).toBe(true);
  });

  it('returns true for .tsx', () => {
    expect(isExtension('.tsx')).toBe(true);
  });

  it('returns true for .jsx', () => {
    expect(isExtension('.jsx')).toBe(true);
  });
});
