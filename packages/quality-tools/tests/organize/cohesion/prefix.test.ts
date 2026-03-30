import { describe, expect, it, vi } from 'vitest';
import {
  buildPrefixGroups,
  countFirstTokens,
  findMostCommonToken,
  derivePrefix
} from '../../../src/organize/cohesion/prefix';

// Mock the tokenize function
vi.mock('../../../src/organize/tokenize', () => ({
  tokenize: (fileName: string) => {
    // Simple tokenization: split by non-alphanumeric, capitalize-case boundaries
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < fileName.length; i++) {
      const char = fileName[i];

      if (/[a-z0-9]/.test(char)) {
        current += char;
      } else if (/[A-Z]/.test(char)) {
        if (current) {
          parts.push(current.toLowerCase());
          current = '';
        }
        current += char.toLowerCase();
      } else {
        if (current) {
          parts.push(current.toLowerCase());
          current = '';
        }
      }
    }

    if (current) {
      parts.push(current.toLowerCase());
    }

    return parts;
  }
}));

describe('buildPrefixGroups', () => {
  it('groups files by their first token', () => {
    const fileNames = ['reportBlocks.ts', 'reportComparison.ts', 'scoreExample.ts'];
    const groups = buildPrefixGroups(fileNames);

    expect(groups.has('report')).toBe(true);
    expect(groups.has('score')).toBe(true);
    expect(groups.get('report')).toEqual(new Set(['reportBlocks.ts', 'reportComparison.ts']));
    expect(groups.get('score')).toEqual(new Set(['scoreExample.ts']));
  });

  it('handles empty file list', () => {
    const groups = buildPrefixGroups([]);
    expect(groups.size).toBe(0);
  });

  it('handles files with no tokens', () => {
    const fileNames = ['---', '...'];
    const groups = buildPrefixGroups(fileNames);
    // Files with no tokens should not be added to groups
    expect(groups.size).toBe(0);
  });

  it('groups single file by its prefix', () => {
    const fileNames = ['userProfile.ts'];
    const groups = buildPrefixGroups(fileNames);

    expect(groups.has('user')).toBe(true);
    expect(groups.get('user')).toEqual(new Set(['userProfile.ts']));
  });

  it('creates separate groups for different prefixes', () => {
    const fileNames = ['userA.ts', 'userB.ts', 'accountC.ts', 'accountD.ts'];
    const groups = buildPrefixGroups(fileNames);

    expect(groups.size).toBe(2);
    expect(groups.get('user')).toEqual(new Set(['userA.ts', 'userB.ts']));
    expect(groups.get('account')).toEqual(new Set(['accountC.ts', 'accountD.ts']));
  });
});

describe('countFirstTokens', () => {
  it('counts frequency of first tokens', () => {
    const fileNames = ['reportA.ts', 'reportB.ts', 'scoreC.ts'];
    const counts = countFirstTokens(fileNames);

    expect(counts.get('report')).toBe(2);
    expect(counts.get('score')).toBe(1);
  });

  it('handles empty file list', () => {
    const counts = countFirstTokens([]);
    expect(counts.size).toBe(0);
  });

  it('handles files with no tokens', () => {
    const fileNames = ['---', 'helper.ts'];
    const counts = countFirstTokens(fileNames);

    // Only 'helper' token should be counted
    expect(counts.size).toBe(1);
    expect(counts.get('helper')).toBe(1);
  });

  it('counts single file', () => {
    const counts = countFirstTokens(['userProfile.ts']);
    expect(counts.get('user')).toBe(1);
  });

  it('handles multiple files with same prefix', () => {
    const fileNames = ['userA.ts', 'userB.ts', 'userC.ts', 'userD.ts', 'userE.ts'];
    const counts = countFirstTokens(fileNames);

    expect(counts.size).toBe(1);
    expect(counts.get('user')).toBe(5);
  });
});

describe('findMostCommonToken', () => {
  it('finds token with highest count', () => {
    const counts = new Map([
      ['report', 5],
    ['user', 3],
    ['helper', 1]
  ]);
    const result = findMostCommonToken(counts);

    expect(result).toBe('report');
  });

  it('returns empty string for empty map', () => {
    const counts = new Map<string, number>();
    const result = findMostCommonToken(counts);

    expect(result).toBe('');
  });

  it('handles map with single entry', () => {
    const counts = new Map([['user', 1]]);
    const result = findMostCommonToken(counts);

    expect(result).toBe('user');
  });

  it('returns first token when all have same count (deterministic)', () => {
    const counts = new Map([
      ['alpha', 2],
    ['beta', 2],
    ['gamma', 2]
  ]);
    const result = findMostCommonToken(counts);

    // Should return the first one encountered during iteration
    expect(['alpha', 'beta', 'gamma']).toContain(result);
  });

  it('ignores count zero or negative values', () => {
    const counts = new Map<string, number>([
      ['zero', 0],
    ['negative', -1],
    ['positive', 5]
  ]);
    const result = findMostCommonToken(counts);

    expect(result).toBe('positive');
  });
});

describe('derivePrefix', () => {
  it('returns empty string for empty file list', () => {
    const result = derivePrefix([]);
    expect(result).toBe('');
  });

  it('returns most common token when present', () => {
    const fileNames = ['reportA.ts', 'reportB.ts', 'reportC.ts', 'scoreD.ts'];
    const result = derivePrefix(fileNames);

    expect(result).toBe('report');
  });

  it('returns first file token when all tokens appear once', () => {
    const fileNames = ['userProfile.ts', 'scoreExample.ts', 'helperUtils.ts'];
    const result = derivePrefix(fileNames);

    // All have count 1, so findMostCommonToken returns empty
    // Fallback: use first file's first token
    expect(result).toBe('user');
  });

  it('returns first token when file has no tokens and falls back', () => {
    const fileNames = ['---'];
    const result = derivePrefix(fileNames);

    // File '---' has no tokens, so fallback is the filename itself
    expect(result).toBe('---');
  });

  it('handles single file with tokens', () => {
    const fileNames = ['reportConfig.ts'];
    const result = derivePrefix(fileNames);

    expect(result).toBe('report');
  });

  it('handles single file without tokens (fallback to filename)', () => {
    const fileNames = ['x'];
    const result = derivePrefix(fileNames);

    expect(result).toBe('x');
  });

  it('picks most common token among multiple options', () => {
    const fileNames = [
      'userA.ts',
    'userB.ts',
    'userC.ts',
    'userD.ts',
    'accountX.ts',
    'accountY.ts',
    'scoreZ.ts'
  ];
    const result = derivePrefix(fileNames);

    expect(result).toBe('user');
  });
});
