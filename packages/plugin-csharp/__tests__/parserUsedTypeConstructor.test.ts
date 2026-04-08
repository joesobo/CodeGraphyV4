import { describe, expect, it } from 'vitest';
import { collectConstructorTypes } from '../src/parserUsedTypeConstructor';

describe('collectConstructorTypes', () => {
  it('collects constructor calls with one or more spaces after new', () => {
    const types = new Set<string>();

    collectConstructorTypes(
      [
        'var single = new UserService();',
        'var multi = new   Repository<Client>();',
      ].join(' '),
      types,
    );

    expect(types).toEqual(new Set(['UserService', 'Repository']));
  });

  it('does not collect when there is no space after new', () => {
    const types = new Set<string>();

    collectConstructorTypes('var broken = newUserService();', types);

    expect(types.size).toBe(0);
  });

  it('does not collect when non-space characters appear between the type and call site', () => {
    const types = new Set<string>();

    collectConstructorTypes('var invalid = new UserService.Factory();', types);

    expect(types.size).toBe(0);
  });
});
