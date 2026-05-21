import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';
import { readReusableMutationReport } from '../../../src/mutation/runner/incrementalCache';
import { type QualityTarget } from '../../../src/shared/resolve/target';

function fileTarget(repoRoot: string): QualityTarget {
  return {
    absolutePath: join(repoRoot, 'packages/extension/src/webview/vscodeApi.ts'),
    kind: 'file',
    packageName: 'extension',
    packageRelativePath: 'src/webview/vscodeApi.ts',
    packageRoot: join(repoRoot, 'packages/extension'),
    relativePath: 'packages/extension/src/webview/vscodeApi.ts',
  };
}

function writeFixtureReport(repoRoot: string, reportPath: string, source = 'export const value = 1;'): void {
  mkdirSync(join(repoRoot, 'packages/extension/src/webview'), { recursive: true });
  mkdirSync(join(repoRoot, 'packages/extension/tests/webview'), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(join(repoRoot, 'packages/extension/src/webview/vscodeApi.ts'), source);
  writeFileSync(join(repoRoot, 'packages/extension/tests/webview/vscodeApi.test.ts'), 'expect(value).toBe(1);');
  writeFileSync(
    reportPath,
    JSON.stringify({
      files: {
        'packages/extension/src/webview/vscodeApi.ts': {
          source,
          mutants: [
            { status: 'Killed' },
            { status: 'Survived' },
            { status: 'Timeout' },
          ],
        },
      },
      testFiles: {
        'packages/extension/tests/webview/vscodeApi.test.ts': {
          source: 'expect(value).toBe(1);',
        },
      },
    }),
  );
}

describe('incremental mutation cache', () => {
  it('reuses a file report when source and test file contents still match', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-cache-'));
    const reportPath = join(repoRoot, 'reports/mutation/file/stryker-incremental-file.json');
    writeFixtureReport(repoRoot, reportPath);

    expect(readReusableMutationReport(repoRoot, fileTarget(repoRoot), reportPath, [
      'packages/extension/tests/webview/vscodeApi.test.ts',
    ])).toEqual({
      mutantCount: 3,
      mutationScore: (2 / 3) * 100,
    });
  });

  it('does not reuse the report when the source file changed', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-cache-source-'));
    const reportPath = join(repoRoot, 'reports/mutation/file/stryker-incremental-file.json');
    writeFixtureReport(repoRoot, reportPath);
    writeFileSync(join(repoRoot, 'packages/extension/src/webview/vscodeApi.ts'), 'export const value = 2;');

    expect(readReusableMutationReport(repoRoot, fileTarget(repoRoot), reportPath, [
      'packages/extension/tests/webview/vscodeApi.test.ts',
    ])).toBeUndefined();
  });

  it('does not reuse the report when a cached test file changed', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-cache-tests-'));
    const reportPath = join(repoRoot, 'reports/mutation/file/stryker-incremental-file.json');
    writeFixtureReport(repoRoot, reportPath);
    writeFileSync(join(repoRoot, 'packages/extension/tests/webview/vscodeApi.test.ts'), 'expect(value).toBe(2);');

    expect(readReusableMutationReport(repoRoot, fileTarget(repoRoot), reportPath, [
      'packages/extension/tests/webview/vscodeApi.test.ts',
    ])).toBeUndefined();
  });

  it('does not reuse the report when a new test file now matches the scoped patterns', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-cache-new-test-'));
    const reportPath = join(repoRoot, 'reports/mutation/file/stryker-incremental-file.json');
    writeFixtureReport(repoRoot, reportPath);
    writeFileSync(join(repoRoot, 'packages/extension/tests/webview/vscodeApi.extra.test.ts'), 'expect(value).toBe(1);');

    expect(readReusableMutationReport(repoRoot, fileTarget(repoRoot), reportPath, [
      'packages/extension/tests/webview/vscodeApi*.test.ts',
    ])).toBeUndefined();
  });
});
