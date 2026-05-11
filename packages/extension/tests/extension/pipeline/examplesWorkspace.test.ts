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
      'example-typescript/packages/app/src/index.ts->example-typescript/packages/app/src/utils.ts#buildGreeting:function#import',
      'example-typescript/packages/app/src/index.ts->example-typescript/packages/shared/src/types.ts#UserName:type#type-import',
      'example-typescript/packages/app/src/utils.ts->example-typescript/packages/feature-depth/src/deep.ts#getDepthTarget:function#import',
    ];

    const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !hasFileOrSymbolTargetEdge(edgeId));
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
