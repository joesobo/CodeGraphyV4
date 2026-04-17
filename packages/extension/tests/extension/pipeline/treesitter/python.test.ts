import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzePythonFile } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/python/analyze';

const {
  handlePythonImportStatement,
  handlePythonImportFromStatement,
  handlePythonClassDefinition,
  handlePythonFunctionDefinition,
  handlePythonCall,
  normalizeAnalysisResult,
  walkTree,
} = vi.hoisted(() => ({
  handlePythonImportStatement: vi.fn(),
  handlePythonImportFromStatement: vi.fn(),
  handlePythonClassDefinition: vi.fn(),
  handlePythonFunctionDefinition: vi.fn(),
  handlePythonCall: vi.fn(),
  normalizeAnalysisResult: vi.fn(),
  walkTree: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/python/imports', () => ({
  handlePythonImportStatement,
  handlePythonImportFromStatement,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/python/symbols', () => ({
  handlePythonCall,
  handlePythonClassDefinition,
  handlePythonFunctionDefinition,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  normalizeAnalysisResult,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/walk', () => ({
  walkTree,
}));

describe('extension/pipeline/treesitter/python', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeAnalysisResult.mockReturnValue({ filePath: 'src/app.py', symbols: [], relations: [] });
  });

  it('dispatches python syntax nodes to the matching handlers', () => {
    const rootNode = { type: 'module' };
    const walk = vi.fn();

    walkTree.mockImplementation((_rootNode, initialState, visit) => {
      const nodes = [
        { type: 'import_statement' },
        { type: 'import_from_statement' },
        { type: 'class_definition' },
        { type: 'function_definition' },
        { type: 'call' },
        { type: 'unknown' },
      ];
      for (const node of nodes) {
        visit(node, initialState, walk);
      }
    });

    const result = analyzePythonFile(
      'src/app.py',
      { rootNode } as never,
      '/workspace',
    );

    expect(walkTree).toHaveBeenCalledWith(rootNode, {}, expect.any(Function));
    expect(handlePythonImportStatement).toHaveBeenCalledWith(
      { type: 'import_statement' },
      'src/app.py',
      '/workspace',
      [],
      expect.any(Map),
    );
    expect(handlePythonImportFromStatement).toHaveBeenCalledWith(
      { type: 'import_from_statement' },
      'src/app.py',
      '/workspace',
      [],
      expect.any(Map),
    );
    expect(handlePythonClassDefinition).toHaveBeenCalledWith(
      { type: 'class_definition' },
      'src/app.py',
      [],
    );
    expect(handlePythonFunctionDefinition).toHaveBeenCalledWith(
      { type: 'function_definition' },
      'src/app.py',
      [],
      walk,
    );
    expect(handlePythonCall).toHaveBeenCalledWith(
      { type: 'call' },
      'src/app.py',
      [],
      expect.any(Map),
      undefined,
    );
    expect(normalizeAnalysisResult).toHaveBeenCalledWith('src/app.py', [], []);
    expect(result).toEqual({ filePath: 'src/app.py', symbols: [], relations: [] });
  });

  it('passes the current symbol id through to python call handlers', () => {
    walkTree.mockImplementation((_rootNode, _initialState, visit) => {
      visit({ type: 'call' }, { currentSymbolId: 'symbol:run' }, vi.fn());
    });

    analyzePythonFile('src/app.py', { rootNode: { type: 'module' } } as never, '/workspace');

    expect(handlePythonCall).toHaveBeenCalledWith(
      { type: 'call' },
      'src/app.py',
      [],
      expect.any(Map),
      'symbol:run',
    );
  });
});
