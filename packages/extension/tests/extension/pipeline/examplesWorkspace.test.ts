import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGDScriptPlugin } from '../../../../plugin-godot/src/plugin';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../../src/extension/pipeline/database/cache/storage';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import {
  getCodeGraphyConfiguration,
  initializeCurrentCodeGraphyConfiguration,
  resetCurrentCodeGraphyConfigurationForTest,
} from '../../../src/extension/repoSettings/current';
import { createAcceptanceWorkspaceCopyFilter } from '../../acceptance/graphView/workspace';

const sourceExamplesRoot = path.resolve(__dirname, '../../../../../examples');
const tempWorkspaceRoots: string[] = [];
const EXAMPLES_WORKSPACE_TEST_TIMEOUT_MS = 60_000;

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
  const copyFilter = createExamplesWorkspaceCopyFilter();

  await fs.cp(sourceExamplesRoot, targetPath, {
    recursive: true,
    filter: copyFilter,
  });
  tempWorkspaceRoots.push(targetPath);
  return targetPath;
}

function createExamplesWorkspaceCopyFilter(): (sourcePath: string) => boolean {
  const filtersByExampleName = new Map<string, (sourcePath: string) => boolean>();

  return (sourcePath: string): boolean => {
    const relativePath = path.relative(sourceExamplesRoot, sourcePath).split(path.sep).join('/');
    if (relativePath.length === 0) {
      return true;
    }

    const [exampleName] = relativePath.split('/');
    if (!exampleName) {
      return true;
    }

    let filter = filtersByExampleName.get(exampleName);
    if (!filter) {
      filter = createAcceptanceWorkspaceCopyFilter(path.join(sourceExamplesRoot, exampleName));
      filtersByExampleName.set(exampleName, filter);
    }

    return filter(sourcePath);
  };
}

afterAll(async () => {
  await Promise.all(
    tempWorkspaceRoots.splice(0).map((workspaceRoot) =>
      fs.rm(path.dirname(workspaceRoot), { recursive: true, force: true }),
    ),
  );
});

