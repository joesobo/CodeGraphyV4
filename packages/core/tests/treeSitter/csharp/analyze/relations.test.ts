import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../src/treeSitter/runtime/analyze';
import { preAnalyzeCSharpTreeSitterFiles } from '../../../../src/treeSitter/runtime/csharpIndex';

const tempRoots: string[] = [];

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-csharp-relations-'));
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

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp relations', () => {
  it('emits C#-specific using, type, call, inherit, and implements relations', async () => {
    const workspaceRoot = await createWorkspace({
      'src/Contracts/ITaskQueue.cs': [
        'namespace ExampleCSharp.Contracts',
        '{',
        '    public interface ITaskQueue',
        '    {',
        '        void Enqueue(ExampleCSharp.Models.DispatchTask task);',
        '    }',
        '}',
        '',
      ].join('\n'),
      'src/Models/DispatchTask.cs': [
        'namespace ExampleCSharp.Models',
        '{',
        '    public record DispatchTask(TaskId Id);',
        '}',
        '',
      ].join('\n'),
      'src/Models/TaskId.cs': [
        'namespace ExampleCSharp.Models',
        '{',
        '    public readonly struct TaskId {}',
        '}',
        '',
      ].join('\n'),
      'src/Services/BaseTaskRunner.cs': [
        'namespace ExampleCSharp.Services',
        '{',
        '    public class BaseTaskRunner',
        '    {',
        '        protected void Complete(ExampleCSharp.Models.DispatchTask task) {}',
        '    }',
        '}',
        '',
      ].join('\n'),
    });
    const dispatcherPath = path.join(workspaceRoot, 'src/Services/TaskDispatcher.cs');
    const queuePath = path.join(workspaceRoot, 'src/Contracts/ITaskQueue.cs');
    const taskPath = path.join(workspaceRoot, 'src/Models/DispatchTask.cs');
    const taskIdPath = path.join(workspaceRoot, 'src/Models/TaskId.cs');
    const basePath = path.join(workspaceRoot, 'src/Services/BaseTaskRunner.cs');
    const dispatcherSource = [
      'using ExampleCSharp.Contracts;',
      'using ExampleCSharp.Models;',
      '',
      'namespace ExampleCSharp.Services',
      '{',
      '    public class TaskDispatcher : BaseTaskRunner, ITaskQueue',
      '    {',
      '        private readonly ITaskQueue _queue;',
      '        public TaskDispatcher(ITaskQueue queue) { _queue = queue; }',
      '        public void Enqueue(DispatchTask task)',
      '        {',
      '            var nextTask = new DispatchTask(new TaskId());',
      '            _queue.Enqueue(task);',
      '            Complete(nextTask);',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');

    await fs.writeFile(dispatcherPath, dispatcherSource, 'utf8');
    const files = await Promise.all(
      [
        queuePath,
        taskPath,
        taskIdPath,
        basePath,
        dispatcherPath,
      ].map(async (absolutePath) => ({
        absolutePath,
        content: await fs.readFile(absolutePath, 'utf8'),
      })),
    );
    await preAnalyzeCSharpTreeSitterFiles(files, workspaceRoot);

    const result = await analyzeFileWithTreeSitter(dispatcherPath, dispatcherSource, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'using',
        specifier: 'ExampleCSharp.Contracts',
        fromFilePath: dispatcherPath,
        resolvedPath: queuePath,
        toFilePath: queuePath,
      }),
      expect.objectContaining({
        kind: 'type',
        specifier: 'ITaskQueue',
        fromSymbolId: `${dispatcherPath}:field:_queue`,
        resolvedPath: queuePath,
        toFilePath: queuePath,
      }),
      expect.objectContaining({
        kind: 'type',
        specifier: 'DispatchTask',
        fromSymbolId: `${dispatcherPath}:parameter:task`,
        resolvedPath: taskPath,
        toFilePath: taskPath,
      }),
      expect.objectContaining({
        kind: 'call',
        specifier: 'DispatchTask',
        fromSymbolId: `${dispatcherPath}:method:Enqueue`,
        resolvedPath: taskPath,
        toFilePath: taskPath,
      }),
      expect.objectContaining({
        kind: 'call',
        specifier: 'TaskId',
        fromSymbolId: `${dispatcherPath}:method:Enqueue`,
        resolvedPath: taskIdPath,
        toFilePath: taskIdPath,
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'BaseTaskRunner',
        fromSymbolId: `${dispatcherPath}:class:TaskDispatcher`,
        resolvedPath: basePath,
        toFilePath: basePath,
      }),
      expect.objectContaining({
        kind: 'implements',
        specifier: 'ITaskQueue',
        fromSymbolId: `${dispatcherPath}:class:TaskDispatcher`,
        resolvedPath: queuePath,
        toFilePath: queuePath,
      }),
    ]));
  });

  it('emits Unity-style inherit and implements edges without false inherited calls', async () => {
    const workspaceRoot = await createWorkspace({
      'Assets/Scripts/Health.cs': [
        'using UnityEngine;',
        '',
        'public abstract class Health : MonoBehaviour',
        '{',
        '    protected abstract void Die();',
        '}',
        '',
      ].join('\n'),
      'Assets/Scripts/Enemy/IEnemyLifecycle.cs': [
        'public interface IEnemyLifecycle',
        '{',
        '    void Configure();',
        '}',
        '',
      ].join('\n'),
    });
    const enemyHealthPath = path.join(workspaceRoot, 'Assets/Scripts/Enemy/EnemyHealth.cs');
    const healthPath = path.join(workspaceRoot, 'Assets/Scripts/Health.cs');
    const lifecyclePath = path.join(workspaceRoot, 'Assets/Scripts/Enemy/IEnemyLifecycle.cs');
    const enemyHealthSource = [
      'public sealed class EnemyHealth : Health, IEnemyLifecycle',
      '{',
      '    public void Configure() {}',
      '    protected override void Die()',
      '    {',
      '        Destroy(gameObject);',
      '    }',
      '}',
      '',
    ].join('\n');

    await fs.writeFile(enemyHealthPath, enemyHealthSource, 'utf8');
    const files = await Promise.all(
      [
        healthPath,
        lifecyclePath,
        enemyHealthPath,
      ].map(async (absolutePath) => ({
        absolutePath,
        content: await fs.readFile(absolutePath, 'utf8'),
      })),
    );
    await preAnalyzeCSharpTreeSitterFiles(files, workspaceRoot);

    const result = await analyzeFileWithTreeSitter(enemyHealthPath, enemyHealthSource, workspaceRoot);

    expect(result?.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Health',
        fromSymbolId: `${enemyHealthPath}:class:EnemyHealth`,
        resolvedPath: healthPath,
        toFilePath: healthPath,
      }),
      expect.objectContaining({
        kind: 'implements',
        specifier: 'IEnemyLifecycle',
        fromSymbolId: `${enemyHealthPath}:class:EnemyHealth`,
        resolvedPath: lifecyclePath,
        toFilePath: lifecyclePath,
      }),
    ]));
    expect(result?.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'call',
        specifier: 'Destroy',
        resolvedPath: healthPath,
      }),
    ]));
  });
});
