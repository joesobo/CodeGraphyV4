import { execFileSync, spawnSync } from 'node:child_process';
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundledNodeVersion, nativeRuntimeModules } from './runtime-contract.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageManifest = JSON.parse(readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
const target = process.env.CODEGRAPHY_DESKTOP_TARGET ?? 'aarch64-apple-darwin';
const bundleRoot = process.env.CODEGRAPHY_DESKTOP_BUNDLE_ROOT
  ?? path.join(appRoot, 'src-tauri', 'target', target, 'release', 'bundle');
const appPath = path.join(bundleRoot, 'macos', 'CodeGraphy.app');
const dmgDirectory = path.join(bundleRoot, 'dmg');
const signedRelease = process.env.CODEGRAPHY_DESKTOP_REQUIRE_RELEASE_SIGNATURE === '1';
const maxRuntimeBytes = 220 * 1024 * 1024;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function command(executable, args, options = {}) {
  const output = execFileSync(executable, args, { encoding: 'utf8', ...options });
  return typeof output === 'string' ? output.trim() : '';
}

function walkFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Release bundle contains a symbolic link: ${entryPath}`);
    }
    if (entry.isDirectory()) files.push(...walkFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function directoryBytes(root) {
  return walkFiles(root).reduce((total, file) => total + statSync(file).size, 0);
}

function plistValue(infoPath, key) {
  return command('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, infoPath]);
}

function signatureDetails(targetPath) {
  const result = spawnSync('codesign', ['-dv', '--verbose=4', targetPath], { encoding: 'utf8' });
  assert(result.status === 0, `Unable to inspect signature: ${targetPath}\n${result.stderr}`);
  return result.stderr;
}

function teamIdentifier(targetPath) {
  return signatureDetails(targetPath).match(/^TeamIdentifier=(.+)$/mu)?.[1];
}

function verifySignature(targetPath, expectedTeam) {
  command('codesign', ['--verify', '--strict', '--verbose=2', targetPath], { stdio: 'inherit' });
  if (expectedTeam) {
    assert(teamIdentifier(targetPath) === expectedTeam, `Signing team mismatch: ${targetPath}`);
  }
}

function findDmg() {
  const images = readdirSync(dmgDirectory)
    .filter(name => name.endsWith('.dmg'))
    .map(name => path.join(dmgDirectory, name));
  assert(images.length === 1, `Expected one DMG in ${dmgDirectory}; found ${images.length}.`);
  return images[0];
}

function verifyInstalledImage(dmgPath, expectedTeam) {
  const mountPoint = mkdtempSync(path.join(os.tmpdir(), 'codegraphy-dmg-'));
  try {
    command('diskutil', [
      'image',
      'attach',
      '--mountOptions', 'nobrowse',
      '--readOnly',
      '--mountPoint', mountPoint,
      dmgPath,
    ], { stdio: 'inherit' });
    const mountedApp = path.join(mountPoint, 'CodeGraphy.app');
    assert(lstatSync(mountedApp).isDirectory(), 'The DMG does not contain CodeGraphy.app.');
    command('codesign', ['--verify', '--deep', '--strict', '--verbose=2', mountedApp], { stdio: 'inherit' });
    if (expectedTeam) {
      assert(teamIdentifier(mountedApp) === expectedTeam, 'The DMG app has the wrong signing team.');
    }
  } finally {
    try {
      command('diskutil', ['eject', mountPoint], { stdio: 'inherit' });
    } finally {
      rmSync(mountPoint, { force: true, recursive: true });
    }
  }
}

assert(process.platform === 'darwin', 'Desktop release verification must run on macOS.');
assert(target === 'aarch64-apple-darwin', `Unsupported release target: ${target}`);
assert(lstatSync(appPath).isDirectory(), `Missing app bundle: ${appPath}`);

const infoPath = path.join(appPath, 'Contents', 'Info.plist');
const macOsRoot = path.join(appPath, 'Contents', 'MacOS');
const resourcesRoot = path.join(appPath, 'Contents', 'Resources', 'runtime');
const nodePath = path.join(macOsRoot, 'codegraphy-core');
const appExecutable = path.join(macOsRoot, 'codegraphy-desktop');
const coreRoot = path.join(resourcesRoot, 'core');
const coreModule = path.join(coreRoot, 'dist', 'index.js');
const sidecarScript = path.join(resourcesRoot, 'sidecar.mjs');

for (const requiredPath of [infoPath, nodePath, appExecutable, coreModule, sidecarScript]) {
  assert(lstatSync(requiredPath).isFile(), `Missing release file: ${requiredPath}`);
}

assert(plistValue(infoPath, 'CFBundleShortVersionString') === packageManifest.version, 'App version does not match package.json.');
assert(plistValue(infoPath, 'LSMinimumSystemVersion') === '26.0', 'App minimum system version must be macOS 26.0.');
assert(command('lipo', ['-archs', nodePath]) === 'arm64', 'Bundled Node must contain only arm64 code.');
assert(command('lipo', ['-archs', appExecutable]) === 'arm64', 'Desktop executable must contain only arm64 code.');
assert(command(nodePath, ['--version']) === `v${bundledNodeVersion}`, 'Bundled Node version is incorrect.');

const runtimeBytes = directoryBytes(coreRoot) + statSync(nodePath).size;
assert(runtimeBytes <= maxRuntimeBytes, `Bundled Core runtime exceeds 220 MiB: ${runtimeBytes} bytes.`);
const probe = `await Promise.all(${JSON.stringify(nativeRuntimeModules)}.map(module => import(module))); await import(${JSON.stringify(pathToFileURL(coreModule).href)});`;
command(nodePath, ['--input-type=module', '--eval', probe], { cwd: coreRoot, stdio: 'inherit' });

command('codesign', ['--verify', '--deep', '--strict', '--verbose=2', appPath], { stdio: 'inherit' });
const dmgPath = findDmg();
command('hdiutil', ['verify', dmgPath], { stdio: 'inherit' });

let signingTeam;
if (signedRelease) {
  signingTeam = teamIdentifier(appPath);
  assert(signingTeam && signingTeam !== 'not set', 'Release app does not have a Developer ID signing team.');
  const nestedCode = walkFiles(appPath).filter(file => (
    file === appExecutable
    || file === nodePath
    || file.endsWith('.dylib')
    || file.endsWith('.node')
  ));
  for (const codePath of nestedCode) verifySignature(codePath, signingTeam);
  verifySignature(dmgPath, signingTeam);
  command('spctl', ['--assess', '--type', 'execute', '--verbose=4', appPath], { stdio: 'inherit' });
  command('spctl', [
    '--assess',
    '--type', 'open',
    '--context', 'context:primary-signature',
    '--verbose=4',
    dmgPath,
  ], { stdio: 'inherit' });
  command('xcrun', ['stapler', 'validate', appPath], { stdio: 'inherit' });
  command('xcrun', ['stapler', 'validate', dmgPath], { stdio: 'inherit' });
}

verifyInstalledImage(dmgPath, signingTeam);
process.stdout.write(`Verified CodeGraphy ${packageManifest.version} for Apple Silicon (${Math.ceil(runtimeBytes / 1024 / 1024)} MiB Core runtime).\n`);
process.stdout.write(`${dmgPath}\n`);
