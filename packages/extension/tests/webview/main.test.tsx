import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => {
  const render = vi.fn();
  const createRoot = vi.fn(() => ({ render }));
  const vscodeApi = {
    getState: vi.fn(),
    postMessage: vi.fn(),
    setState: vi.fn(),
  };

  return { createRoot, render, vscodeApi };
});

vi.mock('react-dom/client', () => ({
  createRoot: mocks.createRoot,
}));

vi.mock('../../src/webview/app/view', () => ({
  default: function GraphApp() {
    return null;
  },
}));

vi.mock('../../src/webview/index.css', () => ({}));

vi.mock('../../src/webview/vscodeApi', () => ({
  getVsCodeApi: () => mocks.vscodeApi,
}));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRoot.mockClear();
    mocks.render.mockClear();
    (window as unknown as { vscode?: unknown }).vscode = undefined;
    delete document.body.dataset.codegraphyView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a root and renders the app when the root element exists', async () => {
    const container = document.createElement('div');
    const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockReturnValue(container);

    await import('../../src/webview/main');

    expect(getElementByIdSpy).toHaveBeenCalledWith('root');
    expect(mocks.createRoot).toHaveBeenCalledWith(container);
    expect(mocks.render).toHaveBeenCalledTimes(1);
    expect((window as unknown as { vscode: unknown }).vscode).toBe(mocks.vscodeApi);
  });

  it('renders the graph shell by default', async () => {
    const container = document.createElement('div');
    vi.spyOn(document, 'getElementById').mockReturnValue(container);

    await import('../../src/webview/main');

    const rootElement = mocks.render.mock.calls[0]?.[0] as {
      props: { children: { type: { name: string } } };
    };
    expect(rootElement.props.children.type.name).toBe('GraphApp');
  });

  it('always renders the graph shell when a stale host marker is present', async () => {
    const container = document.createElement('div');
    document.body.dataset.codegraphyView = 'timeline';
    vi.spyOn(document, 'getElementById').mockReturnValue(container);

    await import('../../src/webview/main');

    const rootElement = mocks.render.mock.calls[0]?.[0] as {
      props: { children: { type: { name: string } } };
    };
    expect(rootElement.props.children.type.name).toBe('GraphApp');
  });

  it('skips root creation when the root element is missing', async () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);

    await import('../../src/webview/main');

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
    expect((window as unknown as { vscode: unknown }).vscode).toBe(mocks.vscodeApi);
  });

  it('does not load the Three.js runtime from the webview entrypoint', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/webview/main.tsx'),
      'utf8',
    );

    expect(source).not.toContain("import './three/runtime'");
  });

  it('does not load 3d node rendering from shared graph callbacks', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/webview/components/graph/rendering/useGraphCallbacks.ts'),
      'utf8',
    );

    expect(source).not.toContain('nodes/canvas3d');
  });
});
