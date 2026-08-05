import { describe, expect, it, vi } from 'vitest';
import {
  createEscapeCoordinatorHandlers,
  isEditableEscapeTarget,
} from '../../../../../src/webview/app/shell/escape/coordinator';

function createOptions(overrides = {}) {
  return {
    closeFilters: vi.fn(),
    closePanel: vi.fn(() => true),
    closeRulePrompt: vi.fn(),
    filterOpen: false,
    focusFiltersButton: vi.fn(),
    graphStage: {
      clearSelection: vi.fn(),
      focus: vi.fn(),
      hasSelection: vi.fn(() => false),
    },
    panelOpen: false,
    rulePromptOpen: false,
    ...overrides,
  };
}

describe('app/shell Escape coordinator', () => {
  it('consumes repeated Escape during capture before another layer can close', () => {
    const handlers = createEscapeCoordinatorHandlers(createOptions());
    const event = new KeyboardEvent('keydown', { key: 'Escape', repeat: true, cancelable: true });
    const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation');

    handlers.onKeyDownCapture(event);

    expect(event.defaultPrevented).toBe(true);
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
  });

  it('leaves an Escape already handled by a local popup alone', () => {
    const options = createOptions({ panelOpen: true });
    const handlers = createEscapeCoordinatorHandlers(options);
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    event.preventDefault();

    handlers.onKeyDown(event);

    expect(options.closePanel).not.toHaveBeenCalled();
    expect(options.graphStage.clearSelection).not.toHaveBeenCalled();
  });

  it('closes the rule prompt before an edit, Filters, or a panel and focuses the Graph Stage', () => {
    const input = document.createElement('input');
    const options = createOptions({ rulePromptOpen: true, filterOpen: true, panelOpen: true });
    const handlers = createEscapeCoordinatorHandlers(options);

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    handlers.onKeyDown(event);

    expect(options.closeRulePrompt).toHaveBeenCalledOnce();
    expect(options.closeFilters).not.toHaveBeenCalled();
    expect(options.closePanel).not.toHaveBeenCalled();
    expect(options.graphStage.focus).toHaveBeenCalledOnce();
  });

  it('blurs an ordinary editable target and consumes that press', () => {
    const input = document.createElement('input');
    const blur = vi.spyOn(input, 'blur');
    const options = createOptions({ filterOpen: true, panelOpen: true });
    const handlers = createEscapeCoordinatorHandlers(options);
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    Object.defineProperty(event, 'target', { value: input });

    handlers.onKeyDown(event);

    expect(blur).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    expect(options.closeFilters).not.toHaveBeenCalled();
  });

  it('closes Filters and restores focus to its button before closing a panel', () => {
    const options = createOptions({ filterOpen: true, panelOpen: true });

    createEscapeCoordinatorHandlers(options).onKeyDown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );

    expect(options.closeFilters).toHaveBeenCalledOnce();
    expect(options.focusFiltersButton).toHaveBeenCalledOnce();
    expect(options.closePanel).not.toHaveBeenCalled();
  });

  it('closes one panel, preserves selection, and focuses the Graph Stage', () => {
    const options = createOptions({ panelOpen: true });

    createEscapeCoordinatorHandlers(options).onKeyDown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );

    expect(options.closePanel).toHaveBeenCalledOnce();
    expect(options.graphStage.clearSelection).not.toHaveBeenCalled();
    expect(options.graphStage.focus).toHaveBeenCalledOnce();
  });

  it('does not move focus when a plugin owns the Escape press', () => {
    const options = createOptions({ panelOpen: true, closePanel: vi.fn(() => false) });

    createEscapeCoordinatorHandlers(options).onKeyDown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );

    expect(options.closePanel).toHaveBeenCalledOnce();
    expect(options.graphStage.focus).not.toHaveBeenCalled();
  });

  it('clears selection only on the bare graph fallback', () => {
    const options = createOptions({
      graphStage: {
        clearSelection: vi.fn(),
        focus: vi.fn(),
        hasSelection: vi.fn(() => true),
      },
    });

    createEscapeCoordinatorHandlers(options).onKeyDown(
      new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }),
    );

    expect(options.graphStage.clearSelection).toHaveBeenCalledOnce();
  });

  it('recognizes contenteditable descendants as editable targets', () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    const child = document.createElement('span');
    editor.appendChild(child);
    document.body.appendChild(editor);

    expect(isEditableEscapeTarget(child)).toBe(true);

    editor.remove();
  });
});
