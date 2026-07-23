import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const workspaceRoot = path.resolve(import.meta.dirname, '../../../../..');

describe('Tree-sitter language loading diagnostics', () => {
  it('loads the Lua binding without Node deprecation warnings', () => {
    const result: SpawnSyncReturns<string> = spawnSync(
      process.execPath,
      [
        '--trace-deprecation',
        '--import',
        'tsx',
        '--input-type=module',
        '--eval',
        [
          "import('./packages/core/src/treeSitter/runtime/languages/load.ts')",
          ".then(async ({ loadTreeSitterLanguageBinding }) => {",
          "  const binding = await loadTreeSitterLanguageBinding('lua');",
          '  if (!binding) process.exitCode = 1;',
          '});',
        ].join('\n'),
      ],
      {
        cwd: workspaceRoot,
        encoding: 'utf8',
      },
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).not.toContain('[DEP0151]');
  });
});
