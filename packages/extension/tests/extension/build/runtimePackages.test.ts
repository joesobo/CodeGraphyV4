import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  copyRuntimePackage,
  EXTENSION_EXTERNAL_PACKAGE_NAMES,
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getVendoredPackageRootPath,
  resolveRuntimePackageRootPath,
  syncExtensionRuntimePackages,
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

  it('copies a scoped runtime package into dist/node_modules', () => {
    const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-build-'));
    const outputFilePath = path.join(tempDirectoryPath, 'dist', 'extension.js');
    const sourcePackageRootPath = path.join(tempDirectoryPath, 'vendor', 'libsql');
    const sourcePackageJsonPath = path.join(sourcePackageRootPath, 'package.json');

    fs.mkdirSync(sourcePackageRootPath, { recursive: true });
    fs.writeFileSync(sourcePackageJsonPath, '{"name":"libsql"}');

    const copiedPackageRootPath = copyRuntimePackage(
      outputFilePath,
      'libsql',
      () => sourcePackageRootPath,
    );

    expect(copiedPackageRootPath).toBe(getVendoredPackageRootPath(outputFilePath, 'libsql'));
    expect(fs.readFileSync(path.join(copiedPackageRootPath, 'package.json'), 'utf8')).toBe(
      '{"name":"libsql"}',
    );
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
      () => sourcePackageRootPath,
    );
    const copiedPackageJson = JSON.parse(
      fs.readFileSync(path.join(copiedPackageRootPath, 'package.json'), 'utf8'),
    ) as { main?: string };

    expect(copiedPackageJson.main).toBe('bindings/node/index.js');
  });

  it('syncs every requested runtime package', () => {
    const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-sync-'));
    const outputFilePath = path.join(tempDirectoryPath, 'dist', 'extension.js');
    const copiedPackages: string[] = [];

    const targetPaths = syncExtensionRuntimePackages(outputFilePath, ['tree-sitter'],);
    copiedPackages.push(...targetPaths);

    expect(copiedPackages).toEqual([
      getVendoredPackageRootPath(outputFilePath, 'tree-sitter'),
    ]);
    expect(fs.existsSync(path.join(copiedPackages[0], 'package.json'))).toBe(true);
  });

  it('vendors every Tree-sitter grammar needed by the core runtime', () => {
    expect(EXTENSION_RUNTIME_PACKAGE_NAMES).toEqual(
      expect.arrayContaining([
        'libsql',
        '@neon-rs/load',
        'detect-libc',
        expect.stringMatching(/^@libsql\//),
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
