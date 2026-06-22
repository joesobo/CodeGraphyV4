import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-treesitter-go-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeGo integration', () => {
  it('extracts Go symbols, imported package calls, references, and embedded struct inheritance', async () => {
    const workspaceRoot = await createWorkspace({
      'go.mod': 'module example-go\n\ngo 1.22.0\n',
      'internal/model/model.go': [
        'package model',
        '',
        'type Audited struct{}',
        'type Task struct{}',
        'type Result struct{}',
        'type Notifier interface { Send(message string) }',
        '',
      ].join('\n'),
    });
    const filePath = path.join(workspaceRoot, 'internal/service/service.go');
    const modelPath = path.join(workspaceRoot, 'internal/model/model.go');
    const source = [
      'package service',
      '',
      'import (',
      '  "strings"',
      '  "example-go/internal/model"',
      ')',
      '',
      'const DefaultStatus Status = "queued"',
      '',
      'type Runner interface {',
      '  Run(task model.Task) model.Result',
      '}',
      '',
      'type TaskRunner struct {',
      '  model.Audited',
      '  name string',
      '  notifier model.Notifier',
      '}',
      '',
      'type Status string',
      '',
      'func NewTaskRunner(name string, notifier model.Notifier) TaskRunner {',
      '  return TaskRunner{name: name, notifier: notifier}',
      '}',
      '',
      'func (runner TaskRunner) Run(task model.Task) model.Result {',
      '  normalized := strings.ToUpper(task.Title)',
      '  return model.Result{Summary: normalized, Status: string(DefaultStatus)}',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'interface', name: 'Runner' }),
      expect.objectContaining({ filePath, kind: 'struct', name: 'TaskRunner' }),
      expect.objectContaining({ filePath, kind: 'type', name: 'Status' }),
      expect.objectContaining({ filePath, kind: 'constant', name: 'DefaultStatus' }),
      expect.objectContaining({ filePath, kind: 'function', name: 'NewTaskRunner' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'Run' }),
      expect.objectContaining({ filePath, kind: 'local', name: 'normalized' }),
    ]));
    expect(result?.symbols).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'field', name: 'name' }),
      expect.objectContaining({ kind: 'parameter', name: 'task' }),
      expect.objectContaining({ kind: 'global' }),
    ]));
    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'strings',
        fromFilePath: filePath,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'import',
        sourceId: 'core:treesitter:import',
        specifier: 'example-go/internal/model',
        fromFilePath: filePath,
        resolvedPath: modelPath,
        toFilePath: modelPath,
      }),
      expect.objectContaining({
        kind: 'call',
        sourceId: 'core:treesitter:call',
        specifier: 'strings',
        fromFilePath: filePath,
        fromSymbolId: `${filePath}:method:Run`,
        resolvedPath: null,
        toFilePath: null,
      }),
      expect.objectContaining({
        kind: 'reference',
        sourceId: 'core:treesitter:reference',
        specifier: 'model.Task',
        fromFilePath: filePath,
        resolvedPath: modelPath,
        toFilePath: modelPath,
      }),
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'model.Audited',
        fromFilePath: filePath,
        fromSymbolId: `${filePath}:struct:TaskRunner`,
        resolvedPath: modelPath,
        toFilePath: modelPath,
      }),
    ]));

    const baselineResult = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot, {
      includeSymbols: false,
    });
    expect(baselineResult?.symbols).toEqual([]);
    expect(baselineResult?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        sourceId: 'core:treesitter:inherit',
        specifier: 'model.Audited',
        fromFilePath: filePath,
        resolvedPath: modelPath,
        toFilePath: modelPath,
      }),
    ]));
  });
});
