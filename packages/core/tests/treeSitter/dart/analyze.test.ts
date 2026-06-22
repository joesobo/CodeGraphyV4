import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-dart-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeDart', () => {
  it('extracts Dart import relationships, simple inheritance, references, and supported symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'lib/model/profile.dart': 'class Profile { final String name; Profile(this.name); }\n',
      'lib/model/user.dart': 'class User { final String name; User(this.name); }\n',
      'lib/app/labels.dart': 'typedef RunLabel = String Function(Profile profile);\n',
      'lib/app/runner.dart': 'String boot(Profile profile) => profile.name;\n',
    });
    const runnerPath = path.join(workspaceRoot, 'lib/app/runner.dart');
    const source = [
      "import './labels.dart';",
      "import '../model/user.dart';",
      "import 'package:sample_app/model/profile.dart';",
      "import 'dart:convert';",
      '',
      'const int defaultRetries = 2;',
      'abstract class BaseRunner {}',
      'mixin Runnable {}',
      'enum RunMode { fast }',
      'extension ProfileAudit on Profile {',
      '  String get auditLabel => name.toLowerCase();',
      '}',
      '',
      'class Runner extends BaseRunner with Runnable {',
      '  final RunLabel labelFormatter;',
      '',
      '  String run(User user) {',
      '    final encoded = jsonEncode(user.name);',
      '    return jsonEncode(user.name);',
      '  }',
      '}',
      '',
      'String boot(Profile profile) {',
      '  return Runner().run(User(profile.name));',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(runnerPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: './labels.dart',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'lib/app/labels.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/app/labels.dart'),
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: '../model/user.dart',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'lib/model/user.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/model/user.dart'),
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'package:sample_app/model/profile.dart',
        fromFilePath: runnerPath,
        resolvedPath: path.join(workspaceRoot, 'lib/model/profile.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/model/profile.dart'),
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'dart:convert',
        fromFilePath: runnerPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'BaseRunner',
        fromFilePath: runnerPath,
        resolvedPath: runnerPath,
        toFilePath: runnerPath,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'Runnable',
        fromFilePath: runnerPath,
        resolvedPath: runnerPath,
        toFilePath: runnerPath,
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'core:treesitter:reference',
        specifier: 'Profile',
        fromFilePath: runnerPath,
        fromSymbolId: `${runnerPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'lib/model/profile.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/model/profile.dart'),
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'core:treesitter:reference',
        specifier: 'User',
        fromFilePath: runnerPath,
        fromSymbolId: `${runnerPath}:method:run`,
        resolvedPath: path.join(workspaceRoot, 'lib/model/user.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/model/user.dart'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'User',
        fromFilePath: runnerPath,
        fromSymbolId: `${runnerPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'lib/model/user.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/model/user.dart'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'run',
        variant: 'run',
        fromFilePath: runnerPath,
        fromSymbolId: `${runnerPath}:function:boot`,
        resolvedPath: runnerPath,
        toFilePath: runnerPath,
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'BaseRunner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'mixin', name: 'Runnable' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'enum', name: 'RunMode' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'extension', name: 'ProfileAudit' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'constant', name: 'defaultRetries' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'local', name: 'encoded' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'function', name: 'boot' }),
    ]));
    expect(result?.symbols).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: runnerPath, kind: 'method', name: 'auditLabel' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'field', name: 'labelFormatter' }),
      expect.objectContaining({ filePath: runnerPath, kind: 'parameter', name: 'user' }),
    ]));
  });

  it('extracts Dart calls to top-level functions from imported files', async () => {
    const workspaceRoot = await createWorkspace({
      'lib/app/runner.dart': 'String boot() => "ready";\n',
    });
    const mainPath = path.join(workspaceRoot, 'bin/sample_app.dart');
    const source = [
      "import 'package:sample_app/app/runner.dart';",
      '',
      'void main() {',
      '  boot();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(mainPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'boot',
        fromFilePath: mainPath,
        fromSymbolId: `${mainPath}:function:main`,
        resolvedPath: path.join(workspaceRoot, 'lib/app/runner.dart'),
        toFilePath: path.join(workspaceRoot, 'lib/app/runner.dart'),
      }),
    ]));
  });
});
