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
        kind: 'include',
        sourceId: 'core:treesitter:include',
        type: 'include',
        specifier: 'lib/widget.hpp',
        fromFilePath: appPath,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'include',
        sourceId: 'core:treesitter:include',
        type: 'include',
        specifier: 'vector',
        fromFilePath: appPath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'Widget',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:class:Runner`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'overrides',
        sourceId: 'core:treesitter:override',
        specifier: 'render',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:method:Runner::render`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'make_widget',
        variant: 'make_widget',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'render',
        variant: 'render',
        fromFilePath: appPath,
        fromSymbolId: `${appPath}:function:boot`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
    ]));
    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'namespace', name: 'app' }),
      expect.objectContaining({ filePath: appPath, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'Runner::run' }),
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
        sourceId: 'core:treesitter:call',
        specifier: 'Widget',
        fromFilePath: widgetPath,
        fromSymbolId: `${widgetPath}:function:make_widget`,
        resolvedPath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/lib/widget.hpp'),
      }),
    ]));
  });

  it('extracts C++ graph scope symbol controls separately', async () => {
    const workspaceRoot = await createWorkspace({});
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      'namespace taskrunner {',
      'using TaskId = unsigned long;',
      'enum class Priority { normal };',
      'class Task {};',
      'template <typename Item>',
      'class TaskQueue {',
      'public:',
      '  void push(Item item) {}',
      '};',
      'class Runner {',
      'public:',
      '  void run();',
      '};',
      'void Runner::run() {}',
      'Task make_task() { return Task{}; }',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'namespace', name: 'taskrunner' }),
      expect.objectContaining({ filePath: appPath, kind: 'alias', name: 'TaskId' }),
      expect.objectContaining({ filePath: appPath, kind: 'enum', name: 'Priority' }),
      expect.objectContaining({ filePath: appPath, kind: 'class', name: 'Task' }),
      expect.objectContaining({ filePath: appPath, kind: 'template', name: 'TaskQueue' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'TaskQueue::push' }),
      expect.objectContaining({ filePath: appPath, kind: 'method', name: 'Runner::run' }),
      expect.objectContaining({ filePath: appPath, kind: 'function', name: 'make_task' }),
    ]));
    expect(result?.symbols).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'class', name: 'TaskQueue' }),
      expect.objectContaining({ kind: 'type', name: 'TaskId' }),
    ]));
  });

  it('extracts C++ variable controls by declaration site', async () => {
    const workspaceRoot = await createWorkspace({});
    const appPath = path.join(workspaceRoot, 'src/app.cpp');
    const source = [
      'namespace taskrunner {',
      'int next_task_id = 1000;',
      'constexpr int kDefaultPriority = 1;',
      'class Task {',
      'public:',
      '  void set_priority(const int* priorities, int priority) {',
      '    const int local_priority = priority;',
      '    int completed = local_priority;',
      '    for (const auto& next_priority : priorities) {',
      '      completed += next_priority;',
      '    }',
      '  }',
      'private:',
      '  int id_;',
      '};',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(appPath, source, workspaceRoot);

    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath: appPath, kind: 'global', name: 'next_task_id' }),
      expect.objectContaining({ filePath: appPath, kind: 'constant', name: 'kDefaultPriority' }),
      expect.objectContaining({ filePath: appPath, kind: 'field', name: 'id_' }),
      expect.objectContaining({ filePath: appPath, kind: 'parameter', name: 'priority' }),
      expect.objectContaining({ filePath: appPath, kind: 'local', name: 'local_priority' }),
      expect.objectContaining({ filePath: appPath, kind: 'local', name: 'completed' }),
      expect.objectContaining({ filePath: appPath, kind: 'local', name: 'next_priority' }),
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

  it('resolves C++ calls and inheritance through same-file and transitive declarations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/task.hpp': [
        '#pragma once',
        'const char* priority_name();',
        '',
      ].join('\n'),
      'src/worker.hpp': [
        '#pragma once',
        '#include "task.hpp"',
        'class Worker {',
        'public:',
        '  virtual void execute() = 0;',
        '};',
        'class ConsoleWorker : public Worker {',
        'public:',
        '  void execute() override;',
        '};',
        '',
      ].join('\n'),
    });
    const workerPath = path.join(workspaceRoot, 'src/worker.cpp');
    const source = [
      '#include "worker.hpp"',
      '',
      'void ConsoleWorker::execute() {',
      '  priority_name();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(workerPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'priority_name',
        fromSymbolId: `${workerPath}:method:ConsoleWorker::execute`,
        resolvedPath: path.join(workspaceRoot, 'src/task.hpp'),
        toFilePath: path.join(workspaceRoot, 'src/task.hpp'),
      }),
    ]));

    const headerPath = path.join(workspaceRoot, 'src/worker.hpp');
    const header = await fs.readFile(headerPath, 'utf8');
    const headerResult = await analyzeFileWithTreeSitter(headerPath, header, workspaceRoot);

    expect(headerResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Worker',
        fromSymbolId: `${headerPath}:class:ConsoleWorker`,
        resolvedPath: headerPath,
        toFilePath: headerPath,
      }),
      expect.objectContaining({
        kind: 'overrides',
        specifier: 'execute',
        fromSymbolId: `${headerPath}:class:ConsoleWorker`,
        toSymbolId: `${headerPath}:method:Worker::execute`,
        resolvedPath: headerPath,
        toFilePath: headerPath,
      }),
    ]));
  });

  it('resolves C++ same-file function calls to emitted function symbols', async () => {
    const workspaceRoot = await createWorkspace({});
    const seedPath = path.join(workspaceRoot, 'src/seed.cpp');
    const source = [
      'int make_task() {',
      '  return 1;',
      '}',
      '',
      'int seed_tasks() {',
      '  return make_task() + make_task();',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(seedPath, source, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'make_task',
        variant: 'make_task',
        fromSymbolId: `${seedPath}:function:seed_tasks`,
        resolvedPath: seedPath,
        toFilePath: seedPath,
        toSymbolId: `${seedPath}:function:make_task`,
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
        fromSymbolId: `${appPath}:method:Runner::update`,
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
