import { describe, expect, it } from 'vitest';
import { fileIssueLines } from '../../../src/organize/report/fileIssues';
import type { OrganizeFileIssue } from '../../../src/organize/organizeTypes';

describe('fileIssueLines', () => {
  it('returns empty array when no issues', () => {
    const lines = fileIssueLines([]);
    expect(lines).toEqual([]);
  });

  it('formats redundancy issues correctly', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'scrapTypes.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'runScrapCli.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const lines = fileIssueLines(issues);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Redundant:');
    expect(lines[0]).toContain('scrapTypes.ts (0.50)');
    expect(lines[0]).toContain('runScrapCli.ts (0.50)');
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
      { fileName: 'scrapTypes.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
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
});
