import { beforeEach, describe, expect, it, vi } from 'vitest';

const getExtension = vi.fn();

vi.mock('vscode', () => ({
  extensions: {
    getExtension,
  },
}));

describe('plugin-godot/activate', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('registers the GDScript plugin with the core extension', async () => {
    const registerPlugin = vi.fn();
    getExtension.mockReturnValue({
      isActive: false,
      activate: vi.fn(async () => ({ registerPlugin })),
    });

    const { activate } = await import('../src/activate');
    const context = { extensionUri: { fsPath: '/plugins/godot' } };

    await activate(context as never);

    expect(getExtension).toHaveBeenCalledWith('codegraphy.codegraphy');
    expect(registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'codegraphy.gdscript' }),
      { extensionUri: context.extensionUri },
    );
  });

  it('returns without registering when the core extension is unavailable', async () => {
    getExtension.mockReturnValue(undefined);

    const { activate } = await import('../src/activate');

    await expect(activate({ extensionUri: { fsPath: '/plugins/godot' } } as never)).resolves.toBeUndefined();
  });
});
