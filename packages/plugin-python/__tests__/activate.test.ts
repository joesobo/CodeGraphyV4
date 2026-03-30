import { beforeEach, describe, expect, it, vi } from 'vitest';

const getExtension = vi.fn();

vi.mock('vscode', () => ({
  extensions: {
    getExtension,
  },
}));

describe('plugin-python/activate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers the Python plugin with the core extension', async () => {
    const registerPlugin = vi.fn();
    getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => ({ registerPlugin })),
    });

    const { activate } = await import('../src/activate');
    const context = { extensionUri: { fsPath: '/plugins/python' } };

    await activate(context as never);

    expect(getExtension).toHaveBeenCalledWith('codegraphy.codegraphy');
    expect(registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'codegraphy.python' }),
      { extensionUri: context.extensionUri },
    );
  });

  it('returns without registering when the core extension is unavailable', async () => {
    getExtension.mockReturnValue(undefined);

    const { activate } = await import('../src/activate');

    await expect(activate({ extensionUri: { fsPath: '/plugins/python' } } as never)).resolves.toBeUndefined();
  });
});
