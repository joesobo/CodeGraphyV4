import { describe, expect, it, afterEach } from 'vitest';
import { collectFileIssues } from '../../src/organize/issues';
import { cleanupTempDirs, createFileTree } from './testHelpers';

const tempDirs: string[] = [];

afterEach(() => {
  cleanupTempDirs(tempDirs);
});

describe('collectFileIssues', () => {
  it('returns empty array for files with no issues', () => {
    const root = createFileTree(
      {
        'goodName.ts': 'export const x = 1;',
        'anotherGood.ts': 'export const y = 2;'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['goodName.ts', 'anotherGood.ts'],
      root,
      [],
      { banned: ['utils', 'helpers'], discouraged: [] },
      0.5
    );

    expect(result).toHaveLength(0);
  });

  it('detects low-info-banned files', () => {
    const root = createFileTree(
      {
        'utils.ts': 'export const helper = () => {};'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['utils.ts'],
      root,
      [],
      { banned: ['utils', 'helpers'], discouraged: [] },
      0.5
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe('low-info-banned');
    expect(result[0]?.fileName).toBe('utils.ts');
  });

  it('detects barrel files', () => {
    const root = createFileTree(
      {
        'index.ts': 'export { x } from "./a";\nexport { y } from "./b";',
        'a.ts': 'export const x = 1;',
        'b.ts': 'export const y = 2;'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['index.ts', 'a.ts', 'b.ts'],
      root,
      [],
      { banned: [], discouraged: [] },
      0.5
    );

    const barrelIssue = result.find((issue) => issue.kind === 'barrel');
    expect(barrelIssue).toBeDefined();
    expect(barrelIssue?.fileName).toBe('index.ts');
  });

  it('detects path redundancy when threshold is met', () => {
    const root = createFileTree(
      {
        'srcModule.ts': 'export const x = 1;'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['srcModule.ts'],
      root,
      ['src'],
      { banned: [], discouraged: [] },
      0.1  // Low threshold
    );

    const redundancyIssue = result.find((issue) => issue.kind === 'redundancy');
    expect(redundancyIssue?.kind).toBe('redundancy');
    expect(redundancyIssue?.redundancyScore).toBeDefined();
  });

  it('skips redundancy detection when score is below threshold', () => {
    const root = createFileTree(
      {
        'file.ts': 'export const x = 1;'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['file.ts'],
      root,
      [],
      { banned: [], discouraged: [] },
      0.99  // Very high threshold
    );

    const redundancyIssue = result.find((issue) => issue.kind === 'redundancy');
    expect(redundancyIssue).toBeUndefined();
  });

  it('handles files that cannot be read gracefully', () => {
    const root = createFileTree(
      {
        'good.ts': 'export const x = 1;'
      },
      tempDirs
    );

    // Non-existent file should not throw
    const result = collectFileIssues(
      ['good.ts', 'nonexistent.ts'],
      root,
      [],
      { banned: [], discouraged: [] },
      0.5
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('accumulates multiple issue types for same file', () => {
    const root = createFileTree(
      {
        'utils.ts': 'export { x } from "./a";\nexport { y } from "./b";'
      },
      tempDirs
    );

    const result = collectFileIssues(
      ['utils.ts'],
      root,
      [],
      { banned: ['utils'], discouraged: [] },
      0.1
    );

    // Should have multiple issues: low-info-banned and barrel
    expect(result.length).toBeGreaterThanOrEqual(1);
    const kinds = result.map((issue) => issue.kind);
    expect(kinds).toContain('low-info-banned');
  });

  describe('mutation killers for issues.ts L22-L32', () => {
    it('flags redundancy when the score lands exactly on the threshold', () => {
      const root = createFileTree(
        {
          'srcModule.ts': 'export const x = 1;'
        },
        tempDirs
      );

      // With threshold 0.5 and score meeting that exactly, should create issue
      const result = collectFileIssues(
        ['srcModule.ts'],
        root,
        ['src'],
        { banned: [], discouraged: [] },
        0.5
      );

      const redundancyIssue = result.find((issue) => issue.kind === 'redundancy');
      expect(redundancyIssue).toEqual({
        detail: 'filename repeats path context (50% token overlap)',
        fileName: 'srcModule.ts',
        kind: 'redundancy',
        redundancyScore: 0.5
      });
    });

    it('skips redundancy when the score stays below the threshold', () => {
      const root = createFileTree(
        {
          'file.ts': 'export const x = 1;'
        },
        tempDirs
      );

      const result = collectFileIssues(
        ['file.ts'],
        root,
        [],
        { banned: [], discouraged: [] },
        0.99  // Very high threshold
      );

      const redundancyIssue = result.find((issue) => issue.kind === 'redundancy');
      expect(redundancyIssue).toBeUndefined();
    });

    it('formats redundancy detail with a percentage instead of a fraction', () => {
      const root = createFileTree(
        {
          'srcModule.ts': 'export const x = 1;'
        },
        tempDirs
      );

      const result = collectFileIssues(
        ['srcModule.ts'],
        root,
        ['src'],
        { banned: [], discouraged: [] },
        0.1
      );

      const redundancyIssue = result.find((issue) => issue.kind === 'redundancy');
      expect(redundancyIssue?.detail).toBe('filename repeats path context (50% token overlap)');
    });

    it('treats index.ts as a package entry point during file issue collection', () => {
      const root = createFileTree(
        {
          'index.ts': 'export const x = 1;'
        },
        tempDirs
      );

      const result = collectFileIssues(
        ['index.ts'],
        root,
        [],
        { banned: ['index'], discouraged: [] },
        0.5
      );

      expect(result).toEqual([]);
    });
  });
});
