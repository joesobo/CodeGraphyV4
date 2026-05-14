import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import {
  findDescendantByType,
  getDeclarationNameNode,
  getFunctionNameNode,
  hasFunctionDeclarator,
  isInsideClassLike,
} from '../../../src/treeSitter/runtime/analyzeCFamily/names';

function createNode({
  type,
  text = type,
  fields = {},
  namedChildren = [],
  parent,
}: {
  type: string;
  text?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
  parent?: Parser.SyntaxNode;
}): Parser.SyntaxNode {
  const node = {
    type,
    text,
    parent,
    namedChildren,
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;

  for (const child of namedChildren) {
    (child as { parent?: Parser.SyntaxNode }).parent ??= node;
  }

  return node;
}

describe('pipeline/plugins/treesitter/runtime/analyzeCFamily/names', () => {
  it('finds descendant nodes by type through nested named children', () => {
    const target = createNode({ type: 'identifier', text: 'boot' });
    const node = createNode({
      type: 'declaration',
      namedChildren: [
        createNode({
          type: 'primitive_type',
          text: 'int',
        }),
        createNode({
          type: 'function_declarator',
          namedChildren: [target],
        }),
      ],
    });

    expect(findDescendantByType(node, new Set(['identifier']))).toBe(target);
    expect(findDescendantByType(null, new Set(['identifier']))).toBeNull();
    expect(findDescendantByType(node, new Set(['type_identifier']))).toBeNull();
  });

  it('reads declaration names from fields before descendant fallback', () => {
    const namedField = createNode({ type: 'type_identifier', text: 'FieldName' });
    const fallbackName = createNode({ type: 'type_identifier', text: 'FallbackName' });

    expect(
      getDeclarationNameNode(
        createNode({
          type: 'class_specifier',
          fields: { name: namedField },
          namedChildren: [fallbackName],
        }),
      ),
    ).toBe(namedField);
    expect(
      getDeclarationNameNode(
        createNode({
          type: 'class_specifier',
          namedChildren: [fallbackName],
        }),
      ),
    ).toBe(fallbackName);
  });

  it('reads function names from declarator fields and named-child fallback declarators', () => {
    const fieldName = createNode({ type: 'identifier', text: 'fromField' });
    const fallbackName = createNode({ type: 'identifier', text: 'fromChild' });
    const nonFunctionChild = createNode({
      type: 'parenthesized_declarator',
      namedChildren: [createNode({ type: 'identifier', text: 'notAFunction' })],
    });

    expect(
      getFunctionNameNode(
        createNode({
          type: 'function_definition',
          fields: {
            declarator: createNode({
              type: 'function_declarator',
              namedChildren: [fieldName],
            }),
          },
        }),
      ),
    ).toBe(fieldName);
    expect(
      getFunctionNameNode(
        createNode({
          type: 'declaration',
          namedChildren: [
            createNode({
              type: 'function_declarator',
              namedChildren: [fallbackName],
            }),
          ],
        }),
      ),
    ).toBe(fallbackName);
    expect(
      getFunctionNameNode(
        createNode({
          type: 'declaration',
          namedChildren: [nonFunctionChild],
        }),
      ),
    ).toBeNull();
  });

  it('detects function declarators and class-like ancestors', () => {
    const classParent = createNode({ type: 'class_specifier' });
    const structParent = createNode({ type: 'struct_specifier' });
    const unionParent = createNode({ type: 'union_specifier' });
    const namespaceParent = createNode({ type: 'namespace_definition' });
    const methodNode = createNode({ type: 'function_definition', parent: classParent });
    const structMethodNode = createNode({ type: 'function_definition', parent: structParent });
    const unionMethodNode = createNode({ type: 'function_definition', parent: unionParent });
    const namespaceFunctionNode = createNode({ type: 'function_definition', parent: namespaceParent });
    const topLevelNode = createNode({ type: 'function_definition' });

    expect(
      hasFunctionDeclarator(
        createNode({
          type: 'declaration',
          namedChildren: [createNode({ type: 'function_declarator' })],
        }),
      ),
    ).toBe(true);
    expect(
      hasFunctionDeclarator(
        createNode({
          type: 'declaration',
          namedChildren: [createNode({ type: 'primitive_type', text: 'int' })],
        }),
      ),
    ).toBe(false);
    expect(hasFunctionDeclarator(createNode({ type: 'declaration' }))).toBe(false);
    expect(isInsideClassLike(methodNode)).toBe(true);
    expect(isInsideClassLike(structMethodNode)).toBe(true);
    expect(isInsideClassLike(unionMethodNode)).toBe(true);
    expect(isInsideClassLike(namespaceFunctionNode)).toBe(false);
    expect(isInsideClassLike(topLevelNode)).toBe(false);
  });
});
