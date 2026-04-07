import { describe, it, expect } from 'vitest';
import { collectDeclarationTypes } from '../src/parserUsedTypeDeclarations';

describe('collectDeclarationTypes', () => {
  const commonFrameworkTypes = [
    'String',
    'Object',
    'Boolean',
    'Int32',
    'Int64',
    'Double',
    'Decimal',
    'Byte',
    'Char',
    'Void',
  ] as const;

  it('collects project type declarations', () => {
    const types = new Set<string>();

    collectDeclarationTypes('UserService service = new UserService();', types);

    expect(types).toEqual(new Set(['UserService']));
  });

  it.each(commonFrameworkTypes)('ignores %s declarations', frameworkType => {
    const types = new Set<string>();

    collectDeclarationTypes(`${frameworkType} value = other;`, types);

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
