import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  identifyNativeBinary,
  validateVsixNativeArtifacts,
} from '../../scripts/validate-vsix-native-artifacts.mjs';

test('identifies Linux x64 native binaries from ELF headers', () => {
  const binary = Buffer.alloc(20);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 0);
  binary.writeUInt16LE(0x3e, 18);

  assert.equal(identifyNativeBinary(binary), 'ELF x86-64');
});

test('identifies macOS Apple Silicon native binaries from Mach-O headers', () => {
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(0xfeedfacf, 0);
  binary.writeInt32LE(0x0100000c, 4);

  assert.equal(identifyNativeBinary(binary), 'Mach-O arm64');
});

test('identifies Windows x64 native binaries from PE headers', () => {
  const binary = Buffer.alloc(160);
  binary.write('MZ', 0, 'ascii');
  binary.writeUInt32LE(0x80, 0x3c);
  binary.write('PE\0\0', 0x80, 'ascii');
  binary.writeUInt16LE(0x8664, 0x84);
  binary.writeUInt16LE(0x20b, 0x98);

  assert.equal(identifyNativeBinary(binary), 'PE32+ x86-64');
});

test('rejects a linux x64 VSIX with a macOS Apple Silicon Tree-sitter binding', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-native-artifacts-'));
  const artifactsDir = path.join(tempDir, 'artifacts');
  const version = '5.8.0';

  writeVsixFixture({
    artifactsDir,
    version,
    target: 'linux-x64',
    sqliteBinary: createElfX64Binary(),
    treeSitterBinary: createMachOArm64Binary(),
  });
  writeVsixFixture({
    artifactsDir,
    version,
    target: 'darwin-arm64',
    sqliteBinary: createMachOArm64Binary(),
    treeSitterBinary: createMachOArm64Binary(),
  });
  writeVsixFixture({
    artifactsDir,
    version,
    target: 'win32-x64',
    sqliteBinary: createPe32PlusX64Binary(),
    treeSitterBinary: createPe32PlusX64Binary(),
  });

  assert.throws(
    () => validateVsixNativeArtifacts({ artifactsDir, version }),
    /linux-x64\.vsix contains Mach-O arm64 at extension\/dist\/node_modules\/tree-sitter\/build\/Release\/tree_sitter_runtime_binding\.node; expected ELF x86-64\./,
  );
});

test('validates only the requested VSIX artifact targets', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-native-artifacts-target-'));
  const artifactsDir = path.join(tempDir, 'artifacts');
  const version = '5.8.0';

  writeVsixFixture({
    artifactsDir,
    version,
    target: 'linux-x64',
    sqliteBinary: createElfX64Binary(),
    treeSitterBinary: createElfX64Binary(),
  });

  assert.doesNotThrow(
    () => validateVsixNativeArtifacts({ artifactsDir, version, targets: ['linux-x64'] }),
  );
});

function writeVsixFixture({
  artifactsDir,
  version,
  target,
  sqliteBinary,
  treeSitterBinary,
}) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), `codegraphy-vsix-${target}-`));
  writeFixtureBinary(
    fixtureRoot,
    'extension/dist/node_modules/better-sqlite3/build/Release/better_sqlite3.node',
    sqliteBinary,
  );
  writeFixtureBinary(
    fixtureRoot,
    'extension/dist/node_modules/tree-sitter/build/Release/tree_sitter_runtime_binding.node',
    treeSitterBinary,
  );

  mkdirSync(artifactsDir, { recursive: true });
  const vsixPath = path.join(artifactsDir, `codegraphy.codegraphy-${version}-${target}.vsix`);
  const zipResult = spawnSync('zip', ['-qr', vsixPath, 'extension'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });

  if (zipResult.status !== 0) {
    throw new Error(`Unable to create VSIX fixture for ${target}.\n${zipResult.stderr}`);
  }
}

function writeFixtureBinary(rootDir, relativePath, binary) {
  const filePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, binary);
}

function createElfX64Binary() {
  const binary = Buffer.alloc(20);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 0);
  binary.writeUInt16LE(0x3e, 18);
  return binary;
}

function createMachOArm64Binary() {
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(0xfeedfacf, 0);
  binary.writeInt32LE(0x0100000c, 4);
  return binary;
}

function createPe32PlusX64Binary() {
  const binary = Buffer.alloc(160);
  binary.write('MZ', 0, 'ascii');
  binary.writeUInt32LE(0x80, 0x3c);
  binary.write('PE\0\0', 0x80, 'ascii');
  binary.writeUInt16LE(0x8664, 0x84);
  binary.writeUInt16LE(0x20b, 0x98);
  return binary;
}