describe('WorkspacePipeline examples workspace', { timeout: EXAMPLES_WORKSPACE_TEST_TIMEOUT_MS }, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCurrentCodeGraphyConfigurationForTest();
  });

  afterEach(() => {
    resetCurrentCodeGraphyConfigurationForTest();
  });

  it('connects nested example projects when the repo-root examples folder is opened', async () => {
    const workspaceRoot = await copyExamplesWorkspace();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'examples', index: 0 },
    ];
    const context = createContext();
    initializeCurrentCodeGraphyConfiguration(context as unknown as vscode.ExtensionContext);
    await getCodeGraphyConfiguration().update('nodeVisibility', {
      symbol: true,
      variable: true,
      'symbol:constant': true,
    });

    const analyzer = new WorkspacePipeline(
      context as unknown as vscode.ExtensionContext,
    );

    await analyzer.initialize();
    analyzer.registry.unregister('codegraphy.typescript');
    analyzer.registry.unregister('codegraphy.gdscript');
    analyzer.registry.register(createTypeScriptPlugin());
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
      'example-rust/src/main.rs->example-rust/src/util.rs#import',
      'example-rust/src/main.rs->example-rust/src/inner.rs#import',
      'example-c/src/main.c->example-c/src/logger/logger.h#include:include',
      'example-c/src/main.c#main:function->example-c/src/logger/logger.h#logger_init:prototype#call',
      'example-c/src/main.c#main:function->example-c/src/logger/logger.h#logger_write:prototype#call',
      'example-c/src/main.c#main:function->example-c/src/logger/logger.h#logger_flush:prototype#call',
      'example-c/src/logger/logger.c->example-c/src/logger/logger.h#include:include',
      'example-c/src/logger/logger.c->example-c/src/logger/format.h#include:include',
      'example-c/src/logger/logger.c#logger_write:function->example-c/src/logger/format.h#logger_format_line:prototype#call',
      'example-c/src/logger/logger.c#logger_write:function->example-c/src/logger/logger.c#logger_accepts:function#call',
      'example-c/src/logger/format.c->example-c/src/logger/format.h#include:include',
      'example-c/src/logger/format.c#logger_format_line:function->example-c/src/logger/format.h#logger_level_name:prototype#call',
      'example-c/src/logger/format.h->example-c/src/logger/logger.h#include:include',
      'example-cpp/src/app.cpp->example-cpp/src/runner.hpp#include:include',
      'example-cpp/src/runner.cpp->example-cpp/src/runner.hpp#include:include',
      'example-cpp/src/runner.hpp->example-cpp/src/task_queue.hpp#include:include',
      'example-cpp/src/runner.hpp->example-cpp/src/worker.hpp#include:include',
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
      'example-swift/Sources/SwiftExample/main.swift->example-swift/Sources/RunnerSupport/Runnable.swift#import',
      'example-swift/Sources/SwiftExample/main.swift->example-swift/Sources/RunnerSupport/Worker.swift#inherit',
      'example-swift/Sources/SwiftExample/main.swift->example-swift/Sources/RunnerSupport/Runnable.swift#inherit',
      'example-dart/bin/sample_app.dart->example-dart/lib/app/runner.dart#import',
      'example-dart/lib/app/runner.dart->example-dart/lib/model/profile.dart#import',
      'example-dart/lib/app/runner.dart->example-dart/lib/model/user.dart#import',
      'example-godot/project.godot->example-godot/scenes/main.tscn#load:static',
      'example-godot/project.godot->example-godot/scripts/game_manager.gd#load:static',
      'example-godot/scripts/player.gd->example-godot/scripts/utils/math_helpers.gd#load:static',
      'example-godot/scripts/player.gd->example-godot/scenes/projectile.tscn#load:static',
      'example-godot/scripts/enemy.gd->example-godot/scripts/base/entity.gd#inherit:static',
      'example-godot/scripts/spawning/enemy_spawner.gd->example-godot/scenes/enemy.tscn#load:static',
      'example-godot/scripts/spawning/enemy_spawner.gd->example-godot/resources/enemy_spawn_config.tres#load:static',
      'example-godot/resources/enemy_spawn_config.tres->example-godot/scripts/data/spawn_config.gd#load:static',
      'example-godot/scenes/main.tscn->example-godot/scripts/main.gd#load:static',
      'example-godot/scenes/main.tscn->example-godot/scripts/spawning/enemy_spawner.gd#load:static',
      'example-godot/scenes/main.tscn->example-godot/scenes/player.tscn#load:static',
      'example-godot/scenes/main.tscn->example-godot/scenes/enemy.tscn#load:static',
      'example-godot/scenes/main.tscn->example-godot/scenes/ui/game_ui.tscn#load:static',
      'example-godot/scenes/player.tscn->example-godot/scripts/player.gd#load:static',
      'example-godot/scenes/player.tscn->example-godot/scripts/components/health_component.gd#load:static',
      'example-godot/scenes/player.tscn->example-godot/scenes/projectile.tscn#load:static',
      'example-godot/scenes/player.tscn->example-godot/scripts/ui/health_bar.gd#load:static',
      'example-markdown/notes/Home.md->example-markdown/notes/Architecture.md#reference:static',
      'example-markdown/notes/Home.md->example-markdown/src/commented.ts#reference:static',
      'example-markdown/src/commented.ts->example-markdown/notes/Architecture.md#reference:static',
      'example-javascript/src/index.js->example-javascript/src/utils.js#buildGreeting:function#import',
      'example-javascript/src/index.js->example-javascript/src/user.js#normalizeUserName:function#import',
      'example-javascript/src/utils.js->example-javascript/src/depth.js#getDepthTarget:function#import',
      'example-typescript/src/index.ts->example-typescript/src/palette.ts#buildPalette:function#import',
      'example-typescript/src/index.ts->example-typescript/src/types.ts#PaletteRecipe:interface#type-import',
      'example-typescript/src/palette.ts->example-typescript/src/harmony.ts#getAccentSwatch:function#import',
      'example-typescript/src/index.ts->example-typescript/src/alias/themePack.ts#codegraphy.typescript:alias-import',
    ];

    const missingEdgeIds = expectedEdgeIds.filter((edgeId) => !hasFileOrSymbolTargetEdge(edgeId));
    expect(missingEdgeIds).toEqual([]);
    expect(nodeIds.has('example-javascript/src/index.js#currentUser:constant')).toBe(true);
    expect(nodeIds.has('example-typescript/src/index.ts#currentMood:constant')).toBe(true);
    expect(graph.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'example-javascript/src/index.js#currentUser:constant',
        nodeType: 'variable',
        symbol: expect.objectContaining({
          kind: 'constant',
          name: 'currentUser',
        }),
      }),
      expect.objectContaining({
        id: 'example-typescript/src/index.ts#currentMood:constant',
        nodeType: 'variable',
        symbol: expect.objectContaining({
          kind: 'constant',
          name: 'currentMood',
        }),
      }),
    ]));
    const expectedStorySymbolIds = [
      'example-python/src/services/api.py#fetch_user:function',
      'example-python/src/utils/format.py#format_name:function',
      'example-markdown/src/commented.ts#parseCommentedLink:function',
      'example-go/internal/service/service.go#NewRunner:function',
      'example-c/src/logger/logger.h#Logger:struct',
      'example-c/src/logger/format.h#LogMessage:union',
      'example-c/src/logger/format.h#LogRecord:typedef',
      'example-c/src/logger/logger.c#logger_output_enabled:global',
      'example-cpp/src/runner.cpp#TaskRunner::run:method',
      'example-ruby/lib/app/runner.rb#call:method',
      'example-haskell/src/App/Feature/Runner.hs#Greeting:type',
      'example-lua/app/runner.lua#Runner.greet:function',
    ];
    const missingStorySymbolIds = expectedStorySymbolIds.filter((nodeId) => !nodeIds.has(nodeId));
    expect(missingStorySymbolIds).toEqual([]);

    const persistedSnapshot = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    const persistedJavaScriptFiles = persistedSnapshot.files
      .map(file => file.filePath)
      .filter(filePath => filePath.startsWith('example-javascript/'));
    const persistedTypeScriptFiles = persistedSnapshot.files
      .map(file => file.filePath)
      .filter(filePath => filePath.startsWith('example-typescript/'));

    expect(persistedJavaScriptFiles).toEqual(
      expect.arrayContaining([
        'example-javascript/src/index.js',
        'example-javascript/src/orphan.js',
        'example-javascript/src/utils.js',
        'example-javascript/src/depth.js',
        'example-javascript/src/leaf.js',
        'example-javascript/src/user.js',
      ]),
    );
    expect(persistedTypeScriptFiles).toEqual(
      expect.arrayContaining([
        'example-typescript/src/index.ts',
        'example-typescript/src/scratchpad.ts',
        'example-typescript/src/palette.ts',
        'example-typescript/src/swatches.ts',
        'example-typescript/src/lazyPreview.ts',
        'example-typescript/src/seedSettings.ts',
        'example-typescript/src/registry.ts',
        'example-typescript/src/themeLabels.ts',
        'example-typescript/src/harmony.ts',
        'example-typescript/src/types.ts',
        'example-typescript/src/alias/themePack.ts',
      ]),
    );
  });

  it('does not let optional plugin default filters hide TypeScript example source folders', async () => {
    const workspaceRoot = await copyExamplesWorkspace();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'examples', index: 0 },
    ];

    const analyzer = new WorkspacePipeline(
      createContext() as unknown as vscode.ExtensionContext,
    );

    await analyzer.initialize();
    analyzer.registry.unregister('codegraphy.gdscript');
    analyzer.registry.register(createGDScriptPlugin());

    const graph = await analyzer.analyze();
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    expect(nodeIds.has('example-typescript/src/index.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/src/palette.ts')).toBe(true);
    expect(nodeIds.has('example-typescript/src/types.ts')).toBe(true);
  });
});
