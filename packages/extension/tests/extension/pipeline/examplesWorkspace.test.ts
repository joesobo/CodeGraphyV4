import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGDScriptPlugin } from '../../../../plugin-godot/src/plugin';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service';

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

    expect(edgeIds.has('example-python/src/main.py->example-python/src/config.py#import')).toBe(true);
    expect(edgeIds.has('example-python/src/main.py->example-python/src/services/api.py#import')).toBe(true);
    expect(edgeIds.has('example-go/main.go->example-go/internal/service/service.go#import')).toBe(true);
    expect(edgeIds.has('example-java/src/com/example/app/App.java->example-java/src/com/example/app/Helper.java#import')).toBe(true);
    expect(edgeIds.has('example-java/src/com/example/app/App.java->example-java/src/com/example/app/BaseService.java#inherit')).toBe(true);
    expect(edgeIds.has('example-rust/src/main.rs->example-rust/src/util.rs#import')).toBe(true);
    expect(edgeIds.has('example-rust/src/main.rs->example-rust/src/inner.rs#import')).toBe(true);
    expect(edgeIds.has('example-godot/scripts/player.gd->example-godot/scripts/utils/math_helpers.gd#load')).toBe(true);
    expect(edgeIds.has('example-godot/scripts/enemy.gd->example-godot/scripts/base/entity.gd#inherit')).toBe(true);
    expect(edgeIds.has('example-markdown/notes/Home.md->example-markdown/notes/Architecture.md#reference')).toBe(true);
    expect(edgeIds.has('example-markdown/src/commented.ts->example-markdown/notes/Architecture.md#reference')).toBe(true);
  });
});
