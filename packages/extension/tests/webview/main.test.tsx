import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../src/webview/app/App', () => ({
  default: () => null,
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

  it('skips root creation when the root element is missing', async () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);

    await import('../../src/webview/main');

    expect(mocks.createRoot).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
    expect((window as unknown as { vscode: unknown }).vscode).toBe(mocks.vscodeApi);
  });
});
