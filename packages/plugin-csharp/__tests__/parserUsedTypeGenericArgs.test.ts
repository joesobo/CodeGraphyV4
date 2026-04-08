import { describe, expect, it } from 'vitest';
import { collectGenericArgumentTypes } from '../src/parserUsedTypeGenericArgs';

describe('collectGenericArgumentTypes', () => {
  it('collects simple generic argument types with or without inner spacing', () => {
    const types = new Set<string>();

    collectGenericArgumentTypes(
      [
        'List<UserModel> users;',
        'Dictionary< SessionState > sessions;',
      ].join(' '),
      types,
    );

    expect(types).toEqual(new Set(['UserModel', 'SessionState']));
  });

  it('does not collect when the generic argument has suffix tokens before >', () => {
    const types = new Set<string>();

    collectGenericArgumentTypes('List<UserModel[]> users;', types);

    expect(types.size).toBe(0);
  });
});
