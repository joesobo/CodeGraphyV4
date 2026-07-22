import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'packages', 'tldraw');

function packTldraw(destination) {
  execFileSync('pnpm', [
    'exec',
    'turbo',
    'run',
    'build',
    '--filter=@codegraphy-dev/tldraw...',
  ], {
    cwd: repoRoot,
    stdio: 'pipe',
  });
  const output = execFileSync('pnpm', ['pack', '--pack-destination', destination], {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const tarball = output.split(/\r?\n/u).at(-1);
  assert.ok(tarball, 'pnpm pack must report the generated tarball');
  execFileSync('tar', ['-xzf', tarball, '-C', destination]);
  return path.join(destination, 'package');
}

test('published tldraw package contains its launcher, force panel, and embedded physics script', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-tldraw-package-'));
  try {
    const unpackedPackage = packTldraw(destination);
    const manifest = JSON.parse(fs.readFileSync(
      path.join(unpackedPackage, 'package.json'),
      'utf8',
    ));
    const documentScript = fs.readFileSync(
      path.join(unpackedPackage, 'dist', 'script', 'main.js'),
      'utf8',
    );
    const documentConfig = fs.readFileSync(
      path.join(unpackedPackage, 'dist', 'script', 'config.js'),
      'utf8',
    );

    assert.equal(manifest.bin['codegraphy-tldraw'], './bin/codegraphy-tldraw.js');
    assert.deepEqual(manifest.os, ['darwin']);
    assert.ok(fs.existsSync(path.join(unpackedPackage, 'dist', 'index.js')));
    assert.ok(documentScript.length > 40_000);
    assert.match(documentScript, /AGFzb/u);
    assert.match(documentConfig, /CodeGraphy forces/u);
    assert.match(documentConfig, /Repel Force/u);
    assert.doesNotMatch(documentScript, /Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=/u);
    assert.doesNotMatch(documentScript, /navigator\.gpu|GPUDevice|GPUCanvasContext/u);
    assert.equal(fs.existsSync(path.join(unpackedPackage, 'dist', 'core')), false);
  } finally {
    fs.rmSync(destination, { force: true, recursive: true });
  }
}, { timeout: 30_000 });
