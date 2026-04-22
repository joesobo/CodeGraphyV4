import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import { collectMaterialFileGroups } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/files';
import type { MaterialThemeCacheEntry } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/model';

const tempDirs: string[] = [];

function createTheme(): MaterialThemeCacheEntry {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-material-files-'));
  tempDirs.push(tempDir);
  const manifestPath = path.join(tempDir, 'dist', 'material-icons.json');
  const iconRoot = path.join(tempDir, 'icons');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(iconRoot, { recursive: true });
  fs.writeFileSync(manifestPath, '{}');
  fs.writeFileSync(path.join(iconRoot, 'typescript.svg'), '<svg><path fill="#3178C6" /></svg>');
  fs.writeFileSync(path.join(iconRoot, 'readme.svg'), '<svg><path fill="#42A5F5" /></svg>');

  return {
    iconDataByName: new Map(),
    manifestPath,
    manifest: {
      fileExtensions: { ts: 'typescript' },
      fileNames: { 'readme.md': 'readme' },
      iconDefinitions: {
        typescript: { iconPath: '../icons/typescript.svg' },
        readme: { iconPath: '../icons/readme.svg' },
      },
    },
  };
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('graphView/materialTheme/files', () => {
  it('builds file groups while skipping package, folder, and external package nodes', () => {
    const groups = collectMaterialFileGroups({
      nodes: [
        { id: 'src/main.ts', label: 'main.ts', color: '#000000' },
        { id: 'README.md', label: 'README.md', color: '#000000' },
        { id: 'packages/app/package.json', label: 'package.json', color: '#000000', nodeType: 'package' },
        { id: 'src', label: 'src', color: '#000000', nodeType: 'folder' },
        { id: 'pkg:left-pad', label: 'left-pad', color: '#000000' },
      ],
      edges: [],
    } satisfies IGraphData, createTheme());

    expect(groups.map((group) => group.id)).toEqual([
      'default:fileExtension:ts',
      'default:fileName:README.md',
    ]);
  });
});
