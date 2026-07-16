import { describe, expect, it } from 'vitest';
import {
  createActions,
  createSource,
} from './primaryActions.fixture';

describe('graph view provider path resolution actions', () => {
  it('allows opening concrete file nodes and blocks explicit folder or package nodes', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'src/app.ts', nodeType: 'file' },
          { id: 'src', nodeType: 'folder' },
          { id: 'pkg:react', nodeType: 'package' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('src/app.ts')).toBe(true);
    expect(actions.canOpenPath('src')).toBe(false);
    expect(actions.canOpenPath('pkg:react')).toBe(false);
  });

  it('blocks inferred root and nested folder paths when no explicit node exists', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'README.md', nodeType: 'file' },
          { id: 'src/app.ts', nodeType: 'file' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('(root)')).toBe(false);
    expect(actions.canOpenPath('src')).toBe(false);
    expect(actions.canOpenPath('docs')).toBe(true);
  });

  it('resolves symbol-backed graph nodes before opening file actions', async () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'symbol:wrong', nodeType: 'symbol', symbol: { filePath: 'wrong.ts' } },
          { id: 'symbol:App', nodeType: 'symbol', symbol: { filePath: 'src/app.ts' } },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    await actions.openSelectedNode('symbol:App');
    await actions.activateNode('symbol:App');
    await actions.openFile('symbol:App');
    await actions.revealInExplorer('symbol:App');
    await actions.getFileInfo('symbol:App');

    expect(source._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(source._activateNode).toHaveBeenCalledWith('src/app.ts');
    expect(source._openFile).toHaveBeenCalledWith('src/app.ts');
    expect(source._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(source._getFileInfo).toHaveBeenCalledWith('src/app.ts');
  });

  it('uses symbol-backed file paths when deciding if a graph node can open', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'symbol:Package', nodeType: 'symbol', symbol: { filePath: 'pkg:react' } },
          { id: 'symbol:File', nodeType: 'symbol', symbol: { filePath: 'src/app.ts' } },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('symbol:Package')).toBe(false);
    expect(actions.canOpenPath('symbol:File')).toBe(true);
  });

  it('blocks synthetic package paths even when no package node exists', () => {
    const actions = createActions(createSource());

    expect(actions.canOpenPath('pkg:missing')).toBe(false);
  });

  it('does not infer folders from folder, package, or package-reference nodes', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'src', nodeType: 'folder' },
          { id: 'workspace', nodeType: 'package' },
          { id: 'pkg:react', nodeType: 'file' },
          { id: 'src/nested-package', nodeType: 'package' },
          { id: 'src/nested-folder', nodeType: 'folder' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('(root)')).toBe(true);
    expect(actions.canOpenPath('src')).toBe(false);
    expect(actions.canOpenPath('workspace')).toBe(false);
  });

  it('does not infer the synthetic root folder from nested files alone', () => {
    const source = createSource({
      _graphData: {
        nodes: [
          { id: 'src/app.ts', nodeType: 'file' },
        ],
        edges: [],
      },
    });
    const actions = createActions(source);

    expect(actions.canOpenPath('(root)')).toBe(true);
  });

});
