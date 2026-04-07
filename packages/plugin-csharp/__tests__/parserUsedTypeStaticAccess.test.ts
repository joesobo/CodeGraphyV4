import { describe, expect, it } from 'vitest';
import { collectStaticAccessTypes } from '../src/parserUsedTypeStaticAccess';

describe('collectStaticAccessTypes', () => {
  const commonFrameworkTypes = [
    'String',
    'Console',
    'Math',
    'Convert',
    'Guid',
    'DateTime',
    'TimeSpan',
    'Task',
    'File',
    'Path',
    'Directory',
    'Environment',
  ] as const;

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

  it.each(commonFrameworkTypes)('ignores %s static access', frameworkType => {
    const types = new Set<string>();

    collectStaticAccessTypes(`${frameworkType}.Member;`, types);

    expect(types.size).toBe(0);
  });

  it('does not collect when the dot is not followed by an identifier start', () => {
    const types = new Set<string>();

    collectStaticAccessTypes('ProjectClock . 1; ProjectClock. 9;', types);

    expect(types.size).toBe(0);
  });
});
