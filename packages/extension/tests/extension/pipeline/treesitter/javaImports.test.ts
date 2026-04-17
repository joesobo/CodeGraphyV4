import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IAnalysisRelation } from '../../../../src/core/plugins/types/contracts';
import type { ImportedBinding } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/model';

const javaImportsHarness = vi.hoisted(() => ({
  addImportRelation: vi.fn(),
  getLastPathSegment: vi.fn(),
  getNodeText: vi.fn(),
  resolveJavaTypePath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots', () => ({
  resolveJavaTypePath: javaImportsHarness.resolveJavaTypePath,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/nodes', () => ({
  getLastPathSegment: javaImportsHarness.getLastPathSegment,
  getNodeText: javaImportsHarness.getNodeText,
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results', () => ({
  addImportRelation: javaImportsHarness.addImportRelation,
}));

import { handleJavaImportDeclaration } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/java/imports';

describe('pipeline/treesitter/javaImports', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('records resolved Java imports when a source root is available', () => {
    const relations: IAnalysisRelation[] = [];
    const importedBindings = new Map<string, ImportedBinding>();

    javaImportsHarness.getNodeText.mockReturnValue('java.util.List');
    javaImportsHarness.getLastPathSegment.mockReturnValue('List');
    javaImportsHarness.resolveJavaTypePath.mockReturnValue('src/main/java/java/util/List.java');

    handleJavaImportDeclaration(
      { namedChildren: [{}] } as never,
      'src/App.java',
      'src/main/java',
      relations,
      importedBindings,
    );

    expect(javaImportsHarness.resolveJavaTypePath).toHaveBeenCalledWith(
      'src/main/java',
      'java.util.List',
    );
    expect(javaImportsHarness.getLastPathSegment).toHaveBeenCalledWith('java.util.List', '.');
    expect(javaImportsHarness.addImportRelation).toHaveBeenCalledWith(
      relations,
      'src/App.java',
      'java.util.List',
      'src/main/java/java/util/List.java',
    );
    expect(importedBindings.get('List')).toEqual({
      importedName: 'java.util.List',
      resolvedPath: 'src/main/java/java/util/List.java',
      specifier: 'java.util.List',
    });
  });

  it('records unresolved Java imports when no source root is available', () => {
    const relations: IAnalysisRelation[] = [];
    const importedBindings = new Map<string, ImportedBinding>();

    javaImportsHarness.getNodeText.mockReturnValue('java.util.Map');
    javaImportsHarness.getLastPathSegment.mockReturnValue('Map');

    handleJavaImportDeclaration(
      { namedChildren: [{}] } as never,
      'src/App.java',
      null,
      relations,
      importedBindings,
    );

    expect(javaImportsHarness.resolveJavaTypePath).not.toHaveBeenCalled();
    expect(javaImportsHarness.getLastPathSegment).toHaveBeenCalledWith('java.util.Map', '.');
    expect(javaImportsHarness.addImportRelation).toHaveBeenCalledWith(
      relations,
      'src/App.java',
      'java.util.Map',
      null,
    );
    expect(importedBindings.get('Map')).toEqual({
      importedName: 'java.util.Map',
      resolvedPath: null,
      specifier: 'java.util.Map',
    });
  });

  it('ignores import declarations without a readable specifier', () => {
    const relations: IAnalysisRelation[] = [];
    const importedBindings = new Map<string, ImportedBinding>();

    javaImportsHarness.getNodeText.mockReturnValue('');

    handleJavaImportDeclaration(
      { namedChildren: [{}] } as never,
      'src/App.java',
      'src/main/java',
      relations,
      importedBindings,
    );

    expect(javaImportsHarness.resolveJavaTypePath).not.toHaveBeenCalled();
    expect(javaImportsHarness.addImportRelation).not.toHaveBeenCalled();
    expect(importedBindings.size).toBe(0);
  });
});
