import { describe, expect, it } from 'vitest';
import { prettifyIdentifier } from '../../../../../src/extension/graphView/controls/send/definitions/identifiers';

describe('extension/graphView/controls/send/definitions/identifiers', () => {
  it('removes the codegraphy prefix, splits separators, and title-cases each word', () => {
    expect(prettifyIdentifier('codegraphy:custom-edge_type')).toBe('Custom Edge Type');
  });

  it('keeps existing words while title-casing underscore and dash separated identifiers', () => {
    expect(prettifyIdentifier('plugin_markdown-route:id')).toBe('Plugin Markdown Route Id');
  });

  it('does not strip a codegraphy segment that appears after the prefix position', () => {
    expect(prettifyIdentifier('plugin-codegraphy:route')).toBe('Plugin Codegraphy Route');
  });

  it('collapses repeated separators into single spaces', () => {
    expect(prettifyIdentifier('alpha__beta--gamma::delta')).toBe('Alpha Beta Gamma Delta');
  });
});
