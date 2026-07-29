import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import {
  RUNTIME_TARGET_CONFIG,
  type ExtensionRuntimeTarget,
} from './runtimeTarget';

const require = createRequire(import.meta.url);
const requireFromCore = createRequire(require.resolve('@codegraphy-dev/core'));

const TREE_SITTER_GRAMMAR_PACKAGE_NAMES = [
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

export const EXTENSION_RUNTIME_PACKAGE_NAMES = [
  'libsql',
  '@neon-rs/load',
  'detect-libc',
  'esbuild',
  'material-icon-theme',
  'node-gyp-build',
  'tree-sitter',
  ...TREE_SITTER_GRAMMAR_PACKAGE_NAMES,
] as const;

export type RuntimePackagePlan = {
  packageName: string;
  relativeFilePaths: string[];
  resolvePackageRootPath?: (packageName: string) => string;
};

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

function resolveEsbuildBinaryPackageRootPath(packageName: string): string {
  const manifestPath = require.resolve(`${packageName}/package.json`, {
    paths: [require.resolve('esbuild')],
  });
  return path.dirname(manifestPath);
}

function resolveParcelWatcherBinaryPackageRootPath(packageName: string): string {
  const watcherEntryPath = requireFromCore.resolve('@parcel/watcher');
  const manifestPath = requireFromCore.resolve(`${packageName}/package.json`, {
    paths: [path.dirname(watcherEntryPath)],
  });
  return path.dirname(manifestPath);
}

function listRelativeFiles(
  packageRootPath: string,
  relativeDirectoryPath: string,
): string[] {
  const directoryPath = path.join(packageRootPath, relativeDirectoryPath);
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(packageRootPath, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join('/'));
}

function legalFilePaths(packageRootPath: string): string[] {
  return fs.readdirSync(packageRootPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^(?:licen[cs]e|notice)(?:\.|$)/i.test(entry.name))
    .map(entry => entry.name);
}

function staticPackagePlan(
  packageName: string,
  relativeFilePaths: readonly string[],
  resolvePackageRootPath?: (packageName: string) => string,
): RuntimePackagePlan {
  const packageRootPath = (resolvePackageRootPath ?? resolveRuntimePackageRootPath)(packageName);
  return {
    packageName,
    relativeFilePaths: [...relativeFilePaths, ...legalFilePaths(packageRootPath)],
    ...(resolvePackageRootPath ? { resolvePackageRootPath } : {}),
  };
}

function treeSitterGrammarPlan(
  packageName: string,
  nativePrebuildDirectory: string,
): RuntimePackagePlan {
  const packageRootPath = resolveRuntimePackageRootPath(packageName);
  const bindingFilePaths = listRelativeFiles(packageRootPath, 'bindings/node')
    .filter(filePath => filePath.endsWith('.js') && !filePath.endsWith('_test.js'));
  const nodeTypeFilePaths = listRelativeFiles(packageRootPath, '')
    .filter(filePath => filePath.endsWith('src/node-types.json'));
  const prebuildFilePaths = listRelativeFiles(
    packageRootPath,
    path.join('prebuilds', nativePrebuildDirectory),
  ).filter(filePath => filePath.endsWith('.node'));
  const builtFilePaths = packageName === '@driftlog/tree-sitter-dart'
    ? listRelativeFiles(packageRootPath, path.join('build', 'Release'))
      .filter(filePath => filePath.endsWith('.node'))
    : [];
  const rootEntrypointFilePaths = packageName === '@driftlog/tree-sitter-dart'
    ? ['index.js']
    : [];
  const nativeFilePaths = [...prebuildFilePaths, ...builtFilePaths];

  if (nativeFilePaths.length === 0) {
    throw new Error(`No ${nativePrebuildDirectory} native binding found for ${packageName}.`);
  }

  return staticPackagePlan(packageName, [
    'package.json',
    ...rootEntrypointFilePaths,
    ...bindingFilePaths,
    ...nodeTypeFilePaths,
    ...nativeFilePaths,
  ]);
}

export function getExtensionRuntimePackageNames(
  target: ExtensionRuntimeTarget,
): string[] {
  const config = RUNTIME_TARGET_CONFIG[target];
  return [
    ...EXTENSION_RUNTIME_PACKAGE_NAMES,
    config.libsqlPackageName,
    config.esbuildPackageName,
    config.parcelWatcherPackageName,
  ];
}

export function createRuntimePackagePlans(
  target: ExtensionRuntimeTarget,
): RuntimePackagePlan[] {
  const config = RUNTIME_TARGET_CONFIG[target];
  const materialIconThemeRoot = resolveRuntimePackageRootPath('material-icon-theme');

  return [
    staticPackagePlan('libsql', [
      'package.json',
      'index.js',
      'auth.js',
      'promise.js',
      'sqlite-error.js',
    ]),
    staticPackagePlan('@neon-rs/load', ['package.json', 'dist/index.js']),
    staticPackagePlan('detect-libc', [
      'package.json',
      'lib/detect-libc.js',
      'lib/filesystem.js',
      'lib/process.js',
    ]),
    staticPackagePlan('esbuild', [
      'package.json',
      'lib/main.js',
    ]),
    staticPackagePlan(config.esbuildPackageName, [
      'package.json',
      config.platform === 'win32' ? 'esbuild.exe' : 'bin/esbuild',
    ], resolveEsbuildBinaryPackageRootPath),
    staticPackagePlan(config.libsqlPackageName, ['package.json', 'index.node']),
    staticPackagePlan(
      config.parcelWatcherPackageName,
      ['package.json', 'watcher.node'],
      resolveParcelWatcherBinaryPackageRootPath,
    ),
    staticPackagePlan('material-icon-theme', [
      'package.json',
      'dist/material-icons.json',
      ...listRelativeFiles(materialIconThemeRoot, 'icons'),
    ]),
    staticPackagePlan('node-gyp-build', [
      'package.json',
      'index.js',
      'node-gyp-build.js',
    ]),
    staticPackagePlan('tree-sitter', [
      'package.json',
      'index.js',
      path.join(
        'prebuilds',
        config.nativePrebuildDirectory,
        'tree-sitter.node',
      ),
    ]),
    ...TREE_SITTER_GRAMMAR_PACKAGE_NAMES.map(packageName => treeSitterGrammarPlan(
      packageName,
      config.nativePrebuildDirectory,
    )),
  ];
}
