import { describe, expect, it } from 'vitest';
import { buildMutationArgsForTest } from '../../src/mutation/runMutation';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import type { QualityTarget } from '../../src/shared/resolveTarget';

describe('buildMutationArgsForTest', () => {
  it('uses unified mutation globs for a full extension run', () => {
    const args = buildMutationArgsForTest(resolveQualityTarget(REPO_ROOT, 'extension/'));
    expect(args[0]).toBe('run');
    expect(args[1]).toBe('stryker.config.json');
    expect(args[3]).toBe('reports/mutation/extension/stryker-incremental-extension.json');
    expect(args).toContain('-m');
    expect(args.join(' ')).toContain('packages/extension/src/**/*.ts');
    expect(args.join(' ')).toContain('!packages/extension/src/**/webview/storeMessageTypes.ts');
  });

  it('uses unified mutation globs for a full quality-tools run', () => {
    const args = buildMutationArgsForTest(resolveQualityTarget(REPO_ROOT, 'quality-tools/'));
    expect(args[0]).toBe('run');
    expect(args[1]).toBe('packages/quality-tools/stryker.config.json');
    expect(args[3]).toBe('reports/mutation/quality-tools/stryker-incremental-quality-tools.json');
    expect(args).toContain('-m');
    expect(args.join(' ')).toContain('packages/quality-tools/src/**/*.ts');
    expect(args.join(' ')).toContain('!packages/quality-tools/src/cli/**/*.ts');
  });

  it('scopes sub-file runs with explicit mutate globs and sanitized report keys', () => {
    const args = buildMutationArgsForTest({
      absolutePath: `${REPO_ROOT}/packages/quality-tools/src/mutation/Weird File.TS`,
      kind: 'file',
      packageName: 'quality-tools',
      packageRelativePath: 'src/mutation/Weird File.TS',
      packageRoot: `${REPO_ROOT}/packages/quality-tools`,
      relativePath: 'packages/quality-tools/src/mutation/Weird File.TS'
    } satisfies QualityTarget);

    expect(args[0]).toBe('run');
    expect(args[3]).toBe(
      'reports/mutation/packages-quality-tools-src-mutation-weird-file.ts/stryker-incremental-packages-quality-tools-src-mutation-weird-file.ts.json'
    );
    expect(args).toContain('-m');
    expect(args.join(' ')).toContain('packages/quality-tools/src/mutation/Weird File.TS');
    expect(args.join(' ')).toContain('!packages/quality-tools/src/cli/**/*.ts');
  });
});
