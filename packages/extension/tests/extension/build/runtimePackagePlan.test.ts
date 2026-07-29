import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getExtensionRuntimePackageNames,
  resolveRuntimePackageRootPath,
} from '../../../scripts/externalPackages';
import { createRuntimePackagePlans } from '../../../scripts/runtimePackagePlan';

describe('extension runtime package plan', () => {
  it('resolves the installed SQLite package root', () => {
    const packageRootPath = resolveRuntimePackageRootPath('libsql');

    expect(path.basename(packageRootPath)).toBe('libsql');
    expect(fs.existsSync(path.join(packageRootPath, 'package.json'))).toBe(true);
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
        '@parcel/watcher-darwin-arm64',
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

  it('vendors the target Parcel watcher native binding', () => {
    const plan = createRuntimePackagePlans('darwin-arm64')
      .find(entry => entry.packageName === '@parcel/watcher-darwin-arm64');

    expect(plan?.relativeFilePaths).toEqual(
      expect.arrayContaining(['package.json', 'watcher.node']),
    );
  });

  it('resolves every vendored runtime package from the extension package', () => {
    for (const packageName of EXTENSION_RUNTIME_PACKAGE_NAMES) {
      expect(() => resolveRuntimePackageRootPath(packageName)).not.toThrow();
    }
  });
});
