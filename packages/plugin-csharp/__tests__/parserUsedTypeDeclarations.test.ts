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

    collectDeclarationTypes('String name = "x"; Int32 count = 1; Decimal total = 2;', types);

    expect(types.size).toBe(0);
  });

  it('requires lowercase or underscore variable names', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService Service = new UserService();', types);
    collectDeclarationTypes('UserService _service = new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });
});
