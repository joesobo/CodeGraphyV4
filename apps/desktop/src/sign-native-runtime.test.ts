import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findNativeRuntimeCode } from '../scripts/sign-native-runtime.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function fixture(root: string, relativePath: string): void {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, relativePath);
}

describe('findNativeRuntimeCode', () => {
  it('selects every nested macOS library without selecting JavaScript', () => {
    const runtime = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-native-runtime-'));
    temporaryDirectories.push(runtime);
    fixture(runtime, 'tree-sitter/prebuilds/darwin-arm64/parser.node');
    fixture(runtime, 'libsql/lib/libsql.dylib');
    fixture(runtime, 'core/dist/index.js');

    expect(findNativeRuntimeCode(runtime)).toEqual([
      path.join(runtime, 'libsql/lib/libsql.dylib'),
      path.join(runtime, 'tree-sitter/prebuilds/darwin-arm64/parser.node'),
    ]);
  });
});
