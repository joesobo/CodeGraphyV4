import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePythonImportFromStatement } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFrom';
import {
  getIdentifierText,
  getLastPathSegment,
  joinModuleSpecifier,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes';
import {
  getPythonImportFromImportedNodes,
  getPythonImportFromModuleNode,
  getPythonImportedName,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFromNodes';
import { resolvePythonImportFromPath } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFromPath';
import { resolvePythonModulePath } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/paths';
import { addImportRelation } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getIdentifierText: vi.fn(),
  getLastPathSegment: vi.fn((value: string, separator: string) => value.split(separator).at(-1) ?? null),
  getNodeText: vi.fn((node?: { text?: string } | null) => node?.text ?? null),
  joinModuleSpecifier: vi.fn((moduleSpecifier: string, importedName: string) =>
    moduleSpecifier ? `${moduleSpecifier}.${importedName}` : importedName),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFromNodes', () => ({
  getPythonImportFromImportedNodes: vi.fn(),
  getPythonImportFromModuleNode: vi.fn(),
  getPythonImportedName: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/importFromPath', () => ({
  resolvePythonImportFromPath: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzePython/paths', () => ({
  resolvePythonModulePath: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation: vi.fn(),
}));

function createNode(
  overrides: Partial<{
    text: string;
    childForFieldName: (name: string) => unknown;
  }> = {},
) {
  return {
    text: '',
    childForFieldName: () => null,
    ...overrides,
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzePython/importFrom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a module import relation when the statement has no imported bindings', () => {
    const moduleNode = createNode({ text: 'codegraphy.runtime' });
    vi.mocked(getPythonImportFromModuleNode).mockReturnValue(moduleNode as never);
    vi.mocked(getPythonImportFromImportedNodes).mockReturnValue([]);
    vi.mocked(resolvePythonModulePath).mockReturnValue('/workspace/codegraphy/runtime.py');

    expect(
      handlePythonImportFromStatement(
        createNode() as never,
        '/workspace/app.py',
        '/workspace',
        [] as never[],
        new Map() as never,
      ),
    ).toEqual({ skipChildren: true });
    expect(addImportRelation).toHaveBeenCalledWith(
      [],
      '/workspace/app.py',
      'codegraphy.runtime',
      '/workspace/codegraphy/runtime.py',
    );
    expect(resolvePythonModulePath).toHaveBeenCalledWith(
      '/workspace/app.py',
      '/workspace',
      'codegraphy.runtime',
    );
  });

  it('adds aliased imported bindings and skips entries without an imported name', () => {
    const moduleNode = createNode({ text: 'codegraphy.runtime' });
    const aliasNode = { type: 'identifier', text: 'runner' };
    const importedNode = createNode({
      childForFieldName: (name: string) => {
        expect(name).toBe('alias');
        return aliasNode;
      },
    });
    const fallbackImportedNode = createNode({ childForFieldName: () => null });
    vi.mocked(getPythonImportFromModuleNode).mockReturnValue(moduleNode as never);
    vi.mocked(getPythonImportFromImportedNodes).mockReturnValue([
      importedNode as never,
      fallbackImportedNode as never,
      createNode() as never,
    ]);
    vi.mocked(getPythonImportedName)
      .mockReturnValueOnce('services.run')
      .mockReturnValueOnce('models.user')
      .mockReturnValueOnce(null);
    vi.mocked(getIdentifierText).mockReturnValueOnce('runner').mockReturnValueOnce(null);
    vi.mocked(resolvePythonImportFromPath)
      .mockReturnValueOnce('/workspace/codegraphy/runtime/services/run.py')
      .mockReturnValueOnce('/workspace/codegraphy/runtime/models/user.py');

    const importedBindings = new Map();
    const relations: never[] = [];

    expect(
      handlePythonImportFromStatement(
        createNode() as never,
        '/workspace/app.py',
        '/workspace',
        relations,
        importedBindings as never,
      ),
    ).toEqual({ skipChildren: true });
    expect(joinModuleSpecifier).toHaveBeenNthCalledWith(1, 'codegraphy.runtime', 'services.run');
    expect(joinModuleSpecifier).toHaveBeenNthCalledWith(2, 'codegraphy.runtime', 'models.user');
    expect(addImportRelation).toHaveBeenNthCalledWith(
      1,
      relations,
      '/workspace/app.py',
      'codegraphy.runtime.services.run',
      '/workspace/codegraphy/runtime/services/run.py',
    );
    expect(addImportRelation).toHaveBeenNthCalledWith(
      2,
      relations,
      '/workspace/app.py',
      'codegraphy.runtime.models.user',
      '/workspace/codegraphy/runtime/models/user.py',
    );
    expect(importedBindings.get('runner')).toEqual({
      importedName: 'services.run',
      resolvedPath: '/workspace/codegraphy/runtime/services/run.py',
      specifier: 'codegraphy.runtime.services.run',
    });
    expect(importedBindings.get('user')).toEqual({
      importedName: 'models.user',
      resolvedPath: '/workspace/codegraphy/runtime/models/user.py',
      specifier: 'codegraphy.runtime.models.user',
    });
    expect(getLastPathSegment).toHaveBeenCalledWith('models.user', '.');
  });
});
