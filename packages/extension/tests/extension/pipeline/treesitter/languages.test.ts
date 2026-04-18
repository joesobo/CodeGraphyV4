import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function mockTreeSitterBindings(): { setLanguage: ReturnType<typeof vi.fn> } {
  const setLanguage = vi.fn();

  vi.doMock('tree-sitter', () => ({
    default: class MockParser {
      setLanguage = setLanguage;
    },
  }));
  vi.doMock('tree-sitter-c-sharp', () => ({ default: { id: 'csharp' } }));
  vi.doMock('tree-sitter-go', () => ({ default: { id: 'go' } }));
  vi.doMock('tree-sitter-java', () => ({ default: { id: 'java' } }));
  vi.doMock('tree-sitter-javascript', () => ({ default: { id: 'javascript' } }));
  vi.doMock('tree-sitter-python', () => ({ default: { id: 'python' } }));
  vi.doMock('tree-sitter-rust', () => ({ default: { id: 'rust' } }));
  vi.doMock('tree-sitter-typescript', () => ({
    default: {
      tsx: { id: 'tsx' },
      typescript: { id: 'typescript' },
    },
  }));

  return { setLanguage };
}

describe('pipeline/plugins/treesitter/runtime/languages', () => {
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
      '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages'
    );

    await expect(createTreeSitterParser('/workspace/src/app.ts')).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tree-sitter bindings unavailable'),
    );
  });

  it('recognizes the core Tree-sitter extensions across the supported language set', async () => {
    const { supportsTreeSitterFile } = await import(
      '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages'
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

  it.each([
    ['/workspace/src/app.js', 'javascript', 'javascript'],
    ['/workspace/src/app.cjs', 'javascript', 'javascript'],
    ['/workspace/src/app.mjs', 'javascript', 'javascript'],
    ['/workspace/src/app.jsx', 'javascript', 'javascript'],
    ['/workspace/src/app.ts', 'typescript', 'typescript'],
    ['/workspace/src/app.cts', 'typescript', 'typescript'],
    ['/workspace/src/app.mts', 'typescript', 'typescript'],
    ['/workspace/src/app.tsx', 'tsx', 'tsx'],
    ['/workspace/src/app.py', 'python', 'python'],
    ['/workspace/src/app.pyi', 'python', 'python'],
    ['/workspace/src/main.go', 'go', 'go'],
    ['/workspace/src/App.java', 'java', 'java'],
    ['/workspace/src/lib.rs', 'rust', 'rust'],
    ['/workspace/src/App.cs', 'csharp', 'csharp'],
  ])(
    'creates a runtime for %s with %s bindings',
    async (filePath, languageKind, languageId) => {
      const { setLanguage } = mockTreeSitterBindings();
      const { createTreeSitterRuntime } = await import(
        '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages'
      );

      const runtime = await createTreeSitterRuntime(filePath);

      expect(runtime?.languageKind).toBe(languageKind);
      expect(setLanguage).toHaveBeenCalledWith({ id: languageId });
    },
  );

  it('returns null for unsupported extensions without loading bindings', async () => {
    const { setLanguage } = mockTreeSitterBindings();
    const { createTreeSitterParser } = await import(
      '../../../../src/extension/pipeline/plugins/treesitter/runtime/languages'
    );

    await expect(createTreeSitterParser('/workspace/README.md')).resolves.toBeNull();
    expect(setLanguage).not.toHaveBeenCalled();
  });
});
