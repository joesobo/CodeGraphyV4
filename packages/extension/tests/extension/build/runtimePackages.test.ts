import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyRuntimePackage,
  EXTENSION_EXTERNAL_PACKAGE_NAMES,
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getExtensionRuntimePackageNames,
  getVendoredPackageRootPath,
  resolveExtensionRuntimeTarget,
  resolveRuntimePackageRootPath,
} from '../../../scripts/externalPackages';

const EXTENSION_PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

describe('runtime package build support', () => {
  it('resolves the installed SQLite package root', () => {
    const packageRootPath = resolveRuntimePackageRootPath('libsql');

    expect(path.basename(packageRootPath)).toBe('libsql');
    expect(fs.existsSync(path.join(packageRootPath, 'package.json'))).toBe(true);
  });

  it('copies only selected runtime files and clears stale package output', () => {
    const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-build-'));
    const outputFilePath = path.join(tempDirectoryPath, 'dist', 'extension.js');
    const sourcePackageRootPath = path.join(tempDirectoryPath, 'vendor', 'libsql');
    const sourcePackageJsonPath = path.join(sourcePackageRootPath, 'package.json');
    const targetPackageRootPath = getVendoredPackageRootPath(outputFilePath, 'libsql');

    fs.mkdirSync(sourcePackageRootPath, { recursive: true });
    fs.writeFileSync(sourcePackageJsonPath, '{"name":"libsql"}');
    fs.writeFileSync(path.join(sourcePackageRootPath, 'README.md'), 'not runtime');
    fs.mkdirSync(targetPackageRootPath, { recursive: true });
    fs.writeFileSync(path.join(targetPackageRootPath, 'stale.node'), 'stale');

    const copiedPackageRootPath = copyRuntimePackage(
      outputFilePath,
      'libsql',
      ['package.json'],
      () => sourcePackageRootPath,
    );

    expect(copiedPackageRootPath).toBe(getVendoredPackageRootPath(outputFilePath, 'libsql'));
    expect(fs.readFileSync(path.join(copiedPackageRootPath, 'package.json'), 'utf8')).toBe(
      '{"name":"libsql"}',
    );
    expect(fs.existsSync(path.join(copiedPackageRootPath, 'README.md'))).toBe(false);
    expect(fs.existsSync(path.join(copiedPackageRootPath, 'stale.node'))).toBe(false);
  });

  it('normalizes copied package entrypoints that point at extensionless directories', () => {
    const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-main-'));
    const outputFilePath = path.join(tempDirectoryPath, 'dist', 'extension.js');
    const sourcePackageRootPath = path.join(tempDirectoryPath, 'vendor', '@tree-sitter-grammars', 'tree-sitter-lua');

    fs.mkdirSync(path.join(sourcePackageRootPath, 'bindings/node'), { recursive: true });
    fs.writeFileSync(
      path.join(sourcePackageRootPath, 'bindings/node/index.js'),
      'module.exports = {};\n',
    );
    fs.writeFileSync(
      path.join(sourcePackageRootPath, 'package.json'),
      JSON.stringify({
        name: '@tree-sitter-grammars/tree-sitter-lua',
        main: 'bindings/node',
      }),
    );

    const copiedPackageRootPath = copyRuntimePackage(
      outputFilePath,
      '@tree-sitter-grammars/tree-sitter-lua',
      ['package.json', 'bindings/node/index.js'],
      () => sourcePackageRootPath,
    );
    const copiedPackageJson = JSON.parse(
      fs.readFileSync(path.join(copiedPackageRootPath, 'package.json'), 'utf8'),
    ) as { main?: string };

    expect(copiedPackageJson.main).toBe('bindings/node/index.js');
  });

  it('selects target-specific native runtime packages', () => {
    expect(getExtensionRuntimePackageNames('darwin-arm64')).toEqual(
      expect.arrayContaining([
        '@libsql/darwin-arm64',
        '@esbuild/darwin-arm64',
        'tree-sitter',
      ]),
    );
    expect(getExtensionRuntimePackageNames('darwin-arm64')).not.toContain(
      '@libsql/linux-x64-gnu',
    );
  });

  it('uses one explicit VSIX target when the build provides it', () => {
    expect(resolveExtensionRuntimeTarget({
      environment: { CODEGRAPHY_VSIX_TARGETS: 'darwin-arm64' },
      platform: 'darwin',
      arch: 'arm64',
    })).toBe('darwin-arm64');
  });

  it('vendors every Tree-sitter grammar needed by the core runtime', () => {
    expect(getExtensionRuntimePackageNames('darwin-arm64')).toEqual(
      expect.arrayContaining([
        'libsql',
        '@neon-rs/load',
        'detect-libc',
        'esbuild',
        '@libsql/darwin-arm64',
        '@esbuild/darwin-arm64',
        'material-icon-theme',
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
      ]),
    );
  });

  it('resolves every vendored runtime package from the extension package', () => {
    for (const packageName of EXTENSION_RUNTIME_PACKAGE_NAMES) {
      expect(() => resolveRuntimePackageRootPath(packageName)).not.toThrow();
    }
  });

  it('bundles core packages while externalizing only VS Code and native runtime packages', () => {
    expect(EXTENSION_EXTERNAL_PACKAGE_NAMES).toEqual(
      expect.arrayContaining([
        'vscode',
        'libsql',
        'tree-sitter',
      ]),
    );
    expect(EXTENSION_EXTERNAL_PACKAGE_NAMES).not.toEqual(
      expect.arrayContaining([
        '@codegraphy-dev/core',
        '@codegraphy-dev/plugin-markdown',
      ]),
    );
  });

  it('declares core as an npm dependency instead of a VS Code extension dependency', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(EXTENSION_PACKAGE_ROOT, 'package.json'), 'utf8'),
    ) as {
      dependencies?: Record<string, string>;
      extensionDependencies?: string[];
    };

    expect(manifest.dependencies?.['@codegraphy-dev/core']).toBe('workspace:*');
    expect(manifest.dependencies?.['@codegraphy-dev/extension-plugin-api']).toBe('workspace:*');
    expect(manifest.extensionDependencies ?? []).not.toContain('@codegraphy-dev/core');
  });
});
