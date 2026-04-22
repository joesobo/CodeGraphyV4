import { Buffer } from 'node:buffer';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveIconData } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/icons';
import type { MaterialThemeCacheEntry } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/model';

const tempDirs: string[] = [];

function createTempDir(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-icon-data-'));
  tempDirs.push(tempDir);
  return tempDir;
}

function createTheme(): MaterialThemeCacheEntry {
  const tempDir = createTempDir();
  const manifestPath = path.join(tempDir, 'dist', 'material-icons.json');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, '{}');
  return {
    iconDataByName: new Map(),
    manifest: {},
    manifestPath,
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('graphView/materialTheme/icons', () => {
  it('loads icon data, whitens the svg, and reuses the cached result', () => {
    const theme = createTheme();
    const iconPath = path.join(path.dirname(theme.manifestPath), '..', 'icons', 'typescript.svg');
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.writeFileSync(iconPath, '<svg><path fill="#3178C6" /></svg>');
    theme.manifest.iconDefinitions = {
      typescript: { iconPath: '../icons/typescript.svg' },
    };

    const first = resolveIconData(theme, 'typescript');
    const second = resolveIconData(theme, 'typescript');
    const decoded = Buffer.from(first!.imageUrl.split(',')[1], 'base64').toString('utf8');

    expect(first).toEqual({
      color: '#3178C6',
      imageUrl: expect.stringMatching(/^data:image\/svg\+xml;base64,/),
    });
    expect(decoded).toContain('#FFFFFF');
    expect(second).toBe(first);
  });

  it('returns undefined when the icon definition is missing or points to a missing file', () => {
    const theme = createTheme();
    expect(resolveIconData(theme, 'typescript')).toBeUndefined();

    theme.manifest.iconDefinitions = {
      other: { iconPath: '../icons/other.svg' },
      typescript: { iconPath: '../icons/missing.svg' },
    };
    expect(resolveIconData(theme, 'missing')).toBeUndefined();
    expect(resolveIconData(theme, 'typescript')).toBeUndefined();
  });

  it('keeps folder svg colors intact and caches folder/file variants separately', () => {
    const theme = createTheme();
    const iconPath = path.join(path.dirname(theme.manifestPath), '..', 'icons', 'folder-src.svg');
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.writeFileSync(iconPath, '<svg><path fill="#123456" /></svg>');
    theme.manifest.iconDefinitions = {
      'folder-src': { iconPath: '../icons/folder-src.svg' },
    };

    const fileIcon = resolveIconData(theme, 'folder-src');
    const folderIcon = resolveIconData(theme, 'folder-src', 'folder');
    const decoded = Buffer.from(folderIcon!.imageUrl.split(',')[1], 'base64').toString('utf8');

    expect(fileIcon).not.toBe(folderIcon);
    expect(decoded).toContain('#123456');
    expect(decoded).not.toContain('#FFFFFF');
  });
});
