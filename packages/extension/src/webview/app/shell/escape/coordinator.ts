import { getEscapeAction } from './model';

export interface GraphStageEscapeAdapter {
  clearSelection(): void;
  focus(): void;
  hasSelection(): boolean;
}

export interface EscapeCoordinatorOptions {
  closeFilters(): void;
  closePanel(): void;
  closeRulePrompt(): void;
  filterOpen: boolean;
  focusFiltersButton(): void;
  graphStage: GraphStageEscapeAdapter;
  panelOpen: boolean;
  rulePromptOpen: boolean;
}

function getEditableEscapeElement(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  if (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
  ) {
    return target;
  }

  const contentEditable = target.closest<HTMLElement>('[contenteditable]');
  return contentEditable?.getAttribute('contenteditable') === 'false' ? null : contentEditable;
}

export function isEditableEscapeTarget(target: EventTarget | null): boolean {
  return getEditableEscapeElement(target) !== null;
}

export interface EscapeCoordinatorHandlers {
  onKeyDown(event: KeyboardEvent): void;
  onKeyDownCapture(event: KeyboardEvent): void;
}

export function createEscapeCoordinatorHandlers(
  options: EscapeCoordinatorOptions,
): EscapeCoordinatorHandlers {
  return {
    onKeyDownCapture(event) {
      if (event.key !== 'Escape' || !event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    onKeyDown(event) {
      if (event.key !== 'Escape' || event.repeat) return;

      const editableElement = getEditableEscapeElement(event.target);
      const action = getEscapeAction({
        locallyHandled: event.defaultPrevented,
        rulePromptOpen: options.rulePromptOpen,
        editableTarget: editableElement !== null,
        filterOpen: options.filterOpen,
        panelOpen: options.panelOpen,
        hasSelection: options.graphStage.hasSelection(),
      });

      if (action === 'handledLocally' || action === 'none') return;

      event.preventDefault();
      event.stopPropagation();
      switch (action) {
        case 'closeRulePrompt':
          options.closeRulePrompt();
          options.graphStage.focus();
          return;
        case 'blurEdit':
          editableElement?.blur();
          return;
        case 'closeFilters':
          options.closeFilters();
          options.focusFiltersButton();
          return;
        case 'closePanel':
          options.closePanel();
          options.graphStage.focus();
          return;
        case 'clearSelection':
          options.graphStage.clearSelection();
          return;
      }
    },
  };
}
