import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  copyRuntimePackage,
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getVendoredPackageRootPath,
  resolveRuntimePackageRootPath,
  syncExtensionRuntimePackages,
} from '../../../scripts/runtimePackages';

describe('runtime package build support', () => {
  it('resolves the installed Ladybug package root', () => {
    const packageRootPath = resolveRuntimePackageRootPath('@ladybugdb/core');

    expect(path.basename(packageRootPath)).toBe('core');
    expect(fs.existsSync(path.join(packageRootPath, 'package.json'))).toBe(true);
  });

  it('copies a scoped runtime package into dist/node_modules', () => {
    const tempDirectoryPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-runtime-build-'));
    const outputFilePath = path.join(tempDirectoryPath, 'dist', 'extension.js');
    const sourcePackageRootPath = path.join(tempDirectoryPath, 'vendor', '@ladybugdb', 'core');
    const sourcePackageJsonPath = path.join(sourcePackageRootPath, 'package.json');

    fs.mkdirSync(sourcePackageRootPath, { recursive: true });
    fs.writeFileSync(sourcePackageJsonPath, '{"name":"@ladybugdb/core"}');

    const copiedPackageRootPath = copyRuntimePackage(
      outputFilePath,
      '@ladybugdb/core',
      () => sourcePackageRootPath,
    );

    expect(copiedPackageRootPath).toBe(getVendoredPackageRootPath(outputFilePath, '@ladybugdb/core'));
    expect(fs.readFileSync(path.join(copiedPackageRootPath, 'package.json'), 'utf8')).toBe(
      '{"name":"@ladybugdb/core"}',
    );
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
        'material-icon-theme',
        'tree-sitter',
        'tree-sitter-c-sharp',
        'tree-sitter-go',
        'tree-sitter-java',
        'tree-sitter-javascript',
        'tree-sitter-python',
        'tree-sitter-rust',
        'tree-sitter-typescript',
      ]),
    );
  });
});
