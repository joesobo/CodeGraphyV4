import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-kotlin-'));
  tempRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((workspaceRoot) =>
      fs.rm(workspaceRoot, { recursive: true, force: true }),
    ),
  );
});

describe('pipeline/plugins/treesitter/runtime/analyzeKotlin', () => {
  it('extracts Kotlin import relationships, simple inheritance, and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main/kotlin/com/example/base/BaseRunner.kt': 'package com.example.base\nopen class BaseRunner\n',
      'src/main/kotlin/com/example/base/RunnableThing.kt': 'package com.example.base\ninterface RunnableThing\n',
      'src/main/kotlin/com/example/model/User.kt': 'package com.example.model\ndata class User(val name: String)\n',
    });
    const appPath = path.join(workspaceRoot, 'src/main/kotlin/com/example/app/AppRunner.kt');
    const source = [
      'package com.example.app',
      '',
      'import com.example.base.BaseRunner',
      'import com.example.base.RunnableThing',
      'import com.example.model.User',
      'import kotlin.collections.List',
      '',
      'class AppRunner : BaseRunner(), RunnableThing {',
      '  fun run(users: List<User>): User = users.first()',
      '}',
      '',
      'object AppConfig',
      '',
      'fun boot(): AppRunner = AppRunner()',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'com.example.base.BaseRunner',
        fromFilePath: appPath,
        resolvedPath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/BaseRunner.kt'),
        toFilePath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/BaseRunner.kt'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'kotlin.collections.List',
        fromFilePath: appPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: appPath,
        resolvedPath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/BaseRunner.kt'),
        toFilePath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/BaseRunner.kt'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'RunnableThing',
        fromFilePath: appPath,
        resolvedPath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/RunnableThing.kt'),
        toFilePath: path.join(workspaceRoot, 'src/main/kotlin/com/example/base/RunnableThing.kt'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'class', name: 'AppRunner' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: appPath, kind: 'object', name: 'AppConfig' }),
      expect.objectContaining({ filePath: appPath, kind: 'function', name: 'boot' }),
    ]));
  });
});
