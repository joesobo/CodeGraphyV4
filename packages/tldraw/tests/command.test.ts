import path from 'node:path';
import type { IGraphData } from '@codegraphy-dev/core';
import { describe, expect, it, vi } from 'vitest';
import { runTldrawCommand, type TldrawCommandDependencies } from '../src/command';

const GRAPH = {
  nodes: [{ id: 'src/main.ts', label: 'main.ts', color: '#67E8F9', nodeType: 'file' }],
  edges: [],
} satisfies IGraphData;

function fixture() {
  const resolveDefaultDocumentPath = vi.fn<TldrawCommandDependencies['resolveDefaultDocumentPath']>(
    () => '/workspace/CodeGraphy.tldraw',
  );
  const findOpenDocument = vi.fn<TldrawCommandDependencies['findOpenDocument']>(async () => undefined);
  const indexWorkspace = vi.fn<TldrawCommandDependencies['indexWorkspace']>(async () => ({ graph: GRAPH }));
  const openDocument = vi.fn<TldrawCommandDependencies['openDocument']>(async () => undefined);
  const refreshOpenDocument = vi.fn<TldrawCommandDependencies['refreshOpenDocument']>(async () => undefined);
  const writeDocument = vi.fn<TldrawCommandDependencies['writeDocument']>(
    async input => ({ documentPath: input.targetPath }),
  );
  const dependencies: TldrawCommandDependencies = {
    resolveDefaultDocumentPath,
    cwd: () => '/workspace',
    findOpenDocument,
    indexWorkspace,
    openDocument,
    refreshOpenDocument,
    writeDocument,
  };
  return {
    dependencies,
    resolveDefaultDocumentPath,
    findOpenDocument,
    indexWorkspace,
    openDocument,
    refreshOpenDocument,
    writeDocument,
  };
}

describe('runTldrawCommand', () => {
  it('indexes the current workspace, creates the requested document, and opens it', async () => {
    const { dependencies, indexWorkspace, openDocument, writeDocument } = fixture();

    await expect(runTldrawCommand(['graph.tldraw'], dependencies)).resolves.toEqual({
      documentPath: path.resolve('/workspace', 'graph.tldraw'),
      workspaceRoot: '/workspace',
    });
    expect(indexWorkspace).toHaveBeenCalledWith('/workspace');
    expect(writeDocument).toHaveBeenCalledWith({
      graph: GRAPH,
      targetPath: path.resolve('/workspace', 'graph.tldraw'),
      workspaceRoot: '/workspace',
    });
    expect(openDocument).toHaveBeenCalledWith(
      path.resolve('/workspace', 'graph.tldraw'),
    );
  });

  it('creates or refreshes the default workspace document when no path is supplied', async () => {
    const { dependencies, resolveDefaultDocumentPath, writeDocument } = fixture();

    await runTldrawCommand([], dependencies);

    expect(resolveDefaultDocumentPath).toHaveBeenCalledWith('/workspace');
    expect(writeDocument).toHaveBeenCalledWith(expect.objectContaining({
      targetPath: '/workspace/CodeGraphy.tldraw',
    }));
  });

  it('refreshes the open default document in place without rewriting its archive', async () => {
    const {
      dependencies,
      findOpenDocument,
      openDocument,
      refreshOpenDocument,
      writeDocument,
    } = fixture();
    findOpenDocument.mockResolvedValue({ id: 'wd-1' });

    await runTldrawCommand([], dependencies);

    expect(writeDocument).not.toHaveBeenCalled();
    expect(refreshOpenDocument).toHaveBeenCalledWith({
      documentId: 'wd-1',
      graph: GRAPH,
      workspaceRoot: '/workspace',
    });
    expect(openDocument).not.toHaveBeenCalled();
  });
});
