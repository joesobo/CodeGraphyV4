import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pruneDeployedRuntime } from './prune-sidecar-runtime.mjs';
import {
  bundledNodeVersion,
  nativeRuntimeModules,
  nodeArchiveChecksums,
} from './runtime-contract.mjs';
import { signNativeRuntimeCode } from './sign-native-runtime.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '../..');
const runtimeRoot = path.join(appRoot, 'src-tauri', 'runtime');
const binaryRoot = path.join(appRoot, 'src-tauri', 'binaries');
const nodeVersion = bundledNodeVersion;
const hostTargetByArchitecture = {
  arm64: 'aarch64-apple-darwin',
  x64: 'x86_64-apple-darwin',
};
const nodeDistributionArchitecture = {
  arm64: 'arm64',
  x64: 'x64',
};

if (process.platform !== 'darwin') {
  throw new Error('CodeGraphy desktop sidecars must be staged on macOS.');
}

const hostTarget = hostTargetByArchitecture[process.arch];
if (!hostTarget) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
const target = process.env.CODEGRAPHY_DESKTOP_TARGET ?? hostTarget;
if (target !== hostTarget) {
  throw new Error(`Cannot stage ${hostTarget} native Core modules for ${target}.`);
}

const runtimeCache = process.env.CODEGRAPHY_DESKTOP_RUNTIME_CACHE
  ?? path.join(os.homedir(), 'Library', 'Caches', 'CodeGraphy', 'desktop-runtime');
const nodeArchiveName = `node-v${nodeVersion}-darwin-${nodeDistributionArchitecture[process.arch]}.tar.gz`;
const nodeDistributionRoot = path.join(runtimeCache, nodeArchiveName.replace(/\.tar\.gz$/u, ''));
const nodeExecutable = path.join(nodeDistributionRoot, 'bin', 'node');
const expectedArchiveChecksum = nodeArchiveChecksums[process.arch];
if (!expectedArchiveChecksum) throw new Error(`No Node checksum for architecture: ${process.arch}`);
const checksumMarker = path.join(nodeDistributionRoot, '.codegraphy-checksum');
const cachedChecksum = existsSync(checksumMarker) ? readFileSync(checksumMarker, 'utf8').trim() : undefined;
if (!existsSync(nodeExecutable) || cachedChecksum !== expectedArchiveChecksum) {
  mkdirSync(runtimeCache, { recursive: true });
  const archivePath = path.join(runtimeCache, nodeArchiveName);
  if (!existsSync(archivePath)) {
    execFileSync('curl', [
      '--fail',
      '--location',
      '--output',
      archivePath,
      `https://nodejs.org/dist/v${nodeVersion}/${nodeArchiveName}`,
    ], { stdio: 'inherit' });
  }
  const archiveChecksum = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  if (archiveChecksum !== expectedArchiveChecksum) {
    throw new Error(`Node archive checksum mismatch for ${nodeArchiveName}.`);
  }
  rmSync(nodeDistributionRoot, { force: true, recursive: true });
  execFileSync('tar', ['-xzf', archivePath, '-C', runtimeCache], { stdio: 'inherit' });
  writeFileSync(checksumMarker, `${expectedArchiveChecksum}\n`);
}
execFileSync('codesign', ['--verify', '--strict', nodeExecutable], { stdio: 'inherit' });
execFileSync(nodeExecutable, ['--version'], { stdio: 'inherit' });

execFileSync('pnpm', [
  '-w',
  'exec',
  'turbo',
  'run',
  'build',
  '--filter=@codegraphy-dev/core...',
], { cwd: repoRoot, stdio: 'inherit' });

rmSync(runtimeRoot, { force: true, recursive: true });
mkdirSync(runtimeRoot, { recursive: true });
execFileSync('pnpm', [
  '--config.node-linker=hoisted',
  '--filter',
  '@codegraphy-dev/core',
  'deploy',
  '--legacy',
  '--prod',
  path.join(runtimeRoot, 'core'),
], { cwd: repoRoot, stdio: 'inherit' });
// Hoisted deploy can rewrite shared workspace linker metadata. Restore the
// checked-in lockfile layout before any repository build or test continues.
execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: repoRoot, stdio: 'inherit' });
const pruned = pruneDeployedRuntime(path.join(runtimeRoot, 'core'), target);
process.stdout.write(`Pruned ${pruned.directories} development directories and ${pruned.files} development files.\n`);
copyFileSync(path.join(appRoot, 'scripts', 'core-sidecar.mjs'), path.join(runtimeRoot, 'sidecar.mjs'));

const signingIdentity = process.env.APPLE_SIGNING_IDENTITY ?? '-';
const signedNativeCode = signNativeRuntimeCode(path.join(runtimeRoot, 'core'), signingIdentity);
process.stdout.write(`Signed ${signedNativeCode.length} native Core modules with the bundle identity.\n`);

mkdirSync(binaryRoot, { recursive: true });
const sidecarPath = path.join(binaryRoot, `codegraphy-core-${target}`);
copyFileSync(nodeExecutable, sidecarPath);
chmodSync(sidecarPath, 0o755);
execFileSync('strip', ['-x', sidecarPath], { stdio: 'inherit' });
const sidecarSigningArguments = signingIdentity === '-'
  ? ['--force', '--sign', '-', '--timestamp=none', sidecarPath]
  : [
      '--force',
      '--sign', signingIdentity,
      '--timestamp',
      '--options', 'runtime',
      '--entitlements', path.join(appRoot, 'src-tauri', 'Entitlements.plist'),
      sidecarPath,
    ];
execFileSync('codesign', sidecarSigningArguments, { stdio: 'inherit' });
execFileSync(sidecarPath, ['--version'], { stdio: 'inherit' });
const coreModuleUrl = pathToFileURL(path.join(runtimeRoot, 'core', 'dist', 'index.js')).href;
const runtimeProbe = `await Promise.all(${JSON.stringify(nativeRuntimeModules)}.map(module => import(module))); await import(${JSON.stringify(coreModuleUrl)});`;
execFileSync(sidecarPath, ['--input-type=module', '--eval', runtimeProbe], {
  cwd: path.join(runtimeRoot, 'core'),
  stdio: 'inherit',
});

const licensesSource = path.join(repoRoot, 'LICENSE');
cpSync(licensesSource, path.join(runtimeRoot, 'LICENSE'));
