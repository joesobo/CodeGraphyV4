import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { afterEach, describe, expect, it } from 'vitest';
import {
  clearMaterialThemeCache,
  loadMaterialTheme,
  resolveMaterialThemeRoot,
} from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/manifest';

const tempDirs: string[] = [];

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-theme-'));
  tempDirs.push(tempDir);
  return tempDir;
}

afterEach(() => {
  clearMaterialThemeCache();
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('graphView/materialTheme/manifest', () => {
  it('resolves package roots from node_modules and dist/node_modules', () => {
    const emptyRoot = createTempDir();
    fs.mkdirSync(path.join(emptyRoot, 'node_modules', 'material-icon-theme'), { recursive: true });
    expect(resolveMaterialThemeRoot(vscode.Uri.file(emptyRoot))).toBeUndefined();

    const nodeModulesRoot = createTempDir();
    fs.mkdirSync(path.join(nodeModulesRoot, 'node_modules', 'material-icon-theme'), { recursive: true });
    fs.writeFileSync(path.join(nodeModulesRoot, 'node_modules', 'material-icon-theme', 'package.json'), '{}');
    expect(resolveMaterialThemeRoot(vscode.Uri.file(nodeModulesRoot))).toBe(
      path.join(nodeModulesRoot, 'node_modules', 'material-icon-theme'),
    );

    const distRoot = createTempDir();
    fs.mkdirSync(path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme'), { recursive: true });
    fs.writeFileSync(path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme', 'package.json'), '{}');
    expect(resolveMaterialThemeRoot(vscode.Uri.file(distRoot))).toBe(
      path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme'),
    );
  });

  it('loads and caches the material icon manifest and caches missing roots as null', () => {
    const missingRoot = createTempDir();
    expect(loadMaterialTheme(vscode.Uri.file(missingRoot))).toBeNull();
    expect(loadMaterialTheme(vscode.Uri.file(missingRoot))).toBeNull();

    const extensionRoot = createTempDir();
    const packageRoot = path.join(extensionRoot, 'node_modules', 'material-icon-theme');
    fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), '{}');
    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))).toBeNull();

    fs.writeFileSync(path.join(packageRoot, 'dist', 'material-icons.json'), JSON.stringify({
      fileExtensions: { ts: 'typescript' },
      iconDefinitions: { typescript: { iconPath: '../icons/typescript.svg' } },
    }));
    clearMaterialThemeCache();

    const first = loadMaterialTheme(vscode.Uri.file(extensionRoot));
    const second = loadMaterialTheme(vscode.Uri.file(extensionRoot));

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(first?.manifest.fileExtensions?.ts).toBe('typescript');

    clearMaterialThemeCache();
    fs.writeFileSync(path.join(packageRoot, 'dist', 'material-icons.json'), JSON.stringify({
      fileExtensions: { js: 'javascript' },
      iconDefinitions: { javascript: { iconPath: '../icons/javascript.svg' } },
    }));
    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))?.manifest.fileExtensions?.js).toBe('javascript');
  });
});
