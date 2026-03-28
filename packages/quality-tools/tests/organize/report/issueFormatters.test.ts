import { describe, expect, it } from 'vitest';
import { formatRedundancyIssues, formatLowInfoIssues, formatBarrelIssues } from '../../../src/organize/report/issueFormatters';
import type { OrganizeFileIssue } from '../../../src/organize/types';

describe('formatRedundancyIssues', () => {
  it('returns undefined for empty list', () => {
    const result = formatRedundancyIssues([]);
    expect(result).toBeUndefined();
  });

  it('formats single redundancy issue', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'types.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const result = formatRedundancyIssues(issues);

    expect(result).toContain('Redundant:');
    expect(result).toContain('types.ts (0.50)');
  });

  it('formats multiple redundancy issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'types.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 },
      { fileName: 'command.ts', kind: 'redundancy', detail: '', redundancyScore: 0.75 }
    ];

    const result = formatRedundancyIssues(issues);

    expect(result).toContain('types.ts (0.50)');
    expect(result).toContain('command.ts (0.75)');
  });

  it('formats redundancy scores with 2 decimal places', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'test.ts', kind: 'redundancy', detail: '', redundancyScore: 0.333333 }
    ];

    const result = formatRedundancyIssues(issues);

    expect(result).toContain('(0.33)');
    expect(result).not.toContain('0.333');
  });

  it('maintains correct label alignment', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file.ts', kind: 'redundancy', detail: '', redundancyScore: 0.5 }
    ];

    const result = formatRedundancyIssues(issues);

    expect(result?.startsWith('  Redundant: ')).toBe(true);
  });

  it('handles undefined redundancyScore gracefully', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'file.ts', kind: 'redundancy', detail: '', redundancyScore: undefined }
    ];

    const result = formatRedundancyIssues(issues);

    expect(result).toContain('file.ts');
  });
});

describe('formatLowInfoIssues', () => {
  it('returns undefined for empty list', () => {
    const result = formatLowInfoIssues([]);
    expect(result).toBeUndefined();
  });

  it('formats low-info banned issue', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'catch-all dumping ground', redundancyScore: undefined }
    ];

    const result = formatLowInfoIssues(issues);

    expect(result).toContain('Low-info:');
    expect(result).toContain('utils.ts');
    expect(result).toContain('banned: catch-all dumping ground');
  });

  it('formats low-info discouraged issue', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'helpers.ts', kind: 'low-info-discouraged', detail: 'generic name', redundancyScore: undefined }
    ];

    const result = formatLowInfoIssues(issues);

    expect(result).toContain('Low-info:');
    expect(result).toContain('helpers.ts');
    expect(result).toContain('discouraged: generic name');
  });

  it('formats mixed banned and discouraged issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'utils.ts', kind: 'low-info-banned', detail: 'banned detail', redundancyScore: undefined },
      { fileName: 'types.ts', kind: 'low-info-discouraged', detail: 'discouraged detail', redundancyScore: undefined }
    ];

    const result = formatLowInfoIssues(issues);

    expect(result).toContain('banned: banned detail');
    expect(result).toContain('discouraged: discouraged detail');
  });

  it('maintains correct label alignment', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'low.ts', kind: 'low-info-banned', detail: 'test', redundancyScore: undefined }
    ];

    const result = formatLowInfoIssues(issues);

    expect(result?.startsWith('  Low-info:  ')).toBe(true);
  });
});

describe('formatBarrelIssues', () => {
  it('returns undefined for empty list', () => {
    const result = formatBarrelIssues([]);
    expect(result).toBeUndefined();
  });

  it('formats single barrel issue', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'index.ts', kind: 'barrel', detail: '5 of 6 statements are re-exports', redundancyScore: undefined }
    ];

    const result = formatBarrelIssues(issues);

    expect(result).toContain('Barrels:');
    expect(result).toContain('index.ts');
    expect(result).toContain('5 of 6 statements are re-exports');
  });

  it('formats multiple barrel issues', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'index.ts', kind: 'barrel', detail: 'test1', redundancyScore: undefined },
      { fileName: 'barrel.ts', kind: 'barrel', detail: 'test2', redundancyScore: undefined }
    ];

    const result = formatBarrelIssues(issues);

    expect(result).toContain('index.ts');
    expect(result).toContain('barrel.ts');
  });

  it('maintains correct label alignment', () => {
    const issues: OrganizeFileIssue[] = [
      { fileName: 'barrel.ts', kind: 'barrel', detail: 'test', redundancyScore: undefined }
    ];

    const result = formatBarrelIssues(issues);

    expect(result?.startsWith('  Barrels:   ')).toBe(true);
  });
});
