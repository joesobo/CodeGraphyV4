import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('pipeline/treesitter/languages', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.doUnmock('tree-sitter');
    vi.doUnmock('tree-sitter-c-sharp');
    vi.doUnmock('tree-sitter-go');
    vi.doUnmock('tree-sitter-java');
    vi.doUnmock('tree-sitter-javascript');
    vi.doUnmock('tree-sitter-python');
    vi.doUnmock('tree-sitter-rust');
    vi.doUnmock('tree-sitter-typescript');
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('returns null when native Tree-sitter bindings are unavailable', async () => {
    vi.doMock('tree-sitter', () => {
      throw new Error('native bindings missing');
    });
    vi.doMock('tree-sitter-c-sharp', () => ({ default: {} }));
    vi.doMock('tree-sitter-go', () => ({ default: {} }));
    vi.doMock('tree-sitter-java', () => ({ default: {} }));
    vi.doMock('tree-sitter-javascript', () => ({
      default: {},
    }));
    vi.doMock('tree-sitter-python', () => ({ default: {} }));
    vi.doMock('tree-sitter-rust', () => ({ default: {} }));
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

  it('recognizes the core Tree-sitter extensions across the supported language set', async () => {
    const { supportsTreeSitterFile } = await import(
      '../../../../src/extension/pipeline/treesitter/languages'
    );

    expect(supportsTreeSitterFile('/workspace/src/app.ts')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/app.tsx')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/app.js')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/app.py')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/main.go')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/App.java')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/lib.rs')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/src/App.cs')).toBe(true);
    expect(supportsTreeSitterFile('/workspace/README.md')).toBe(false);
  });
});
