import { describe, expect, it } from 'vitest';
import { collectStaticAccessTypes } from '../src/parserUsedTypeStaticAccess';

describe('collectStaticAccessTypes', () => {
  it('collects project static accesses across zero-space and spaced dot forms', () => {
    const types = new Set<string>();

    collectStaticAccessTypes(
      [
        'NoSpaceBefore.After();',
        'SpacedBefore .After();',
        'NoSpaceAfter. After();',
        'FullySpaced . After();',
      ].join(' '),
      types,
    );

    expect(types).toEqual(
      new Set(['NoSpaceBefore', 'SpacedBefore', 'NoSpaceAfter', 'FullySpaced']),
    );
  });

  it('ignores common framework static accesses', () => {
    const types = new Set<string>();

    collectStaticAccessTypes(
      [
        'String.IsNullOrEmpty(value);',
        'Console.WriteLine(value);',
        'Math.Abs(delta);',
        'Convert.ToInt32(raw);',
        'Guid.NewGuid();',
        'DateTime.UtcNow;',
        'TimeSpan.FromSeconds(1);',
        'Task.CompletedTask;',
        'File.ReadAllText(path);',
        'Path.Combine(root, leaf);',
        'Directory.Exists(path);',
        'Environment.GetEnvironmentVariable(name);',
      ].join(' '),
      types,
    );

    expect(types.size).toBe(0);
  });

  it('does not collect when the dot is not followed by an identifier start', () => {
    const types = new Set<string>();

    collectStaticAccessTypes('ProjectClock . 1; ProjectClock. 9;', types);

    expect(types.size).toBe(0);
  });
});
