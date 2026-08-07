import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bridge = vi.hoisted(() => ({
  chooseWorkspace: vi.fn(),
  clearRecentWorkspaces: vi.fn(async () => undefined),
  closeWorkspace: vi.fn(async () => undefined),
  initialWorkspace: vi.fn(async () => undefined),
  listRecentWorkspaces: vi.fn(async () => []),
  listenToDesktopMenu: vi.fn(async () => () => undefined),
  loadWorkspaceGraph: vi.fn(),
  readDesktopGraphSettings: vi.fn(),
  readWorkspaceFile: vi.fn(),
  saveWorkspaceFile: vi.fn(),
  writeDesktopGraphSettings: vi.fn(),
}));

vi.mock('./bridge', () => bridge);

import { useDesktopWorkspace } from './useDesktopWorkspace';

let currentWorkspace: ReturnType<typeof useDesktopWorkspace> | undefined;

function current(): ReturnType<typeof useDesktopWorkspace> {
  if (!currentWorkspace) throw new Error('Desktop workspace hook is not mounted.');
  return currentWorkspace;
}

function Harness(): null {
  currentWorkspace = useDesktopWorkspace();
  return null;
}

describe('desktop document and graph selection ownership', () => {
  beforeEach(() => {
    currentWorkspace = undefined;
    vi.clearAllMocks();
    bridge.initialWorkspace.mockResolvedValue(undefined);
    bridge.listRecentWorkspaces.mockResolvedValue([]);
    bridge.listenToDesktopMenu.mockResolvedValue(() => undefined);
    bridge.readWorkspaceFile.mockImplementation(async (path: string) => ({
      path,
      content: `export const path = ${JSON.stringify(path)};`,
      revision: 'revision-1',
    }));
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('clears graph focus and closes a File independently', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Harness />));
    await act(async () => current().selectFile('src/main.ts'));
    expect(current().document?.path).toBe('src/main.ts');
    expect(current().selectedGraphNodeId).toBe('src/main.ts');

    await act(async () => current().clearGraphSelection());
    expect(current().selectedGraphNodeId).toBeUndefined();
    expect(current().document?.path).toBe('src/main.ts');

    await act(async () => current().selectGraphNode('src/main.ts'));
    await act(async () => current().closeCurrentDocument());
    expect(current().document).toBeUndefined();
    expect(current().selectedGraphNodeId).toBe('src/main.ts');
    await act(async () => root.unmount());
  });

  it('keeps dirty File actions pending until the user cancels or discards', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Harness />));
    await act(async () => current().selectFile('src/main.ts'));
    await act(async () => current().setDraft('unsaved'));
    await act(async () => current().closeCurrentDocument());
    expect(current().document?.path).toBe('src/main.ts');
    expect(current().pendingFileAction).toEqual({ kind: 'close' });

    await act(async () => current().cancelPendingFileAction());
    expect(current().pendingFileAction).toBeUndefined();
    expect(current().document?.path).toBe('src/main.ts');

    await act(async () => current().closeCurrentDocument());
    await act(async () => current().finishPendingFileAction(false));
    expect(current().document).toBeUndefined();
    expect(current().dirty).toBe(false);
    await act(async () => root.unmount());
  });

  it('coalesces rapid File selections to the latest Rust read', async () => {
    const pendingReads = new Map<string, (document: {
      path: string;
      content: string;
      revision: string;
    }) => void>();
    bridge.readWorkspaceFile.mockImplementation((path: string) => new Promise((resolve) => {
      pendingReads.set(path, resolve);
    }));
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Harness />));
    const paths = Array.from({ length: 20 }, (_, index) => `src/file-${index}.ts`);

    await act(async () => {
      for (const path of paths) void current().selectFile(path);
      await Promise.resolve();
    });

    expect(bridge.readWorkspaceFile).toHaveBeenCalledTimes(1);
    expect(bridge.readWorkspaceFile).toHaveBeenLastCalledWith(paths[0]);
    await act(async () => {
      pendingReads.get(paths[0])?.({
        path: paths[0],
        content: '// superseded',
        revision: 'revision-first',
      });
      await Promise.resolve();
    });
    expect(bridge.readWorkspaceFile).toHaveBeenCalledTimes(2);
    expect(bridge.readWorkspaceFile).toHaveBeenLastCalledWith(paths.at(-1));

    const lastPath = paths.at(-1);
    if (!lastPath) throw new Error('The rapid selection fixture is empty.');
    await act(async () => {
      pendingReads.get(lastPath)?.({
        path: lastPath,
        content: '// latest',
        revision: 'revision-last',
      });
      await Promise.resolve();
    });
    expect(current().document?.path).toBe(lastPath);
    expect(current().draft).toBe('// latest');
    expect(bridge.readWorkspaceFile).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount());
  });
});
