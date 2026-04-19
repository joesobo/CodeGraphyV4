import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createCSharpPlugin } from '../../../../plugin-csharp/src/plugin';
import { createGDScriptPlugin } from '../../../../plugin-godot/src/plugin';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../../src/extension/pipeline/database/cache/storage';

const sourceExamplesRoot = path.resolve(__dirname, '../../../../../examples');
const tempWorkspaceRoots: string[] = [];

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

async function copyExamplesWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-examples-workspace-'));
  const targetPath = path.join(workspaceRoot, 'examples');
  await fs.cp(sourceExamplesRoot, targetPath, { recursive: true });
  tempWorkspaceRoots.push(targetPath);
  return targetPath;
}

afterAll(async () => {
  await Promise.all(
    tempWorkspaceRoots.splice(0).map((workspaceRoot) =>
      fs.rm(path.dirname(workspaceRoot), { recursive: true, force: true }),
    ),
  );
});

describe('WorkspacePipeline examples workspace', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('connects nested example projects when the repo-root examples folder is opened', async () => {
    const workspaceRoot = await copyExamplesWorkspace();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'examples', index: 0 },
    ];

    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );

    await analyzer.initialize();
    analyzer.registry.register(createGDScriptPlugin());

    const graph = await analyzer.analyze();
    const edgeIds = new Set(graph.edges.map((edge) => edge.id));

    const expectedEdgeIds = [
      'example-python/src/main.py->example-python/src/config.py#import',
      'example-python/src/main.py->example-python/src/services/api.py#import',
      'example-go/main.go->example-go/internal/service/service.go#import',
      'example-java/src/com/example/app/App.java->example-java/src/com/example/app/Helper.java#import',
      'example-java/src/com/example/app/App.java->example-java/src/com/example/app/BaseService.java#inherit',
      'example-rust/src/main.rs->example-rust/src/util.rs#import',
      'example-rust/src/main.rs->example-rust/src/inner.rs#import',
      'example-godot/scripts/player.gd->example-godot/scripts/utils/math_helpers.gd#load:static',
      'example-godot/scripts/enemy.gd->example-godot/scripts/base/entity.gd#inherit:static',
      'example-markdown/notes/Home.md->example-markdown/notes/Architecture.md#reference:static',
      'example-markdown/notes/Home.md->example-markdown/src/commented.ts#reference:static',
      'example-markdown/src/commented.ts->example-markdown/notes/Architecture.md#reference:static',
      'example-typescript/packages/app/src/index.ts->example-typescript/packages/app/src/utils.ts#import',
      'example-typescript/packages/app/src/index.ts->example-typescript/packages/shared/src/types.ts#import',
      'example-typescript/packages/app/src/index.ts->example-typescript/packages/shared/src/types.ts#type-import',
      'example-typescript/packages/app/src/utils.ts->example-typescript/packages/feature-depth/src/deep.ts#import',
    ];

    const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !edgeIds.has(edgeId));
    expect(missingEdgeIds).toEqual([]);

    const persistedSnapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    const persistedTypeScriptFiles = persistedSnapshot.files
      .map(file => file.filePath)
      .filter(filePath => filePath.startsWith('example-typescript/'));

    expect(persistedTypeScriptFiles).toEqual(
      expect.arrayContaining([
        'example-typescript/packages/app/src/index.ts',
        'example-typescript/packages/app/src/orphan.ts',
        'example-typescript/packages/app/src/utils.ts',
        'example-typescript/packages/feature-depth/src/deep.ts',
        'example-typescript/packages/feature-depth/src/leaf.ts',
        'example-typescript/packages/shared/src/types.ts',
      ]),
    );
  });

  it('does not let plugin default filters hide monorepo source folders like packages', async () => {
    const workspaceRoot = await copyExamplesWorkspace();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'examples', index: 0 },
    ];

    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );

    await analyzer.initialize();
    analyzer.registry.register(createCSharpPlugin());

    const graph = await analyzer.analyze();
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    expect(nodeIds.has('example-typescript/packages/app/src/index.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/packages/app/src/utils.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/packages/shared/src/types.ts')).toBe(true);
  });
});
