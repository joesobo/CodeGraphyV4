import { useEffect, useRef, type KeyboardEvent, type ReactElement } from 'react';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import { useGraphStore } from '../../../store/state';
import { postMessage as postWebviewMessage } from '../../../vscodeApi';
import { planInlineFileEdit } from './model';

export interface GraphInlineEditPosition {
  x: number;
  y: number;
}

export interface GraphInlineEditProps {
  position: GraphInlineEditPosition | null;
  postMessage?: (message: WebviewToExtensionMessage) => void;
}

export function GraphInlineEdit({
  position,
  postMessage = postWebviewMessage,
}: GraphInlineEditProps): ReactElement | null {
  const session = useGraphStore(state => state.inlineEdit);
  const updateInlineEdit = useGraphStore(state => state.updateInlineEdit);
  const clearInlineEdit = useGraphStore(state => state.clearInlineEdit);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const committedRef = useRef(false);
  const blurArmedRef = useRef(false);
  const selectionStart = session?.selection[0];
  const selectionEnd = session?.selection[1];

  useEffect(() => {
    const input = inputRef.current;
    if (!input || selectionStart === undefined || selectionEnd === undefined) return;
    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);
    const timer = window.setTimeout(() => {
      blurArmedRef.current = true;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session?.kind, session?.anchorNodeId, selectionStart, selectionEnd]);

  if (!session || !position) return null;

  const commit = (): void => {
    if (cancelledRef.current || committedRef.current || session.pending) return;
    const plan = planInlineFileEdit(session, session.value);
    if (plan.kind === 'invalid') {
      updateInlineEdit({ error: plan.message });
      return;
    }
    if (plan.kind === 'unchanged') {
      clearInlineEdit();
      return;
    }
    committedRef.current = true;
    updateInlineEdit({ error: null, pending: true });
    postMessage(plan.message);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelledRef.current = true;
      clearInlineEdit();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  };

  return (
    <div
      className="pointer-events-auto absolute z-30 -translate-x-1/2 translate-y-3"
      data-codegraphy-inline-edit={session.kind}
      style={{ left: position.x, top: position.y }}
    >
      {session.kind !== 'rename' && (
        <div
          aria-hidden="true"
          className="mx-auto mb-1 size-5 rounded-full border border-dashed border-[var(--cg-focus-border)] bg-[var(--cg-background)]"
          data-codegraphy-ghost-node={session.kind}
        />
      )}
      <input
        ref={inputRef}
        aria-label={session.kind === 'rename'
          ? 'Rename graph item'
          : session.kind === 'createFile' ? 'New file name' : 'New folder name'}
        className="min-w-40 rounded-sm border border-[var(--cg-input-border)] bg-[var(--cg-input)] px-1.5 py-0.5 text-[var(--cg-input-foreground)] outline-none focus:border-[var(--cg-focus-border)]"
        value={session.value}
        aria-busy={session.pending}
        readOnly={session.pending}
        onBlur={() => {
          if (blurArmedRef.current) commit();
        }}
        onChange={event => updateInlineEdit({ value: event.target.value, error: null })}
        onKeyDown={handleKeyDown}
      />
      {session.pending && <div className="mt-1 text-xs">Saving…</div>}
      {session.error && (
        <div
          role="alert"
          className="mt-1 max-w-64 rounded-sm bg-[var(--cg-input-error-background)] px-2 py-1 text-xs text-[var(--cg-error-foreground)]"
        >
          {session.error}
        </div>
      )}
    </div>
  );
}
