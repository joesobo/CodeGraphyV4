import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-cpp-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeCpp', () => {
  it('extracts C++ include relationships and useful symbols', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/widget.hpp': [
        '#pragma once',
        'class Widget {',
        'public:',
        '  virtual void render();',
        '};',
        '',
        'Widget make_widget();',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      '#include "lib/widget.hpp"',
      '#include <vector>',
      '',
      'namespace app {',
      'class Runner : public Widget {',
      'public:',
      '  void render() override {}',
      '  void run() {}',
      '};',
      '',
      'int boot() {',
      '  Runner runner;',
      '  Widget widget = make_widget();',
      '  widget.render();',
      '  runner.run();',
      '  return 0;',
      '}',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result).not.toBeNull();
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'lib/widget.hpp',
        fromFilePath: appPath,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'import',
        pluginId: 'codegraphy.treesitter',
        sourceId: 'codegraphy.treesitter:include',
        type: 'include',
        specifier: 'vector',
        fromFilePath: appPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'codegraphy.treesitter:inherit',
        specifier: 'Widget',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:class:Runner`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'overrides',
        sourceId: 'codegraphy.treesitter:override',
        specifier: 'render',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:method:render`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'make_widget',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'render',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'namespace', name: 'app' }),
      expect.objectContaining({ filePath: appPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'run' }),
      expect.objectContaining({ filePath: appPath, kind: 'function', name: 'boot' }),
    ]));
  });

  it('extracts C++ calls from implementation files to included declarations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/widget.hpp': [
        '#pragma once',
        'class Widget {',
        'public:',
        '  Widget();',
        '  virtual void render();',
        '};',
        '',
      ].join('\n'),
    });
    const widgetPath = path.join(workspaceRoot, 'src/lib/widget.cpp');
    const source = [
      '#include "widget.hpp"',
      '',
      'Widget make_widget() {',
      '  return Widget();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(widgetPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        sourceId: 'codegraphy.treesitter:call',
        specifier: 'Widget',
        fromFilePath: widgetPath,
        fromSymbolId: `${widgetPath}:function:make_widget`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
    ]));
  });

  it('resolves C++ inheritance and override targets from matching included declarations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/logger.hpp': [
        '#pragma once',
        'class Logger {',
        'public:',
        '  void log();',
        '};',
        '',
      ].join('\n'),
      'src/lib/widget.hpp': [
        '#pragma once',
        'class Widget {',
        'public:',
        '  virtual void render();',
        '};',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      '#include "lib/logger.hpp"',
      '#include "lib/widget.hpp"',
      '',
      'class Runner : public Widget {',
      'public:',
      '  void render() override {}',
      '};',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Widget',
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'overrides',
        specifier: 'render',
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
    ]));
  });

  it('extracts C++ inheritance from AST base clauses with structs, templates, and multiple bases', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/base.hpp': [
        '#pragma once',
        'template <typename T>',
        'struct Base {',
        '  virtual void update() = 0;',
        '};',
        '',
      ].join('\n'),
      'src/lib/logger.hpp': [
        '#pragma once',
        'class Logger {',
        'public:',
        '  virtual void update();',
        '};',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      '#include "lib/base.hpp"',
      '#include "lib/logger.hpp"',
      '',
      'struct Runner final : public Base<Runner>, private Logger {',
      '  void update() const override final {}',
      '};',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Base',
        fromSymbolId: `${appPath}:struct:Runner`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/base.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/base.hpp'),
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Logger',
        fromSymbolId: `${appPath}:struct:Runner`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/logger.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/logger.hpp'),
      }),
      expect.objectContaining({
        kind: 'overrides',
        specifier: 'update',
        fromSymbolId: `${appPath}:method:update`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/base.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/base.hpp'),
      }),
    ]));
  });

  it('does not resolve unknown C++ inheritance or overrides to the only included header', async () => {
    const workspaceRoot = await createWorkspace({
      'src/lib/widget.hpp': [
        '#pragma once',
        'class Widget {',
        'public:',
        '  virtual void render();',
        '};',
        '',
      ].join('\n'),
    });
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const headerPath = path.join(workspaceRoot, 'src/lib/widget.hpp');
    const source = [
      '#include "lib/widget.hpp"',
      '',
      'class Runner : public MissingBase {',
      'public:',
      '  void render() override {}',
      '};',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'MissingBase',
        resolvedPath: headerPath,
      }),
      expect.objectContaining({
        kind: 'overrides',
        specifier: 'render',
        resolvedPath: headerPath,
      }),
    ]));
  });
});
