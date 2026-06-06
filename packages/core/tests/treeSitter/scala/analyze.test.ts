import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-scala-'));
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

describe('treeSitter/analyzeScala', () => {
  it('extracts Scala imports, inheritance, and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main/scala/com/example/base/BaseRunner.scala': 'package com.example.base\ntrait BaseRunner\n',
      'src/main/scala/com/example/model/User.scala': 'package com.example.model\ncase class User(name: String)\n',
    });
    const filePath = path.join(workspaceRoot, 'src/main/scala/com/example/app/AppRunner.scala');
    const source = [
      'package com.example.app',
      '',
      'import com.example.base.BaseRunner',
      'import com.example.model.User',
      '',
      'final case class AppRunner(service: User) extends BaseRunner {',
      '  def run(user: User): String = user.name',
      '}',
      '',
      'object AppConfig',
      'enum Status { case Ready }',
      'type UserName = String',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'codegraphy.treesitter:import',
        specifier: 'com.example.base.BaseRunner',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/base/BaseRunner.scala'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/base/BaseRunner.scala'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'class', name: 'AppRunner' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath, kind: 'object', name: 'AppConfig' }),
      expect.objectContaining({ filePath, kind: 'enum', name: 'Status' }),
      expect.objectContaining({ filePath, kind: 'type', name: 'UserName' }),
    ]));
  });

  it('extracts Scala call relationships from imports, same-package symbols, and typed receivers', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main/scala/com/example/app/AppRunner.scala': 'package com.example.app\nfinal case class AppRunner(service: com.example.service.UserService)\n',
      'src/main/scala/com/example/model/User.scala': 'package com.example.model\ncase class User(id: String)\n',
      'src/main/scala/com/example/service/UserService.scala': 'package com.example.service\nfinal case class UserService()\n',
      'src/main/scala/com/example/view/DashboardView.scala': 'package com.example.view\nfinal case class DashboardView()\n',
    });
    const filePath = path.join(workspaceRoot, 'src/main/scala/com/example/app/Main.scala');
    const source = [
      'package com.example.app',
      '',
      'import com.example.model.User',
      'import com.example.service.UserService',
      'import com.example.view.DashboardView',
      '',
      'object Main {',
      '  def main(args: Array[String]): Unit = {',
      '    val service = UserService.demo()',
      '    val view = DashboardView()',
      '    println(AppRunner(service).run(User("ada")))',
      '  }',
      '}',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'UserService',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/service/UserService.scala'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'DashboardView',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/view/DashboardView.scala'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'AppRunner',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/app/AppRunner.scala'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'User',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/model/User.scala'),
      }),
    ]));
  });

  it('extracts Scala call relationships from typed constructor parameters', async () => {
    const workspaceRoot = await createWorkspace({
      'src/main/scala/com/example/service/UserService.scala': 'package com.example.service\nfinal case class UserService()\n',
      'src/main/scala/com/example/view/DashboardView.scala': 'package com.example.view\nfinal case class DashboardView()\n',
    });
    const filePath = path.join(workspaceRoot, 'src/main/scala/com/example/app/AppRunner.scala');
    const source = [
      'package com.example.app',
      '',
      'import com.example.service.UserService',
      'import com.example.view.DashboardView',
      '',
      'final case class AppRunner(service: UserService, view: DashboardView) {',
      '  def run(): String = {',
      '    val enriched = service.enrich()',
      '    view.render(enriched)',
      '  }',
      '}',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'UserService',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/service/UserService.scala'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'DashboardView',
        fromFilePath: filePath,
        resolvedPath: path.join(workspaceRoot, 'src/main/scala/com/example/view/DashboardView.scala'),
      }),
    ]));
  });
});
