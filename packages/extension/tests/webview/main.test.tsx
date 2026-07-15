import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const render = vi.fn();
  const createRoot = vi.fn(() => ({ render }));
  const prepareGraphPhysics = vi.fn<() => Promise<void>>();
  const vscodeApi = {
    getState: vi.fn(),
    postMessage: vi.fn(),
    setState: vi.fn(),
  };

  return { createRoot, prepareGraphPhysics, render, vscodeApi };
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

vi.mock('@codegraphy-dev/graph-renderer/wasm', () => ({
  prepareGraphPhysics: mocks.prepareGraphPhysics,
}));

describe('main', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.createRoot.mockClear();
    mocks.render.mockClear();
    mocks.prepareGraphPhysics.mockReset().mockResolvedValue(undefined);
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
    expect(mocks.prepareGraphPhysics).toHaveBeenCalledTimes(1);
    expect(mocks.render).toHaveBeenCalledTimes(1);
    expect((window as unknown as { vscode: unknown }).vscode).toBe(mocks.vscodeApi);
  });

  it('mounts the graph shell before WASM physics preparation resolves', async () => {
    const container = document.createElement('div');
    vi.spyOn(document, 'getElementById').mockReturnValue(container);
    let finishPreparation: (() => void) | undefined;
    const preparation = new Promise<void>(resolve => {
      finishPreparation = resolve;
    });
    mocks.prepareGraphPhysics.mockReturnValue(preparation);

    await import('../../src/webview/main');

    expect(mocks.render).toHaveBeenCalledTimes(1);
    const rootElement = mocks.render.mock.calls[0]?.[0] as {
      props: { children: { props: { graphPhysicsPreparation: Promise<void> } } };
    };
    expect(rootElement.props.children.props.graphPhysicsPreparation).toBe(preparation);
    finishPreparation?.();
    await preparation;
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

  it('skips root creation when the root element is missing', async () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);

    await import('../../src/webview/main');

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
    expect((window as unknown as { vscode: unknown }).vscode).toBe(mocks.vscodeApi);
  });

});
