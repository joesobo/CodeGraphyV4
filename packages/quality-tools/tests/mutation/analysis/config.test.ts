import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';

const require = createRequire(import.meta.url);

function readJsonConfig(relativePath: string): { ignorePatterns?: string[] } {
  return JSON.parse(readFileSync(`${REPO_ROOT}/${relativePath}`, 'utf8')) as {
    ignorePatterns?: string[];
  };
}

describe('mutation config ignore patterns', () => {
  it('keeps downloaded VS Code test artifacts out of the shared Stryker sandbox', () => {
    const config = require(`${REPO_ROOT}/stryker.config.cjs`) as { ignorePatterns?: string[] };

    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining([
        '/.vscode-test',
        '/.vscode-test/**',
        '/.stryker-tmp',
        '/.stryker-tmp/**',
      ]),
    );
  });

  it('keeps downloaded VS Code test artifacts out of the extension Stryker sandbox', () => {
    const config = require(`${REPO_ROOT}/packages/extension/stryker.config.cjs`) as { ignorePatterns?: string[] };

    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining([
        '/.vscode-test',
        '/.vscode-test/**',
        '/.stryker-tmp',
        '/.stryker-tmp/**',
      ]),
    );
  });

  it('keeps downloaded VS Code test artifacts out of the quality-tools Stryker sandbox', () => {
    const config = readJsonConfig('packages/quality-tools/stryker.config.json');

    expect(config.ignorePatterns).toEqual(
      expect.arrayContaining([
        '/.vscode-test',
        '/.vscode-test/**',
        '/.stryker-tmp',
        '/.stryker-tmp/**',
      ]),
    );
  });
});
