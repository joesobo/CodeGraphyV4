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
  it('resolves package roots from source and runtime extension layouts', () => {
    const emptyRoot = createTempDir();
    fs.mkdirSync(path.join(emptyRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme'), { recursive: true });
    expect(resolveMaterialThemeRoot(vscode.Uri.file(emptyRoot))).toBeUndefined();

    const monorepoRoot = createTempDir();
    fs.mkdirSync(path.join(monorepoRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme'), { recursive: true });
    fs.writeFileSync(
      path.join(monorepoRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme', 'package.json'),
      '{}',
    );
    expect(resolveMaterialThemeRoot(vscode.Uri.file(monorepoRoot))).toBe(
      path.join(monorepoRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme'),
    );

    const distRoot = createTempDir();
    fs.mkdirSync(path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme'), { recursive: true });
    fs.writeFileSync(path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme', 'package.json'), '{}');
    expect(resolveMaterialThemeRoot(vscode.Uri.file(distRoot))).toBe(
      path.join(distRoot, 'dist', 'node_modules', 'material-icon-theme'),
    );
  });

  it('ignores root node_modules when the extension root is the monorepo root', () => {
    const monorepoRoot = createTempDir();
    fs.mkdirSync(path.join(monorepoRoot, 'node_modules', 'material-icon-theme'), { recursive: true });
    fs.writeFileSync(path.join(monorepoRoot, 'node_modules', 'material-icon-theme', 'package.json'), '{}');

    expect(resolveMaterialThemeRoot(vscode.Uri.file(monorepoRoot))).toBeUndefined();
  });

  it('loads and caches the material icon manifest and caches missing roots as null', () => {
    const missingRoot = createTempDir();
    expect(loadMaterialTheme(vscode.Uri.file(missingRoot))).toBeNull();
    expect(loadMaterialTheme(vscode.Uri.file(missingRoot))).toBeNull();

    const extensionRoot = createTempDir();
    const packageRoot = path.join(extensionRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme');
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

  it('caches malformed material icon manifests as unavailable', () => {
    const extensionRoot = createTempDir();
    const packageRoot = path.join(extensionRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme');
    fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), '{}');
    fs.writeFileSync(path.join(packageRoot, 'dist', 'material-icons.json'), '{bad json');

    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))).toBeNull();

    fs.writeFileSync(path.join(packageRoot, 'dist', 'material-icons.json'), JSON.stringify({
      fileExtensions: { ts: 'typescript' },
    }));
    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))).toBeNull();
  });

  it('filters malformed optional manifest maps', () => {
    const extensionRoot = createTempDir();
    const packageRoot = path.join(extensionRoot, 'packages', 'extension', 'node_modules', 'material-icon-theme');
    fs.mkdirSync(path.join(packageRoot, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'package.json'), '{}');
    fs.writeFileSync(path.join(packageRoot, 'dist', 'material-icons.json'), JSON.stringify({
      fileExtensions: { ts: 'typescript', broken: 7 },
      fileNames: 'invalid',
      iconDefinitions: {
        typescript: { iconPath: '../icons/typescript.svg' },
        broken: { iconPath: 7 },
      },
    }));

    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))?.manifest).toMatchObject({
      fileExtensions: { ts: 'typescript' },
      iconDefinitions: { typescript: { iconPath: '../icons/typescript.svg' } },
    });
    expect(loadMaterialTheme(vscode.Uri.file(extensionRoot))?.manifest.fileNames).toBeUndefined();
  });
});
