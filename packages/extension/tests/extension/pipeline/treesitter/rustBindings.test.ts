import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getRustCallBinding } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/rustBindings';
import { getIdentifierText, getLastPathSegment } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getLastPathSegment: vi.fn((value: string, separator: string) => value.split(separator).at(-1) ?? null),
}));

function createNode(overrides: Partial<{
  type: string;
  text: string;
  namedChildren: unknown[];
  childForFieldName: (name: string) => unknown;
}> = {}) {
  return {
    type: 'call_expression',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyze/rustBindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the function field identifier when available', () => {
    vi.mocked(getIdentifierText).mockReturnValue('run');
    const importedBinding = { importedName: 'run', specifier: 'crate::run', resolvedPath: null };
    const importedBindings = new Map([['run', importedBinding]]);
    const calleeNode = createNode({ type: 'identifier', text: 'run' });
    const childForFieldName = vi.fn((name: string) => {
      expect(name).toBe('function');
      return calleeNode;
    });

    expect(
      getRustCallBinding(
        createNode({ childForFieldName, namedChildren: [createNode()] }) as never,
        importedBindings,
      ),
    ).toBe(importedBinding);
    expect(getIdentifierText).toHaveBeenCalledWith(calleeNode);
  });

  it('falls back to the first named child and resolves scoped identifiers by their last path segment', () => {
    vi.mocked(getIdentifierText).mockReturnValue(null);
    const importedBinding = { importedName: 'run', specifier: 'crate::run', resolvedPath: null };
    const importedBindings = new Map([['run', importedBinding]]);
    const calleeNode = createNode({ type: 'scoped_identifier', text: 'crate::services::run' });

    expect(
      getRustCallBinding(
        createNode({ namedChildren: [calleeNode] }) as never,
        importedBindings,
      ),
    ).toBe(importedBinding);
    expect(getLastPathSegment).toHaveBeenCalledWith('crate::services::run', '::');
  });

  it('returns null when the call does not resolve to a known imported binding', () => {
    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(
      getRustCallBinding(
        createNode({ namedChildren: [createNode({ type: 'field_expression', text: 'service.run' })] }) as never,
        new Map(),
      ),
    ).toBeNull();
  });

  it('does not split non-scoped callees when the identifier text is missing', () => {
    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(
      getRustCallBinding(
        createNode({ namedChildren: [createNode({ type: 'field_expression', text: 'crate::run' })] }) as never,
        new Map([['run', { importedName: 'run', specifier: 'crate::run', resolvedPath: null }]]),
      ),
    ).toBeNull();
    expect(getLastPathSegment).not.toHaveBeenCalled();
  });

  it('returns null when the call has no function field or named children', () => {
    vi.mocked(getIdentifierText).mockReturnValue(null);

    expect(
      getRustCallBinding(createNode() as never, new Map()),
    ).toBeNull();
    expect(getIdentifierText).toHaveBeenCalledWith(undefined);
    expect(getLastPathSegment).not.toHaveBeenCalled();
  });
});
