import { describe, expect, it } from 'vitest';
import {
  handlePhpFunctionDefinition,
  handlePhpMethodDeclaration,
  handlePhpTypeDeclaration,
} from '../../../src/treeSitter/runtime/analyzePhp/symbols';

function node(
  type: string,
  text = '',
  namedChildren: unknown[] = [],
  fields: Record<string, unknown> = {},
): never {
  return {
    type,
    text,
    namedChildren,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName: (fieldName: string) => fields[fieldName] ?? null,
  } as never;
}

describe('treeSitter/analyzePhp/symbols', () => {
  it('adds PHP type symbols and inherit relations from base and interface clauses', () => {
    const symbols: unknown[] = [];
    const relations: unknown[] = [];
    const declaration = node('interface_declaration', 'interface Runner', [
      node('base_clause', '', [
        node('name', 'BaseRunner'),
      ]),
      node('class_interface_clause', '', [
        node('qualified_name', 'App\\Contracts\\Runnable'),
      ]),
    ], {
      name: node('name', 'Runner'),
    });

    handlePhpTypeDeclaration(
      declaration,
      '/workspace/Runner.php',
      null,
      null,
      relations as never,
      symbols as never,
      new Map([
        ['BaseRunner', { specifier: 'BaseRunner', resolvedPath: '/workspace/BaseRunner.php' }],
      ]) as never,
    );

    expect(symbols).toEqual([
      expect.objectContaining({ filePath: '/workspace/Runner.php', kind: 'interface', name: 'Runner' }),
    ]);
    expect(relations).toEqual([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'BaseRunner',
        resolvedPath: '/workspace/BaseRunner.php',
      }),
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'App\\Contracts\\Runnable',
        resolvedPath: null,
      }),
    ]);
  });

  it('skips unnamed PHP type, function, and method symbols', () => {
    const symbols: unknown[] = [];
    const relations: unknown[] = [];

    handlePhpTypeDeclaration(node('class_declaration'), '/workspace/Runner.php', null, null, relations as never, symbols as never, new Map());
    handlePhpFunctionDefinition(node('function_definition'), '/workspace/Runner.php', symbols as never);
    handlePhpMethodDeclaration(node('method_declaration'), '/workspace/Runner.php', symbols as never);

    expect(symbols).toEqual([]);
    expect(relations).toEqual([]);
  });

  it('adds PHP function and method symbols while skipping children', () => {
    const symbols: unknown[] = [];

    expect(handlePhpFunctionDefinition(node('function_definition', 'function boot', [], {
      name: node('name', 'boot'),
    }), '/workspace/Runner.php', symbols as never)).toEqual({ skipChildren: true });
    expect(handlePhpMethodDeclaration(node('method_declaration', 'function run', [], {
      name: node('name', 'run'),
    }), '/workspace/Runner.php', symbols as never)).toEqual({ skipChildren: true });

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'function', name: 'boot' }),
      expect.objectContaining({ kind: 'method', name: 'run' }),
    ]);
  });
});
