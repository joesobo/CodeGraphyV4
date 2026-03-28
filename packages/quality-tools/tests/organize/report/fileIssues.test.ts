import { describe, expect, it } from 'vitest';
import { fileIssueLines } from '../../../src/organize/report/fileIssues';
import type { OrganizeFileIssue } from '../../../src/organize/types';

describe('fileIssueLines', () => {
  it('returns empty array when no issues', () => {
    const lines = fileIssueLines([]);
    expect(lines).toEqual([]);
  });

  it('formats redundancy issues correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'types.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'command.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Redundant:');
    expect(lines[0]).toContain('types.ts (0.50)');
    expect(lines[0]).toContain('command.ts (0.50)');
  });

  it('formats low-info banned issues correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'catch-all dumping ground', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Low-info:');
    expect(lines[0]).toContain('utils.ts');
    expect(lines[0]).toContain('banned: catch-all dumping ground');
  });

  it('formats low-info discouraged issues correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'helpers.ts', kind: 'low-info-discouraged', detail: 'generic name', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Low-info:');
    expect(lines[0]).toContain('helpers.ts');
    expect(lines[0]).toContain('discouraged: generic name');
  });

  it('formats barrel issues correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'index.ts', kind: 'barrel', detail: '5 of 6 statements are re-exports', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Barrels:');
    expect(lines[0]).toContain('index.ts');
    expect(lines[0]).toContain('5 of 6 statements are re-exports');
  });

  it('formats mixed issues with all kinds', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'types.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'catch-all', redundancyScore: undefined },
      { fileName: 'index.ts', kind: 'barrel', detail: '5 of 6 exports', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Redundant:');
    expect(lines[1]).toContain('Low-info:');
    expect(lines[2]).toContain('Barrels:');
  });

  it('groups redundancy issues on same line', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file1.ts', kind: 'redundancy', detail: '', redundancyScore: 0.45 },
      { fileName: 'file2.ts', kind: 'redundancy', detail: '', redundancyScore: 0.60 },
      { fileName: 'file3.ts', kind: 'redundancy', detail: '', redundancyScore: 0.35 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('file1.ts');
    expect(lines[0]).toContain('file2.ts');
    expect(lines[0]).toContain('file3.ts');
  });

  it('combines low-info banned and discouraged on same Low-info line', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'banned.ts', kind: 'low-info-banned', detail: 'catch-all', redundancyScore: undefined },
      { fileName: 'discouraged.ts', kind: 'low-info-discouraged', detail: 'generic', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Low-info:');
    expect(lines[0]).toContain('banned.ts');
    expect(lines[0]).toContain('discouraged.ts');
  });

  it('formats redundancy scores with 2 decimal places', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'test.ts', kind: 'redundancy', detail: '', redundancyScore: 0.333333 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines[0]).toContain('(0.33)');
    expect(lines[0]).not.toContain('0.333');
  });

  it('omits groups with no issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('Low-info');
    expect(lines[0]).not.toContain('Barrels');
  });

  it('maintains correct label alignment for all issue types', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'red.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'low.ts', kind: 'low-info-banned', detail: 'test', redundancyScore: undefined },
      { fileName: 'barrel.ts', kind: 'barrel', detail: 'test', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    // Find where the first file name starts in each line
    const redundantFileStart = lines[0].indexOf('red.ts');
    const lowInfoFileStart = lines[1].indexOf('low.ts');
    const barrelFileStart = lines[2].indexOf('barrel.ts');

    // All file names should start at same position for alignment
    expect(redundantFileStart).toBe(lowInfoFileStart);
    expect(lowInfoFileStart).toBe(barrelFileStart);
  });

  it('returns truly empty array when issues array is empty', () => {
    const lines = fileIssueLines([]);
    expect(lines).toEqual([]);
    expect(lines.length).toBe(0);
  });

  it('handles redundancyScore being undefined correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'test.ts', kind: 'redundancy', detail: '', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);
    // Should not crash when redundancyScore is undefined
    expect(lines.length).toBeGreaterThan(0);
  });

  it('formats redundancy issue with score when defined', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file.ts', kind: 'redundancy', detail: '', redundancyScore: 0.75 }
    ];

    const lines = fileIssueLines(issues);
    expect(lines[0]).toContain('file.ts (0.75)');
  });

  it('includes exact detail string for low-info banned issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'Exact detailed message here', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);
    expect(lines[0]).toContain('Exact detailed message here');
  });

  it('includes exact detail string for low-info discouraged issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'types.ts', kind: 'low-info-discouraged', detail: 'Another detailed message', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);
    expect(lines[0]).toContain('Another detailed message');
  });

  it('includes exact detail string for barrel issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'index.ts', kind: 'barrel', detail: 'Exact barrel detail text', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);
    expect(lines[0]).toContain('Exact barrel detail text');
  });

  it('produces correct label strings for each issue type', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'red.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'low.ts', kind: 'low-info-banned', detail: 'test', redundancyScore: undefined },
      { fileName: 'barrel.ts', kind: 'barrel', detail: 'test', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines[0]).toContain('Redundant:');
    expect(lines[1]).toContain('Low-info:');
    expect(lines[2]).toContain('Barrels:');
  });

  it('handles single redundancy issue correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'single.ts', kind: 'redundancy', detail: '', redundancyScore: 0.45 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Redundant:');
    expect(lines[0]).toContain('single.ts (0.45)');
  });

  it('handles single low-info issue correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'single.ts', kind: 'low-info-banned', detail: 'detail text', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Low-info:');
    expect(lines[0]).toContain('single.ts (banned: detail text)');
  });

  it('handles single barrel issue correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'barrel.ts', kind: 'barrel', detail: 'barrel detail', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Barrels:');
    expect(lines[0]).toContain('barrel.ts (barrel detail)');
  });

  it('distinguishes between banned and discouraged in low-info issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'banned detail', redundancyScore: undefined },
      { fileName: 'types.ts', kind: 'low-info-discouraged', detail: 'discouraged detail', redundancyScore: undefined }
    ];

    const lines = fileIssueLines(issues);

    expect(lines[0]).toContain('banned: banned detail');
    expect(lines[0]).toContain('discouraged: discouraged detail');
  });

  it('handles redundancy scores with various precision levels', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'high.ts', kind: 'redundancy', detail: '', redundancyScore: 0.9 },
      { fileName: 'low.ts', kind: 'redundancy', detail: '', redundancyScore: 0.05 },
      { fileName: 'mid.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines[0]).toContain('(0.90)');
    expect(lines[0]).toContain('(0.05)');
    expect(lines[0]).toContain('(0.50)');
  });

  it('returns empty array when issues list is falsy empty', () => {
    expect(fileIssueLines([])).toEqual([]);
  });

  it('produces single line output for each issue category', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file1.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'file2.ts', kind: 'redundancy', detail: '', redundancyScore: 0.6 }
    ];

    const lines = fileIssueLines(issues);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('file1.ts');
    expect(lines[0]).toContain('file2.ts');
  });

  describe('mutation killers for fileIssues.ts', () => {
    it('kills mutation: early return when issues.length === 0', () => {
      // Must verify that empty array returns empty, not undefined
      const lines = fileIssueLines([]);
      expect(lines).toEqual([]);
      expect(Array.isArray(lines)).toBe(true);
    });

    it('kills mutation: filter condition redundancyIssues must check === redundancy', () => {
      // Verify redundancy issues are correctly filtered
      const issues: OrganizeFileIssue[] = [
        { fileName: 'red.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
        { fileName: 'low.ts', kind: 'low-info-banned', detail: 'test', redundancyScore: undefined }
      ];

      const lines = fileIssueLines(issues);
      // Should have both redundancy and low-info output (2 lines)
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('Redundant:');
      expect(lines[1]).toContain('Low-info:');
    });

    it('kills mutation: low-info string at line 30 must be exact', () => {
      // Verify the exact Low-info label and spacing
      const issues: OrganizeFileIssue[] = [
        { fileName: 'low.ts', kind: 'low-info-banned', detail: 'test', redundancyScore: undefined }
      ];

      const lines = fileIssueLines(issues);
      expect(lines[0]).toContain('Low-info:');
    });

    it('kills mutation: Barrels string at line 38 must be exact', () => {
      // Verify the exact Barrels label and spacing
      const issues: OrganizeFileIssue[] = [
        { fileName: 'barrel.ts', kind: 'barrel', detail: 'test', redundancyScore: undefined }
      ];

      const lines = fileIssueLines(issues);
      expect(lines[0]).toContain('Barrels:');
    });

    it('kills mutation: redundancy push at line 19 must be executed', () => {
      // Verify that redundancy issues are actually pushed to lines array
      const issues: OrganizeFileIssue[] = [
        { fileName: 'file.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
      ];

      const lines = fileIssueLines(issues);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines[0]).toContain('Redundant:');
    });
  });
});
