import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FileDocument } from '../bridge';
import { CodeEditor } from './CodeEditor';
import { createCodeEditor } from './createCodeEditor';

vi.mock('./createCodeEditor', () => ({
  createCodeEditor: vi.fn(async () => () => undefined),
}));

const markdownDocument: FileDocument = {
  content: '# Original',
  path: 'README.md',
  revision: 'revision-1',
};

describe('CodeEditor Markdown modes', () => {
  beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
  });

  it('offers accessible Edit, Split, and Preview modes while preserving draft changes', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const onChange = vi.fn();
    await act(async () => root.render(
      <CodeEditor document={markdownDocument} onChange={onChange} onSave={vi.fn()} />,
    ));
    await act(async () => undefined);

    const modeGroup = host.querySelector('[role="group"][aria-label="Markdown editor mode"]');
    const buttons = [...(modeGroup?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    expect(buttons.map(button => [button.textContent, button.getAttribute('aria-pressed')])).toEqual([
      ['Edit', 'true'],
      ['Split', 'false'],
      ['Preview', 'false'],
    ]);
    const editorOptions = vi.mocked(createCodeEditor).mock.calls[0]?.[0];
    await act(async () => editorOptions?.onChange('# Updated\n\nPreview text'));
    expect(onChange).toHaveBeenCalledWith('# Updated\n\nPreview text');

    const split = buttons.find(button => button.textContent === 'Split');
    await act(async () => {
      split?.click();
      await import('./MarkdownPreview');
    });
    expect(host.querySelector('.markdown-source')).not.toBeNull();
    expect(host.querySelector('article[aria-label="Markdown preview"] h1')?.textContent).toBe('Updated');
    expect(host.textContent).toContain('Preview text');

    const preview = buttons.find(button => button.textContent === 'Preview');
    await act(async () => {
      preview?.focus();
      preview?.click();
    });
    expect(host.querySelector('.markdown-source')?.hasAttribute('hidden')).toBe(true);
    expect(document.activeElement).toBe(preview);

    await act(async () => root.unmount());
  });

  it('does not add Markdown mode controls to another language', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(
      <CodeEditor
        document={{ ...markdownDocument, path: 'src/main.py' }}
        onChange={vi.fn()}
        onSave={vi.fn()}
      />,
    ));
    await act(async () => undefined);

    expect(host.querySelector('[aria-label="Markdown editor mode"]')).toBeNull();
    expect(host.querySelector('.editor-host')).not.toBeNull();
    await act(async () => root.unmount());
  });
});
