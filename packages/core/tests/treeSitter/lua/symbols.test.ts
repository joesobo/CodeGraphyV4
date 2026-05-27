import { describe, expect, it } from 'vitest';
import {
  handleLuaFunctionDeclaration,
  handleLuaVariableDeclaration,
} from '../../../src/treeSitter/runtime/analyzeLua/symbols';

function node(
  type: string,
  text = '',
  namedChildren: unknown[] = [],
  descendants: Record<string, unknown[]> = {},
): never {
  return {
    type,
    text,
    namedChildren,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName: (fieldName: string) => (fieldName === 'name' ? namedChildren[0] ?? null : null),
    descendantsOfType: (descendantType: string) => descendants[descendantType] ?? [],
  } as never;
}

describe('treeSitter/analyzeLua/symbols', () => {
  it('adds table symbols only for table-constructor assignments', () => {
    const symbols: unknown[] = [];
    const variableList = node('variable_list', '', [], {
      identifier: [node('identifier', 'Runner')],
    });
    const tableAssignment = node('assignment_statement', '', [], {
      variable_list: [variableList],
      table_constructor: [node('table_constructor', '{}')],
    });
    const scalarAssignment = node('assignment_statement', '', [], {
      variable_list: [node('variable_list', '', [], {
        identifier: [node('identifier', 'count')],
      })],
    });

    handleLuaVariableDeclaration(node('variable_declaration', '', [
      node('comment', '-- keep scanning'),
      tableAssignment,
    ]), '/workspace/app.lua', symbols as never);
    handleLuaVariableDeclaration(node('variable_declaration', '', [scalarAssignment]), '/workspace/app.lua', symbols as never);
    handleLuaVariableDeclaration(node('variable_declaration', '', [
      node('assignment_statement', '', [], {
        table_constructor: [node('table_constructor', '{}')],
      }),
    ]), '/workspace/app.lua', symbols as never);
    handleLuaVariableDeclaration(node('variable_declaration', '', [
      node('assignment_statement', '', [], {
        variable_list: [node('variable_list')],
        table_constructor: [node('table_constructor', '{}')],
      }),
    ]), '/workspace/app.lua', symbols as never);
    handleLuaVariableDeclaration(node('variable_declaration'), '/workspace/app.lua', symbols as never);

    expect(symbols).toEqual([
      expect.objectContaining({ filePath: '/workspace/app.lua', kind: 'table', name: 'Runner' }),
    ]);
  });

  it('adds named Lua function symbols and skips unnamed declarations', () => {
    const symbols: unknown[] = [];

    expect(handleLuaFunctionDeclaration(node('function_declaration', 'function run', [
      node('identifier', 'run'),
    ]), '/workspace/app.lua', symbols as never)).toEqual({ skipChildren: true });
    expect(handleLuaFunctionDeclaration(node('function_declaration'), '/workspace/app.lua', symbols as never)).toEqual({ skipChildren: true });

    expect(symbols).toEqual([
      expect.objectContaining({ filePath: '/workspace/app.lua', kind: 'function', name: 'run' }),
    ]);
  });
});
