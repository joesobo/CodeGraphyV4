import { describe, expect, it } from 'vitest';
import {
  getSwiftDeclarationName,
  getSwiftTypeKind,
  isInsideSwiftType,
} from '../../../src/treeSitter/runtime/analyzeSwift/declarations';

function node(
  type: string,
  text = '',
  namedChildren: unknown[] = [],
  fieldChildren: Record<string, unknown> = {},
  parent?: unknown,
): never {
  return {
    type,
    text,
    namedChildren,
    parent,
    childForFieldName: (fieldName: string) => fieldChildren[fieldName] ?? null,
  } as never;
}

describe('treeSitter/analyzeSwift/declarations', () => {
  it('prefers explicit Swift declaration name fields before identifier fallbacks', () => {
    expect(getSwiftDeclarationName(node('class_declaration', '', [
      node('simple_identifier', 'FallbackName'),
    ], {
      name: node('type_identifier', 'FieldName'),
    }))).toBe('FieldName');

    expect(getSwiftDeclarationName(node('struct_declaration', '', [
      node('attribute', '@MainActor'),
      node('simple_identifier', 'Widget'),
    ]))).toBe('Widget');

    expect(getSwiftDeclarationName(node('extension_declaration', '', [
      node('type_identifier', 'Runnable'),
    ]))).toBe('Runnable');

    expect(getSwiftDeclarationName(node('initializer_declaration'))).toBeNull();
  });

  it('maps Swift declaration text to graph symbol kinds', () => {
    expect(getSwiftTypeKind(node('struct_declaration', 'struct User'))).toBe('struct');
    expect(getSwiftTypeKind(node('enum_declaration', '  enum Status'))).toBe('enum');
    expect(getSwiftTypeKind(node('actor_declaration', 'actor Runner'))).toBe('actor');
    expect(getSwiftTypeKind(node('class_declaration', 'final class Runner'))).toBe('class');
  });

  it('detects Swift declarations nested inside type declarations', () => {
    const rootNode = node('source_file');
    const classNode = node('class_declaration', '', [], {}, rootNode);
    const protocolNode = node('protocol_declaration', '', [], {}, rootNode);
    const extensionNode = node('extension_declaration', '', [], {}, rootNode);

    expect(isInsideSwiftType(node('function_declaration', '', [], {}, classNode))).toBe(true);
    expect(isInsideSwiftType(node('function_declaration', '', [], {}, protocolNode))).toBe(true);
    expect(isInsideSwiftType(node('function_declaration', '', [], {}, extensionNode))).toBe(true);
    expect(isInsideSwiftType(node('function_declaration', '', [], {}, rootNode))).toBe(false);
  });
});
