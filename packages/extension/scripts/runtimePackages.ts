import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import { currentTarget } from '@neon-rs/load';
import { familySync, GLIBC, MUSL } from 'detect-libc';

const require = createRequire(import.meta.url);

export const EXTENSION_RUNTIME_PACKAGE_NAMES = [
  'libsql',
  '@neon-rs/load',
  'detect-libc',
  'esbuild',
  getLibsqlNativePackageName(),
  'material-icon-theme',
  'node-gyp-build',
  'tree-sitter',
  'tree-sitter-c',
  'tree-sitter-cpp',
  'tree-sitter-c-sharp',
  '@driftlog/tree-sitter-dart',
  'tree-sitter-go',
  'tree-sitter-haskell',
  'tree-sitter-java',
  'tree-sitter-javascript',
  '@tree-sitter-grammars/tree-sitter-kotlin',
  '@tree-sitter-grammars/tree-sitter-lua',
  'tree-sitter-objc',
  'tree-sitter-php',
  'tree-sitter-python',
  'tree-sitter-ruby',
  'tree-sitter-rust',
  'tree-sitter-scala',
  'tree-sitter-swift',
  'tree-sitter-typescript',
] as const;

export function getLibsqlNativePackageName(): string {
  let target = currentTarget();
  if (familySync() === GLIBC) {
    if (target === 'linux-x64-musl') target = 'linux-x64-gnu';
    if (target === 'linux-arm64-musl') target = 'linux-arm64-gnu';
  } else if (familySync() === MUSL && target === 'linux-arm-gnueabihf') {
    target = 'linux-arm-musleabihf';
  }

  return `@libsql/${target}`;
}

function resolvePackageEntryPath(packageName: string): string {
  return require.resolve(packageName);
}

export function resolveRuntimePackageRootPath(
  packageName: string,
  resolveEntryPath: (packageName: string) => string = resolvePackageEntryPath,
): string {
  let currentPath = path.dirname(resolveEntryPath(packageName));

  while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`Unable to find package root for ${packageName}`);
    }
    currentPath = parentPath;
  }

  return currentPath;
}

export function getVendoredPackageRootPath(
  outputFilePath: string,
  packageName: string,
): string {
  return path.join(path.dirname(outputFilePath), 'node_modules', ...packageName.split('/'));
}

function toPackageRelativeEntrypoint(entrypoint: string): string {
  return entrypoint.endsWith('/')
    ? `${entrypoint}index.js`
    : `${entrypoint}/index.js`;
}

function normalizeVendoredPackageEntrypoint(packageRootPath: string): void {
  const manifestPath = path.join(packageRootPath, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    main?: unknown;
    [key: string]: unknown;
  };
  if (typeof manifest.main !== 'string' || path.extname(manifest.main) !== '') {
    return;
  }

  const normalizedMain = toPackageRelativeEntrypoint(manifest.main);
  if (!fs.existsSync(path.join(packageRootPath, normalizedMain))) {
    return;
  }

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, main: normalizedMain }, null, 2)}\n`,
  );
}

export function copyRuntimePackage(
  outputFilePath: string,
  packageName: string,
  resolvePackageRootPath: (packageName: string) => string = resolveRuntimePackageRootPath,
): string {
  const sourcePath = resolvePackageRootPath(packageName);
  const targetPath = getVendoredPackageRootPath(outputFilePath, packageName);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    dereference: true,
  });
  normalizeVendoredPackageEntrypoint(targetPath);

  return targetPath;
}

export function syncExtensionRuntimePackages(
  outputFilePath: string,
  packageNames: readonly string[] = EXTENSION_RUNTIME_PACKAGE_NAMES,
): string[] {
  return packageNames.map(packageName => copyRuntimePackage(outputFilePath, packageName));
}
