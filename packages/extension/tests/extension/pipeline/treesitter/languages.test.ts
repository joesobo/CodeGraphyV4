import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('pipeline/treesitter/languages', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.doUnmock('tree-sitter');
    vi.doUnmock('tree-sitter-javascript');
    vi.doUnmock('tree-sitter-typescript');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns null when native Tree-sitter bindings are unavailable', async () => {
    vi.doMock('tree-sitter', () => {
      throw new Error('native bindings missing');
    });
    vi.doMock('tree-sitter-javascript', () => ({
      default: {},
    }));
    vi.doMock('tree-sitter-typescript', () => ({
      default: {
        tsx: {},
        typescript: {},
      },
    }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { createTreeSitterParser } = await import(
      '../../../../src/extension/pipeline/treesitter/languages'
    );

    await expect(createTreeSitterParser('/workspace/src/app.ts')).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tree-sitter bindings unavailable'),
    );
  });
});
