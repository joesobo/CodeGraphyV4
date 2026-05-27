import { describe, expect, it } from 'vitest';
import {
  getDelegatedTypeNames,
  getKotlinTypeKind,
  isInsideKotlinType,
} from '../../../src/treeSitter/runtime/analyzeKotlin/typeDeclarations';

function node(type: string, text = '', namedChildren: unknown[] = [], parent?: unknown): never {
  return {
    type,
    text,
    namedChildren,
    parent,
  } as never;
}

function delegationSpecifiers(userTypes: unknown[]): never {
  return {
    type: 'delegation_specifiers',
    descendantsOfType: (type: string) => (type === 'user_type' ? userTypes : []),
  } as never;
}

describe('treeSitter/analyzeKotlin/typeDeclarations', () => {
  it('maps Kotlin declaration text to graph symbol kinds', () => {
    expect(getKotlinTypeKind(node('class_declaration', 'interface Runnable'))).toBe('interface');
    expect(getKotlinTypeKind(node('class_declaration', '  enum class Status'))).toBe('enum');
    expect(getKotlinTypeKind(node('class_declaration', 'data class User'))).toBe('class');
  });

  it('extracts delegated type names from Kotlin delegation specifiers', () => {
    const declaration = node('class_declaration', '', [
      node('modifier', 'sealed'),
      delegationSpecifiers([
        node('user_type', '', [node('identifier', 'BaseRunner')]),
        node('user_type', '', [node('type_arguments', '<T>')]),
        node('user_type', '', [node('identifier', 'RunnableThing')]),
      ]),
    ]);

    expect(getDelegatedTypeNames(declaration)).toEqual(['BaseRunner', 'RunnableThing']);
    expect(getDelegatedTypeNames(node('class_declaration'))).toEqual([]);
  });

  it('detects Kotlin declarations nested inside type declarations', () => {
    const packageNode = node('package_header');
    const classNode = node('class_declaration', '', [], packageNode);
    const objectNode = node('object_declaration', '', [], packageNode);

    expect(isInsideKotlinType(node('function_declaration', '', [], classNode))).toBe(true);
    expect(isInsideKotlinType(node('function_declaration', '', [], objectNode))).toBe(true);
    expect(isInsideKotlinType(node('function_declaration', '', [], packageNode))).toBe(false);
  });
});
