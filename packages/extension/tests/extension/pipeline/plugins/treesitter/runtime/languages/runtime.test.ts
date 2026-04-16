import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadTreeSitterBindings } = vi.hoisted(() => ({
  loadTreeSitterBindings: vi.fn(),
}));

vi.mock(
  '../../../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages/bindings',
  () => ({
    loadTreeSitterBindings,
  }),
);

import {
  createTreeSitterParser,
  createTreeSitterRuntime,
} from '../../../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages/runtime';

class MockParser {
  setLanguage = vi.fn();
}

describe('pipeline/plugins/treesitter/runtime/languages/runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a configured parser for supported files when bindings are available', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      typeScript: { id: 'typescript' },
    });

    const parser = await createTreeSitterParser('/workspace/src/app.ts');
    const configuredParser = parser as unknown as MockParser;

    expect(parser).toBeInstanceOf(MockParser);
    expect(configuredParser.setLanguage).toHaveBeenCalledWith({ id: 'typescript' });
  });

  it('returns a runtime with the parser and language kind for supported files', async () => {
    loadTreeSitterBindings.mockResolvedValue({
      ParserCtor: MockParser,
      javaScript: { id: 'javascript' },
    });

    const runtime = await createTreeSitterRuntime('/workspace/src/app.js');
    const configuredParser = runtime?.parser as unknown as MockParser;

    expect(runtime?.languageKind).toBe('javascript');
    expect(runtime?.parser).toBeInstanceOf(MockParser);
    expect(configuredParser.setLanguage).toHaveBeenCalledWith({
      id: 'javascript',
    });
  });

  it('returns null for supported files when bindings are unavailable', async () => {
    loadTreeSitterBindings.mockResolvedValue(null);

    await expect(createTreeSitterParser('/workspace/src/app.ts')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/src/app.ts')).resolves.toBeNull();
  });

  it('returns null for unsupported files without loading bindings', async () => {
    await expect(createTreeSitterParser('/workspace/README.md')).resolves.toBeNull();
    await expect(createTreeSitterRuntime('/workspace/README.md')).resolves.toBeNull();

    expect(loadTreeSitterBindings).not.toHaveBeenCalled();
  });
});
