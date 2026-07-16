import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'packages', 'graph-renderer');

function packGraphRenderer(destination) {
  execFileSync('pnpm', ['--filter', '@codegraphy-dev/graph-renderer', 'run', 'build'], {
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

test('published graph renderer loads and instantiates its packaged WASM physics', async () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-graph-renderer-package-'));
  const unpackedPackage = packGraphRenderer(destination);
  const entryFile = path.join(unpackedPackage, 'dist', 'index.js');
  const expectedAsset = path.join(unpackedPackage, 'dist', 'generated', 'physics.wasm');
  const originalFetch = globalThis.fetch;
  let requestedAsset;

  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input : new URL(String(input));
    requestedAsset = fileURLToPath(url);
    try {
      return new Response(fs.readFileSync(requestedAsset), {
        headers: { 'content-type': 'application/wasm' },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  };

  try {
    const renderer = await import(`${pathToFileURL(entryFile).href}?package-test=${Date.now()}`);
    await renderer.prepareGraphPhysics();
    const engine = renderer.createGraphLayoutEngine({
      nodeIds: ['published-node'],
      radii: Float32Array.of(8),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    assert.equal(fs.realpathSync(requestedAsset), fs.realpathSync(expectedAsset));
    assert.deepEqual(engine.nodeIds, ['published-node']);
    assert.ok(Number.isFinite(engine.x[0]));
    assert.ok(Number.isFinite(engine.y[0]));
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(destination, { force: true, recursive: true });
  }
}, { timeout: 30_000 });
