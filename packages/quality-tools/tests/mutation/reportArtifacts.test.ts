import { existsSync, mkdirSync, writeFileSync, readFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  copySharedMutationReports,
  incrementalReportPath,
  reportDirectory
} from '../../src/mutation/reportArtifacts';

describe('mutation report artifacts', () => {
  it('builds stable report paths', () => {
    expect(reportDirectory('quality-tools')).toBe('reports/mutation/quality-tools');
    expect(incrementalReportPath('quality-tools')).toBe(
      'reports/mutation/quality-tools/stryker-incremental-quality-tools.json'
    );
  });

  it('copies shared reports into the package-specific directory', () => {
    const directory = mkdtempSync(join(tmpdir(), 'quality-tools-artifacts-'));
    mkdirSync(join(directory, 'reports/mutation'), { recursive: true });
    writeFileSync(join(directory, 'reports/mutation/mutation.json'), '{"ok":true}');
    writeFileSync(join(directory, 'reports/mutation/mutation.html'), '<html />');

    const reportPath = copySharedMutationReports('quality-tools', directory);
    expect(JSON.parse(readFileSync(reportPath, 'utf-8'))).toEqual({ ok: true });
    expect(readFileSync(join(directory, 'reports/mutation/quality-tools/mutation.html'), 'utf-8')).toBe('<html />');
  });

  it('creates the target directory recursively and skips missing shared artifacts', () => {
    const directory = mkdtempSync(join(tmpdir(), 'quality-tools-artifacts-empty-'));
    mkdirSync(join(directory, 'reports/mutation'), { recursive: true });

    const reportPath = copySharedMutationReports('quality-tools/nested', directory);

    expect(reportPath).toBe(join(directory, 'reports/mutation/quality-tools/nested/mutation.json'));
    expect(existsSync(reportPath)).toBe(false);
    expect(existsSync(join(directory, 'reports/mutation/quality-tools/nested/mutation.html'))).toBe(false);
  });
});
