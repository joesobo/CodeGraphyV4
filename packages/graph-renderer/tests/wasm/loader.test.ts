import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const moduleBytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0);

function response(status = 200) {
  const arrayBuffer = vi.fn().mockResolvedValue(moduleBytes.buffer);
  const fallback = { arrayBuffer };
  return {
    value: {
      ok: status >= 200 && status < 300,
      status,
      clone: vi.fn(() => fallback),
    } as unknown as Response,
    arrayBuffer,
  };
}

describe('graph WASM physics preparation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('compiles the emitted module through the streaming path', async () => {
    const compiled = new WebAssembly.Module(moduleBytes);
    const resource = response();
    const fetchMock = vi.fn().mockResolvedValue(resource.value);
    vi.stubGlobal('fetch', fetchMock);
    const compileStreaming = vi.spyOn(WebAssembly, 'compileStreaming')
      .mockResolvedValue(compiled);

    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');
    const registry = await import('@graph-renderer/physics/wasm/module');
    await prepareGraphPhysics();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(compileStreaming).toHaveBeenCalledWith(resource.value);
    expect(resource.arrayBuffer).not.toHaveBeenCalled();
    expect(registry.requireGraphPhysicsModule()).toBe(compiled);
  });

  it('falls back to array-buffer compilation when streaming compilation fails', async () => {
    const compiled = new WebAssembly.Module(moduleBytes);
    const resource = response();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resource.value));
    vi.spyOn(WebAssembly, 'compileStreaming').mockRejectedValue(new TypeError('invalid MIME type'));
    const compile = vi.spyOn(WebAssembly, 'compile').mockResolvedValue(compiled);

    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');
    await prepareGraphPhysics();

    expect(resource.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(compile).toHaveBeenCalledWith(moduleBytes.buffer);
  });

  it('reports an unsuccessful WASM asset request explicitly', async () => {
    const resource = response(404);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resource.value));
    const compileStreaming = vi.spyOn(WebAssembly, 'compileStreaming');

    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');

    await expect(prepareGraphPhysics()).rejects.toThrow(
      'Unable to load graph physics (404)',
    );
    expect(compileStreaming).not.toHaveBeenCalled();
  });

  it('allows a later caller to retry after a transient load failure', async () => {
    const compiled = new WebAssembly.Module(moduleBytes);
    const unavailable = response(503);
    const available = response();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(unavailable.value)
      .mockResolvedValueOnce(available.value);
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(WebAssembly, 'compileStreaming').mockResolvedValue(compiled);

    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');

    await expect(prepareGraphPhysics()).rejects.toThrow(
      'Unable to load graph physics (503)',
    );
    await expect(prepareGraphPhysics()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one fetch and compilation across concurrent callers', async () => {
    const compiled = new WebAssembly.Module(moduleBytes);
    const resource = response();
    const fetchMock = vi.fn().mockResolvedValue(resource.value);
    vi.stubGlobal('fetch', fetchMock);
    let finishCompilation: ((module: WebAssembly.Module) => void) | undefined;
    vi.spyOn(WebAssembly, 'compileStreaming').mockReturnValue(new Promise(resolve => {
      finishCompilation = resolve;
    }));

    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');
    const first = prepareGraphPhysics();
    const second = prepareGraphPhysics();

    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finishCompilation?.(compiled);
    await first;
  });

  it('does not fetch when a test or host has already installed the module', async () => {
    const compiled = new WebAssembly.Module(moduleBytes);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const registry = await import('@graph-renderer/physics/wasm/module');
    registry.installGraphPhysicsModule(compiled);
    const { prepareGraphPhysics } = await import('@graph-renderer/wasm/loader');

    await prepareGraphPhysics();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
