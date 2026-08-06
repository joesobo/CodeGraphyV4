import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { pruneDeployedRuntime } from '../scripts/prune-sidecar-runtime.mjs';

const temporaryDirectories: string[] = [];

function temporaryRuntime(): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-prune-'));
  temporaryDirectories.push(directory);
  return directory;
}

function fixtureFile(root: string, relativePath: string): void {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, relativePath);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('pruneDeployedRuntime', () => {
  it('keeps runtime code, licenses, and only the target native prebuild', () => {
    const runtime = temporaryRuntime();
    fixtureFile(runtime, 'package/index.js');
    fixtureFile(runtime, 'package/LICENSE');
    fixtureFile(runtime, 'package/README.md');
    fixtureFile(runtime, 'package/src/parser.c');
    fixtureFile(runtime, 'package/prebuilds/darwin-arm64/parser.node');
    fixtureFile(runtime, 'package/prebuilds/darwin-x64/parser.node');
    fixtureFile(runtime, 'package/prebuilds/linux-arm64/parser.node');
    fixtureFile(runtime, 'node_modules/tree-sitter-cli/cli.js');

    pruneDeployedRuntime(runtime, 'aarch64-apple-darwin');

    expect(existsSync(path.join(runtime, 'package/index.js'))).toBe(true);
    expect(existsSync(path.join(runtime, 'package/LICENSE'))).toBe(true);
    expect(existsSync(path.join(runtime, 'package/README.md'))).toBe(false);
    expect(existsSync(path.join(runtime, 'package/src'))).toBe(false);
    expect(existsSync(path.join(runtime, 'package/prebuilds/darwin-arm64/parser.node'))).toBe(true);
    expect(existsSync(path.join(runtime, 'package/prebuilds/darwin-x64'))).toBe(false);
    expect(existsSync(path.join(runtime, 'package/prebuilds/linux-arm64'))).toBe(false);
    expect(existsSync(path.join(runtime, 'node_modules/tree-sitter-cli'))).toBe(false);
  });
});
