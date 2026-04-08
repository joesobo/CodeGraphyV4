import { describe, expect, it } from 'vitest';
import { collectInheritanceTypes } from '../src/parserUsedTypeInheritance';

describe('collectInheritanceTypes', () => {
  it('collects inheritance targets with no space or multiple spaces after the colon', () => {
    const types = new Set<string>();

    collectInheritanceTypes(
      [
        'public class Worker:BaseService {}',
        'public class Handler :   MessageHandler {}',
      ].join(' '),
      types,
    );

    expect(types).toEqual(new Set(['BaseService', 'MessageHandler']));
  });
});
