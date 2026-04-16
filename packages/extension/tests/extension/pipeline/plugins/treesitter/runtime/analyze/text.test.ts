import { describe, expect, it } from 'vitest';
import type Parser from 'tree-sitter';
import {
  getIdentifierText,
  getLastPathSegment,
  getNodeText,
  joinModuleSpecifier,
} from '../../../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/text';

function createNode(type: string, text: string): Parser.SyntaxNode {
  return { type, text } as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyze/text', () => {
  it('reads identifier text only from supported identifier node kinds', () => {
    expect(getIdentifierText(createNode('identifier', 'alpha'))).toBe('alpha');
    expect(getIdentifierText(createNode('field_identifier', 'beta'))).toBe('beta');
    expect(getIdentifierText(createNode('package_identifier', 'gamma'))).toBe('gamma');
    expect(getIdentifierText(createNode('property_identifier', 'delta'))).toBe('delta');
    expect(getIdentifierText(createNode('type_identifier', 'epsilon'))).toBe('epsilon');
    expect(getIdentifierText(createNode('string', '"zeta"'))).toBeNull();
    expect(getIdentifierText(null)).toBeNull();
    expect(getIdentifierText(undefined)).toBeNull();
  });

  it('reads full node text from identifier and qualified node shapes only', () => {
    expect(getNodeText(createNode('identifier', 'alpha'))).toBe('alpha');
    expect(getNodeText(createNode('qualified_name', 'CodeGraphy.Runtime'))).toBe('CodeGraphy.Runtime');
    expect(getNodeText(createNode('dotted_name', 'codegraphy.runtime'))).toBe('codegraphy.runtime');
    expect(getNodeText(createNode('relative_import', '.runtime.tools'))).toBe('.runtime.tools');
    expect(getNodeText(createNode('scoped_identifier', 'Runtime::Tools'))).toBe('Runtime::Tools');
    expect(getNodeText(createNode('string', '"zeta"'))).toBeNull();
    expect(getNodeText(null)).toBeNull();
    expect(getNodeText(undefined)).toBeNull();
  });

  it('joins module specifiers with and without trailing separators', () => {
    expect(joinModuleSpecifier('', 'run')).toBe('run');
    expect(joinModuleSpecifier('codegraphy.runtime', 'run')).toBe('codegraphy.runtime.run');
    expect(joinModuleSpecifier('codegraphy.runtime.', 'run')).toBe('codegraphy.runtime.run');
  });

  it('returns the last path segment and falls back to the original specifier when no segment exists', () => {
    expect(getLastPathSegment('codegraphy.runtime.run', '.')).toBe('run');
    expect(getLastPathSegment('/workspace/src/main.ts', '/')).toBe('main.ts');
    expect(getLastPathSegment('////', '/')).toBe('////');
  });
});
