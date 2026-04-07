import { describe, it, expect } from 'vitest';
import { collectDeclarationTypes } from '../src/parserUsedTypeDeclarations';

describe('collectDeclarationTypes', () => {
  it('collects project type declarations', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService service = new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });

  it('ignores common framework type declarations', () => {
    const types = new Set<string>();

    collectDeclarationTypes(
      [
        'String name = "x";',
        'Object payload = value;',
        'Boolean enabled = true;',
        'Int32 count = 1;',
        'Int64 total = 2;',
        'Double ratio = 0.5;',
        'Decimal amount = 3;',
        'Byte flags = 4;',
        'Char initial = c;',
        'Void result = value;',
      ].join(' '),
      types,
    );

    expect(types.size).toBe(0);
  });

  it('requires lowercase or underscore variable names', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService Service = new UserService();', types);
    collectDeclarationTypes('UserService _service = new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });

  it('collects declarations with multiple spaces before the variable name', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService   service = new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });

  it('collects declarations when the assignment operator immediately follows the variable name', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService service=new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });

  it('does not collect when the token after the variable is not a declaration terminator', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService service + fallback;', types);

    expect(types.size).toBe(0);
  });
});
