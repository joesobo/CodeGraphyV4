import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import {
  copyRuntimePackage,
  EXTENSION_EXTERNAL_PACKAGE_NAMES,
  getVendoredPackageRootPath,
  resolveExtensionRuntimeTarget,
  syncParticlesRuntimePackages,
} from '../../../../scripts/externalPackages';

const EXTENSION_PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

describe('runtime package build support', () => {
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

  it('initializes packaged Particles custom effects from its staged runtime', () => {
    const stageRootPath = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-particles-package-'));
    const packagedPluginRootPath = path.join(stageRootPath, 'packages', 'plugin-particles');
    const packagedPluginEntryPath = path.join(packagedPluginRootPath, 'dist', 'plugin.js');
    const workspaceRootPath = path.join(stageRootPath, 'workspace');
    const effectSourcePath = path.join(
      workspaceRootPath,
      '.codegraphy',
      'particles',
      'custom-effect.ts',
    );

    buildSync({
      entryPoints: [path.join(
        EXTENSION_PACKAGE_ROOT,
        '..',
        'plugin-particles',
        'src',
        'plugin.ts',
      )],
      outfile: packagedPluginEntryPath,
      bundle: true,
      external: ['esbuild'],
      format: 'esm',
      platform: 'node',
      target: 'node22',
    });
    fs.copyFileSync(
      path.join(EXTENSION_PACKAGE_ROOT, '..', 'plugin-particles', 'package.json'),
      path.join(packagedPluginRootPath, 'package.json'),
    );
    fs.mkdirSync(path.dirname(effectSourcePath), { recursive: true });
    fs.writeFileSync(effectSourcePath, 'export default function customEffect() {}\n');

    syncParticlesRuntimePackages(
      packagedPluginEntryPath,
      resolveExtensionRuntimeTarget(),
    );
    expect(fs.existsSync(path.join(stageRootPath, 'dist', 'node_modules', 'esbuild'))).toBe(false);
    expect(fs.existsSync(
      path.join(packagedPluginRootPath, 'dist', 'node_modules', 'esbuild'),
    )).toBe(true);

    execFileSync(process.execPath, [
      '--input-type=module',
      '--eval',
      `
        const packagedModule = await import(${JSON.stringify(pathToFileURL(packagedPluginEntryPath).href)});
        const plugin = packagedModule.default();
        await plugin.initialize(${JSON.stringify(workspaceRootPath)});
      `,
    ]);

    expect(fs.readFileSync(
      path.join(workspaceRootPath, '.codegraphy', 'cache', 'particles', 'custom-effect.js'),
      'utf8',
    )).toContain('customEffect');
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
