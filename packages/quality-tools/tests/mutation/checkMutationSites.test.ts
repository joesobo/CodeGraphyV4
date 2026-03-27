import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  findMutationSiteViolations,
  reportMutationSiteViolations
} from '../../src/mutation/checkMutationSites';

function writeReport(mutantCounts: Record<string, number | undefined>): string {
  const directory = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-sites-'));
  const reportPath = join(directory, 'mutation.json');
  const files = Object.fromEntries(
    Object.entries(mutantCounts).map(([file, count]) => [
      file,
      count === undefined
        ? {}
        : { mutants: Array.from({ length: count }, (_, index) => ({ id: String(index) })) }
    ])
  );
  writeFileSync(reportPath, JSON.stringify({ files }));
  return reportPath;
}

describe('mutation site reporting', () => {
  it('returns sorted site violations above the threshold and treats missing mutants as zero', () => {
    const reportPath = writeReport({
      'a.ts': 20,
      'b.ts': 60,
      'c.ts': 51,
      'd.ts': 50,
      'e.ts': undefined,
      'f.ts': 90
    });

    expect(findMutationSiteViolations(reportPath)).toEqual([
      { count: 90, file: 'f.ts' },
      { count: 60, file: 'b.ts' },
      { count: 51, file: 'c.ts' }
    ]);
  });

  it('prints a success message when no violations are present', () => {
    const reportPath = writeReport({ 'a.ts': 10 });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reportMutationSiteViolations(reportPath);
    expect(log).toHaveBeenCalledWith('\n✅ All files are within the mutation site threshold (50).\n');
    log.mockRestore();
  });

  it('prints the failure summary in descending order', () => {
    const reportPath = writeReport({ 'a.ts': 80, 'b.ts': 55, 'c.ts': 65 });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    reportMutationSiteViolations(reportPath);

    expect(log.mock.calls.map(([message]) => message)).toEqual([
      '\n⚠️  MUTATION SITE THRESHOLD EXCEEDED (max: 50)',
      '━'.repeat(60),
      'The following files have too many mutation sites, indicating',
      'high complexity. Consider splitting them into smaller modules.\n',
      '  80 mutation sites  →  a.ts',
      '  65 mutation sites  →  c.ts',
      '  55 mutation sites  →  b.ts',
      `\n${'━'.repeat(60)}`,
      '3 file(s) exceed the threshold of 50 mutation sites.\n'
    ]);
    log.mockRestore();
  });
});
