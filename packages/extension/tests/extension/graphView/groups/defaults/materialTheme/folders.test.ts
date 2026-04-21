import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { afterEach, describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import { collectMaterialFolderGroups } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/folders';
import type { MaterialThemeCacheEntry } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/model';

const tempDirs: string[] = [];

function createTheme(): MaterialThemeCacheEntry {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-folders-'));
  tempDirs.push(tempDir);
  const manifestPath = path.join(tempDir, 'dist', 'material-icons.json');
  const iconRoot = path.join(tempDir, 'icons');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(iconRoot, { recursive: true });
  fs.writeFileSync(manifestPath, '{}');
  fs.writeFileSync(path.join(iconRoot, 'folder-src.svg'), '<svg><path fill="#123456" /></svg>');
  fs.writeFileSync(path.join(iconRoot, 'folder-github.svg'), '<svg><path fill="#abcdef" /></svg>');
  fs.writeFileSync(path.join(iconRoot, 'folder-vendor.svg'), '<svg><path fill="#654321" /></svg>');
  fs.writeFileSync(path.join(iconRoot, 'folder-packages.svg'), '<svg><path fill="#112233" /></svg>');

  return {
    iconDataByName: new Map(),
    manifestPath,
    manifest: {
      folderNames: {
        src: 'folder-src',
        '.github/issue_template': 'folder-github',
        vendor: 'folder-vendor',
        packages: 'folder-packages',
        missing: 'folder-missing',
      },
      iconDefinitions: {
        'folder-src': { iconPath: '../icons/folder-src.svg' },
        'folder-github': { iconPath: '../icons/folder-github.svg' },
        'folder-vendor': { iconPath: '../icons/folder-vendor.svg' },
        'folder-packages': { iconPath: '../icons/folder-packages.svg' },
        'folder-missing': { iconPath: '../icons/folder-missing.svg' },
      },
    },
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('graphView/materialTheme/folders', () => {
  it('builds folder groups from file paths and keeps the original folder svg colors', () => {
    const groups = collectMaterialFolderGroups({
      nodes: [
        { id: 'src/main.ts', label: 'main.ts', color: '#000000' },
        { id: '.github/ISSUE_TEMPLATE/bug.md', label: 'bug.md', color: '#000000' },
        { id: 'pkg:left-pad', label: 'left-pad', color: '#000000' },
        { id: 'vendor/cache', label: 'cache', color: '#000000', nodeType: 'folder' },
        { id: 'packages/app/package.json', label: 'package.json', color: '#000000', nodeType: 'package' },
        { id: 'missing/icon.ts', label: 'icon.ts', color: '#000000' },
      ],
      edges: [],
    } satisfies IGraphData, createTheme(), '#445566');

    expect(groups.map((group) => group.id)).toEqual([
      'default:folderName:src',
      'default:folderName:.github/ISSUE_TEMPLATE',
    ]);
    expect(groups.every((group) => group.color === '#445566')).toBe(true);
    expect(groups.some((group) => group.id === 'default:folderName:vendor')).toBe(false);
    expect(groups.some((group) => group.id === 'default:folderName:packages')).toBe(false);
    expect(groups.some((group) => group.id === 'default:folderName:missing')).toBe(false);

    const encoded = groups[0]?.imageUrl?.split(',')[1];
    const decoded = Buffer.from(encoded ?? '', 'base64').toString('utf8');
    expect(decoded).toContain('#123456');
    expect(decoded).not.toContain('#FFFFFF');
  });
});
