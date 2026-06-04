import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeBinaryPath = 'extension/dist/node_modules/@ladybugdb/core/lbugjs.node';

const expectedNativeBinaryByTarget = {
  'linux-x64': 'ELF x86-64',
  'darwin-arm64': 'Mach-O arm64',
  'win32-x64': 'PE32+ x86-64',
};

function hasPrefix(binary, bytes) {
  return bytes.every((byte, index) => binary[index] === byte);
}

function isMachOArm64(binary) {
  if (binary.length < 8) {
    return false;
  }

  const isLittleEndianMachO64 = binary.readUInt32LE(0) === 0xfeedfacf;
  const isBigEndianMachO64 = binary.readUInt32BE(0) === 0xfeedfacf;

  if (isLittleEndianMachO64) {
    return binary.readInt32LE(4) === 0x0100000c;
  }

  if (isBigEndianMachO64) {
    return binary.readInt32BE(4) === 0x0100000c;
  }

  return false;
}

function isPe32PlusX64(binary) {
  if (binary.length < 0xa0 || binary.toString('ascii', 0, 2) !== 'MZ') {
    return false;
  }

  const peHeaderOffset = binary.readUInt32LE(0x3c);
  if (peHeaderOffset + 26 > binary.length) {
    return false;
  }

  const hasPeSignature = binary.toString('ascii', peHeaderOffset, peHeaderOffset + 4) === 'PE\0\0';
  const machine = binary.readUInt16LE(peHeaderOffset + 4);
  const optionalHeaderMagic = binary.readUInt16LE(peHeaderOffset + 24);

  return hasPeSignature && machine === 0x8664 && optionalHeaderMagic === 0x20b;
}

export function identifyNativeBinary(binary) {
  if (
    binary.length >= 20
    && hasPrefix(binary, [0x7f, 0x45, 0x4c, 0x46])
    && binary.readUInt16LE(18) === 0x3e
  ) {
    return 'ELF x86-64';
  }

  if (isMachOArm64(binary)) {
    return 'Mach-O arm64';
  }

  if (isPe32PlusX64(binary)) {
    return 'PE32+ x86-64';
  }

  return 'unknown';
}

function readExtensionVersion(baseDir) {
  const manifestPath = path.join(baseDir, 'packages', 'extension', 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return manifest.version;
}

function findVsixForTarget({ artifactsDir, version, target }) {
  const expectedName = `codegraphy.codegraphy-${version}-${target}.vsix`;
  const expectedPath = path.join(artifactsDir, expectedName);

  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  return readdirSync(artifactsDir)
    .filter(fileName => fileName.endsWith(`-${target}.vsix`))
    .map(fileName => path.join(artifactsDir, fileName))
    .at(0);
}

function extractNativeBinaryFromVsix(vsixPath) {
  const result = spawnSync('unzip', ['-p', vsixPath, nativeBinaryPath], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const errorMessage = result.error ? `${result.error.message}\n` : '';
    throw new Error(
      `Unable to extract ${nativeBinaryPath} from ${vsixPath}.\n`
      + errorMessage
      + result.stderr.toString('utf8'),
    );
  }

  return result.stdout;
}

export function validateVsixNativeArtifacts({
  baseDir = repoRoot,
  artifactsDir = path.join(baseDir, 'artifacts', 'vsix'),
  version = readExtensionVersion(baseDir),
} = {}) {
  for (const [target, expectedKind] of Object.entries(expectedNativeBinaryByTarget)) {
    const vsixPath = findVsixForTarget({ artifactsDir, version, target });
    if (!vsixPath) {
      throw new Error(`Missing VSIX artifact for ${target} in ${artifactsDir}.`);
    }

    const binary = extractNativeBinaryFromVsix(vsixPath);
    const actualKind = identifyNativeBinary(binary);

    if (actualKind !== expectedKind) {
      throw new Error(
        `${path.basename(vsixPath)} contains ${actualKind} at ${nativeBinaryPath}; expected ${expectedKind}.`,
      );
    }

    console.log(`${path.basename(vsixPath)}: ${nativeBinaryPath} is ${actualKind}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateVsixNativeArtifacts();
}
