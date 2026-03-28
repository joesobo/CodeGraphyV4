import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { readCoverageReport } from '../../../src/crap/coverage/read';

describe('readCoverageReport', () => {
  it('reads a coverage JSON file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'quality-tools-coverage-'));
    const reportPath = join(directory, 'coverage-final.json');
    writeFileSync(reportPath, JSON.stringify({ '/repo/file.ts': { path: '/repo/file.ts', s: {}, statementMap: {} } }));

    expect(readCoverageReport(reportPath)).toHaveProperty('/repo/file.ts');
  });

  it('throws when the coverage file is missing', () => {
    expect(() => readCoverageReport('/missing/coverage-final.json')).toThrow('Coverage data not found');
  });
});
