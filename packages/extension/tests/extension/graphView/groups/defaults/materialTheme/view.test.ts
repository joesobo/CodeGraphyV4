import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { afterEach, describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import {
  createMaterialGroup,
  findMaterialMatch,
  getMaterialThemeDefaultGroups,
  getSpecificityScore,
} from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/view';
import { clearMaterialThemeCache } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/manifest';

const tempDirs: string[] = [];

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-view-'));
  tempDirs.push(tempDir);
  return tempDir;
}

function writeMaterialPackage(extensionRoot: string, manifest: object, icons: Record<string, string>): void {
  const packageRoot = path.join(extensionRoot, 'node_modules', 'material-icon-theme');
  const distRoot = path.join(packageRoot, 'dist');
  const iconsRoot = path.join(packageRoot, 'icons');
  fs.mkdirSync(distRoot, { recursive: true });
  fs.mkdirSync(iconsRoot, { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'package.json'), '{}');
  fs.writeFileSync(path.join(distRoot, 'material-icons.json'), JSON.stringify(manifest));

  for (const [name, svg] of Object.entries(icons)) {
    fs.writeFileSync(path.join(iconsRoot, name), svg);
  }
}

afterEach(() => {
  clearMaterialThemeCache();
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('graphView/materialTheme/view', () => {
  it('finds file-name matches before extension and language fallback matches', () => {
    expect(findMaterialMatch('', { fileExtensions: { ts: 'typescript' } })).toBeUndefined();

    expect(findMaterialMatch('vite.config.ts', {
      fileNames: { 'vite.config.ts': 'vite' },
      fileExtensions: { ts: 'typescript' },
      languageIds: { typescript: 'typescript-language' },
    })).toEqual({
      iconName: 'vite',
      key: 'vite.config.ts',
      kind: 'fileName',
    });

    expect(findMaterialMatch('main.ts', {
      fileExtensions: { ts: 'typescript' },
      languageIds: { typescript: 'typescript-language' },
    })).toEqual({
      iconName: 'typescript',
      key: 'ts',
      kind: 'fileExtension',
    });

    expect(findMaterialMatch('README.md', {
      languageIds: { markdown: 'markdown' },
    })).toEqual({
      iconName: 'markdown',
      key: 'md',
      kind: 'fileExtension',
    });
  });

  it('builds white-icon core groups, skips unmatched and package nodes, and sorts by specificity', () => {
    const extensionRoot = createTempDir();
    writeMaterialPackage(extensionRoot, {
      fileNames: {
        'vite.config.ts': 'vite',
        'docs/readme.md': 'docs-readme',
      },
      fileExtensions: {
        json: 'json',
        ts: 'typescript',
        foo: 'missing',
      },
      languageIds: {
        markdown: 'markdown',
      },
      iconDefinitions: {
        json: { iconPath: '../icons/json.svg' },
        vite: { iconPath: '../icons/vite.svg' },
        typescript: { iconPath: '../icons/typescript.svg' },
        markdown: { iconPath: '../icons/markdown.svg' },
        'docs-readme': { iconPath: '../icons/docs-readme.svg' },
        missing: { iconPath: '../icons/missing.svg' },
      },
    }, {
      'vite.svg': '<svg><path fill="#AA00FF" /></svg>',
      'typescript.svg': '<svg><path fill="#3178C6" /></svg>',
      'markdown.svg': '<svg><path fill="#42A5F5" /></svg>',
      'docs-readme.svg': '<svg><path fill="#00897B" /></svg>',
      'json.svg': '<svg><path fill="#F9A825" /></svg>',
    });

    const graphData = {
      nodes: [
        { id: 'vite.config.ts', label: 'vite.config.ts', color: '#000000' },
        { id: 'src/main.ts', label: 'main.ts', color: '#000000' },
        { id: 'docs/readme.md', label: 'readme.md', color: '#000000' },
        { id: 'src/README.md', label: 'README.md', color: '#000000' },
        { id: 'src/no-match.txt', label: 'no-match.txt', color: '#000000' },
        { id: 'src/missing.foo', label: 'missing.foo', color: '#000000' },
        { id: 'pkg:manifest.json', label: 'manifest.json', color: '#000000' },
        { id: 'packages/app/package.json', label: 'package.json', color: '#000000', nodeType: 'package' },
      ],
      edges: [],
    } satisfies IGraphData;

    const groups = getMaterialThemeDefaultGroups(graphData, vscode.Uri.file(extensionRoot));

    expect(groups.map((group) => group.id)).toEqual([
      'default:fileName:.codegraphy/settings.json',
      'default:fileName:docs/readme.md',
      'default:fileName:vite.config.ts',
      'default:fileExtension:ts',
      'default:fileExtension:md',
    ]);
    expect(groups.find((group) => group.id === 'default:fileName:vite.config.ts')).toEqual(expect.objectContaining({
      pattern: 'vite.config.ts',
      color: '#AA00FF',
      pluginName: 'Material Icon Theme',
      isPluginDefault: true,
      imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
    }));
    expect(groups.find((group) => group.id === 'default:fileName:.codegraphy/settings.json')).toEqual({
      id: 'default:fileName:.codegraphy/settings.json',
      pattern: '.codegraphy/settings.json',
      color: '#277ACC',
      isPluginDefault: true,
      pluginName: 'Material Icon Theme',
    });
    expect(groups.some((group) => group.id === 'default:fileExtension:foo')).toBe(false);
    expect(groups.some((group) => group.id === 'default:fileName:package.json')).toBe(false);
    expect(groups.some((group) => group.id === 'default:fileExtension:json')).toBe(false);
  });

  it('returns no theme groups when the runtime package is unavailable', () => {
    expect(getMaterialThemeDefaultGroups({ nodes: [], edges: [] }, vscode.Uri.file(createTempDir()))).toEqual([]);
  });

  it('exposes group helpers for specificity ordering', () => {
    expect(getSpecificityScore({ id: 'path', pattern: 'docs/readme.md', color: '#000000' })).toBe(3);
    expect(getSpecificityScore({ id: 'file', pattern: 'vite.config.ts', color: '#000000' })).toBe(2);
    expect(getSpecificityScore({ id: 'ext', pattern: '*.ts', color: '#000000' })).toBe(1);
    expect(createMaterialGroup({
      iconName: 'typescript',
      key: 'ts',
      kind: 'fileExtension',
    }, {
      color: '#3178C6',
      imageUrl: 'data:image/svg+xml;base64,abc',
    })).toEqual({
      id: 'default:fileExtension:ts',
      pattern: '*.ts',
      color: '#3178C6',
      imageUrl: 'data:image/svg+xml;base64,abc',
      isPluginDefault: true,
      pluginName: 'Material Icon Theme',
    });
  });

  it('materializes folder icon groups from the current workspace tree when folder nodes are enabled', () => {
    const extensionRoot = createTempDir();
    writeMaterialPackage(extensionRoot, {
      folder: 'folder',
      folderNames: {
        src: 'folder-src',
        '.github/issue_template': 'folder-github',
      },
      iconDefinitions: {
        folder: { iconPath: '../icons/folder.svg' },
        'folder-src': { iconPath: '../icons/folder-src.svg' },
        'folder-github': { iconPath: '../icons/folder-github.svg' },
      },
    }, {
      'folder.svg': '<svg><path fill="#777777" /></svg>',
      'folder-src.svg': '<svg><path fill="#123456" /></svg>',
      'folder-github.svg': '<svg><path fill="#abcdef" /></svg>',
    });

    const groups = getMaterialThemeDefaultGroups({
      nodes: [
        { id: 'src/main.ts', label: 'main.ts', color: '#000000' },
        { id: '.github/ISSUE_TEMPLATE/bug.md', label: 'bug.md', color: '#000000' },
      ],
      edges: [],
    }, vscode.Uri.file(extensionRoot), {
      includeFolderMatches: true,
    });

    expect(groups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'default:folderName:src',
        pattern: 'src',
        color: 'rgba(0, 0, 0, 0)',
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:folderName:.github/ISSUE_TEMPLATE',
        pattern: '.github/ISSUE_TEMPLATE',
        color: 'rgba(0, 0, 0, 0)',
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
      expect.objectContaining({
        id: 'default:folder',
        pattern: '**',
        displayLabel: 'Folder',
        matchNodeType: 'folder',
        color: 'rgba(0, 0, 0, 0)',
        pluginName: 'Material Icon Theme',
        imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
      }),
    ]));
  });

  it('skips folder icon groups when folder matching is disabled', () => {
    const extensionRoot = createTempDir();
    writeMaterialPackage(extensionRoot, {
      folderNames: {
        src: 'folder-src',
      },
      iconDefinitions: {
        'folder-src': { iconPath: '../icons/folder-src.svg' },
      },
    }, {
      'folder-src.svg': '<svg><path fill="#123456" /></svg>',
    });

    const groups = getMaterialThemeDefaultGroups({
      nodes: [
        { id: 'src/main.ts', label: 'main.ts', color: '#000000' },
      ],
      edges: [],
    }, vscode.Uri.file(extensionRoot), {
      includeFolderMatches: false,
    });

    expect(groups.some((group) => group.id === 'default:folderName:src')).toBe(false);
    expect(groups.some((group) => group.id === 'default:folder')).toBe(false);
  });
});
