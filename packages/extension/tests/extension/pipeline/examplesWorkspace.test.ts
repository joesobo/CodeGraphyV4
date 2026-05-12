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

  it('documents a symbol-node demo story for every example workspace', async () => {
    const readme = await fs.readFile(path.join(sourceExamplesRoot, 'README.md'), 'utf8');
    const examples = [
      'example-typescript',
      'example-godot',
      'example-python',
      'example-csharp',
      'example-markdown',
      'example-rust',
      'example-java',
      'example-go',
      'example-c',
      'example-cpp',
      'example-kotlin',
      'example-php',
      'example-ruby',
      'example-haskell',
      'example-lua',
      'example-swift',
      'example-dart',
    ];

    expect(readme).toContain('## Symbol Node Stories');
    for (const example of examples) {
      expect(readme).toContain(`| \`${example}\` |`);

      const exampleReadme = await fs.readFile(
        path.join(sourceExamplesRoot, example, 'README.md'),
        'utf8',
      );

      expect(exampleReadme).toContain('## Symbol Node Demo');
      expect(exampleReadme).toContain('Suggested symbol check:');
      expect(exampleReadme).toContain('Expected behavior:');
    }
    expect(readme).toContain('Godot `class_name` declarations appear under Variable');
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
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const hasFileOrSymbolTargetEdge = (edgeId: string): boolean => {
      if (edgeIds.has(edgeId)) {
        return true;
      }

      const relationMarker = edgeId.lastIndexOf('#');
      const targetMarker = edgeId.indexOf('->');
      if (relationMarker === -1 || targetMarker === -1) {
        return false;
      }

      const fromAndTarget = edgeId.slice(0, relationMarker);
      const kind = edgeId.slice(relationMarker);
      const baseKind = `#${kind.slice(1).split(':')[0]}`;
      return Array.from(edgeIds).some(
        candidate =>
          candidate.startsWith(fromAndTarget) &&
          (candidate.endsWith(kind) || candidate.endsWith(baseKind)),
      );
    };

    const expectedEdgeIds = [
      'example-python/src/main.py->example-python/src/config.py#import',
      'example-python/src/main.py->example-python/src/services/api.py#import',
      'example-go/main.go->example-go/internal/service/service.go#import',
      'example-java/src/com/example/app/App.java->example-java/src/com/example/app/Helper.java#import',
      'example-java/src/com/example/app/App.java->example-java/src/com/example/app/BaseService.java#inherit',
      'example-rust/src/main.rs->example-rust/src/util.rs#import',
      'example-rust/src/main.rs->example-rust/src/inner.rs#import',
      'example-c/src/main.c->example-c/src/math/add.h#import:include',
      'example-c/src/math/add.c->example-c/src/math/add.h#import:include',
      'example-cpp/src/app.cpp->example-cpp/src/lib/widget.hpp#import:include',
      'example-cpp/src/lib/widget.cpp->example-cpp/src/lib/widget.hpp#import:include',
      'example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt->example-kotlin/src/main/kotlin/com/example/base/BaseRunner.kt#import',
      'example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt->example-kotlin/src/main/kotlin/com/example/base/BaseRunner.kt#inherit',
      'example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt->example-kotlin/src/main/kotlin/com/example/base/RunnableThing.kt#import',
      'example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt->example-kotlin/src/main/kotlin/com/example/base/RunnableThing.kt#inherit',
      'example-kotlin/src/main/kotlin/com/example/app/AppRunner.kt->example-kotlin/src/main/kotlin/com/example/model/User.kt#import',
      'example-php/src/App/Feature/Runner.php->example-php/src/App/Base/BaseRunner.php#import',
      'example-php/src/App/Feature/Runner.php->example-php/src/App/Base/BaseRunner.php#inherit',
      'example-php/src/App/Feature/Runner.php->example-php/src/App/Contracts/Runnable.php#import',
      'example-php/src/App/Feature/Runner.php->example-php/src/App/Contracts/Runnable.php#inherit',
      'example-php/src/App/Feature/Runner.php->example-php/src/App/Model/User.php#import',
      'example-ruby/lib/example_ruby.rb->example-ruby/lib/app/runner.rb#import',
      'example-ruby/lib/app/runner.rb->example-ruby/lib/base/base_runner.rb#import',
      'example-ruby/lib/app/runner.rb->example-ruby/lib/base/base_runner.rb#inherit',
      'example-ruby/lib/app/runner.rb->example-ruby/lib/model/user.rb#import',
      'example-haskell/src/Main.hs->example-haskell/src/App/Feature/Runner.hs#import',
      'example-haskell/src/App/Feature/Runner.hs->example-haskell/src/App/Model/User.hs#import',
      'example-lua/main.lua->example-lua/app/runner.lua#import',
      'example-lua/app/runner.lua->example-lua/app/model/user.lua#import',
      'example-swift/Sources/SwiftExample/main.swift->example-swift/Sources/RunnerSupport/Worker.swift#import',
      'example-dart/bin/sample_app.dart->example-dart/lib/app/runner.dart#import',
      'example-dart/lib/app/runner.dart->example-dart/lib/model/profile.dart#import',
      'example-dart/lib/app/runner.dart->example-dart/lib/model/user.dart#import',
      'example-godot/project.godot->example-godot/scenes/main.tscn#load:static',
      'example-godot/project.godot->example-godot/scripts/game_manager.gd#load:static',
      'example-godot/scripts/player.gd->example-godot/scripts/utils/math_helpers.gd#load:static',
      'example-godot/scripts/player.gd->example-godot/scenes/ui/loadout_preview.tscn#load:static',
      'example-godot/scripts/player.gd->example-godot/resources/player_loadout.tres#load:static',
      'example-godot/scripts/enemy.gd->example-godot/scripts/base/entity.gd#inherit:static',
      'example-godot/resources/player_loadout.tres->example-godot/scripts/data/player_loadout.gd#load:static',
      'example-godot/resources/player_loadout.tres->example-godot/textures/player_card.png#load:static',
      'example-godot/scenes/ui/loadout_preview.tscn->example-godot/resources/player_loadout.tres#load:static',
      'example-godot/scenes/ui/loadout_preview.tscn->example-godot/scripts/ui/loadout_preview.gd#load:static',
      'example-markdown/notes/Home.md->example-markdown/notes/Architecture.md#reference:static',
      'example-markdown/notes/Home.md->example-markdown/src/commented.ts#reference:static',
      'example-markdown/src/commented.ts->example-markdown/notes/Architecture.md#reference:static',
      'example-typescript/src/index.ts->example-typescript/src/utils.ts#buildGreeting:function#import',
      'example-typescript/src/index.ts->example-typescript/src/types.ts#UserName:type#type-import',
      'example-typescript/src/utils.ts->example-typescript/src/depth.ts#getDepthTarget:function#import',
    ];

    const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !hasFileOrSymbolTargetEdge(edgeId));
    expect(missingEdgeIds).toEqual([]);
    expect(nodeIds.has('example-typescript/src/index.ts#currentUser:constant')).toBe(true);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'example-typescript/src/index.ts#currentUser:constant',
        nodeType: 'variable',
        symbol: expect.objectContaining({
          kind: 'constant',
          name: 'currentUser',
        }),
      }),
    ]));

    const persistedSnapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    const persistedTypeScriptFiles = persistedSnapshot.files
      .map(file => file.filePath)
      .filter(filePath => filePath.startsWith('example-typescript/'));

    expect(persistedTypeScriptFiles).toEqual(
      expect.arrayContaining([
        'example-typescript/src/index.ts',
        'example-typescript/src/orphan.ts',
        'example-typescript/src/utils.ts',
        'example-typescript/src/depth.ts',
        'example-typescript/src/leaf.ts',
        'example-typescript/src/types.ts',
      ]),
    );
  });

  it('does not let plugin default filters hide TypeScript example source folders', async () => {
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

    expect(nodeIds.has('example-typescript/src/index.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/src/utils.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/src/types.ts')).toBe(true);
  });
});
