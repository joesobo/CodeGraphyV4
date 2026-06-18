import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeFileWithTreeSitter } from '../../../../src/treeSitter/runtime/analyze';

describe('pipeline/plugins/treesitter/runtime/analyzeCSharp symbols', () => {
  it('extracts C# graph scope symbols from declaration sites', async () => {
    const workspaceRoot = '/workspace';
    const filePath = path.join(workspaceRoot, 'src/Runner.cs');
    const source = [
      'namespace ExampleCSharp',
      '{',
      '    public delegate void TaskCompleted(DispatchTask task, DispatchResult result);',
      '    public interface ITaskQueue',
      '    {',
      '        int Count { get; }',
      '        void Enqueue(DispatchTask task);',
      '    }',
      '    public readonly struct TaskId',
      '    {',
      '        private readonly string _value;',
      '        public TaskId(string value) { _value = value; }',
      '        public string Value { get { return _value; } }',
      '    }',
      '    public enum DispatchStatus { Pending, Completed }',
      '    public record DispatchTask(TaskId Id, DispatchStatus Status);',
      '    public record DispatchResult(TaskId TaskId, DispatchStatus Status, string Message);',
      '    public class TaskDispatcher',
      '    {',
      '        public const int DefaultMaxRetries = 2;',
      '        private readonly ITaskQueue _queue;',
      '        public event TaskCompleted? Completed;',
      '        public TaskDispatcher(ITaskQueue queue) { _queue = queue; }',
      '        public DispatchResult Dispatch(DispatchTask task)',
      '        {',
      '            const int retryFloor = 1;',
      '            var attempts = retryFloor;',
      '            DispatchResult BuildMessage(DispatchTask dispatchedTask)',
      '            {',
      '                var result = new DispatchResult(dispatchedTask.Id, dispatchedTask.Status, "done");',
      '                return result;',
      '            }',
      '            return BuildMessage(task);',
      '        }',
      '    }',
      '}',
      '',
    ].join('\n');

    const result = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot);

    expect(result?.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ filePath, kind: 'delegate', name: 'TaskCompleted' }),
      expect.objectContaining({ filePath, kind: 'interface', name: 'ITaskQueue' }),
      expect.objectContaining({ filePath, kind: 'struct', name: 'TaskId' }),
      expect.objectContaining({ filePath, kind: 'enum', name: 'DispatchStatus' }),
      expect.objectContaining({ filePath, kind: 'record', name: 'DispatchTask' }),
      expect.objectContaining({ filePath, kind: 'record', name: 'DispatchResult' }),
      expect.objectContaining({ filePath, kind: 'class', name: 'TaskDispatcher' }),
      expect.objectContaining({ filePath, kind: 'constructor', name: 'TaskId' }),
      expect.objectContaining({ filePath, kind: 'constructor', name: 'TaskDispatcher' }),
      expect.objectContaining({ filePath, kind: 'property', name: 'Count' }),
      expect.objectContaining({ filePath, kind: 'property', name: 'Value' }),
      expect.objectContaining({ filePath, kind: 'event', name: 'Completed' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'Dispatch' }),
      expect.objectContaining({ filePath, kind: 'method', name: 'BuildMessage' }),
      expect.objectContaining({ filePath, kind: 'constant', name: 'DefaultMaxRetries' }),
      expect.objectContaining({ filePath, kind: 'constant', name: 'retryFloor' }),
      expect.objectContaining({ filePath, kind: 'field', name: '_value' }),
      expect.objectContaining({ filePath, kind: 'field', name: '_queue' }),
      expect.objectContaining({ filePath, kind: 'parameter', name: 'task' }),
      expect.objectContaining({ filePath, kind: 'parameter', name: 'queue' }),
      expect.objectContaining({ filePath, kind: 'parameter', name: 'dispatchedTask' }),
      expect.objectContaining({ filePath, kind: 'local', name: 'attempts' }),
      expect.objectContaining({ filePath, kind: 'local', name: 'result' }),
    ]));
    expect(result?.symbols).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'function' }),
      expect.objectContaining({ kind: 'global' }),
      expect.objectContaining({ kind: 'method', name: 'Enqueue' }),
    ]));
  });
});
