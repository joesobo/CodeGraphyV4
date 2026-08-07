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

  it('uses the existing dirty confirmation before Close File discards a draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Harness />));
    await act(async () => current().selectFile('src/main.ts'));
    await act(async () => current().setDraft('unsaved'));
    await act(async () => current().closeCurrentDocument());
    expect(current().document?.path).toBe('src/main.ts');
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved edit and close this File?');

    confirm.mockReturnValue(true);
    await act(async () => current().closeCurrentDocument());
    expect(current().document).toBeUndefined();
    expect(current().dirty).toBe(false);
    await act(async () => root.unmount());
  });
});
