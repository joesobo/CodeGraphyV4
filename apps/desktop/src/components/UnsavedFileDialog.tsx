import { useEffect, useRef } from 'react';

type UnsavedFileIntent = 'close-file' | 'open-file' | 'switch-workspace';

const COPY: Record<UnsavedFileIntent, {
  description: string;
  primary: string;
  title: string;
}> = {
  'close-file': {
    description: 'Closing clears only the editor. The workspace and Relationship Graph stay open.',
    primary: 'Save and Close',
    title: 'Save this File before closing?',
  },
  'open-file': {
    description: 'Cancel keeps the current File open.',
    primary: 'Save and Open',
    title: 'Save this File before opening another?',
  },
  'switch-workspace': {
    description: 'Cancel keeps the current workspace open.',
    primary: 'Save and Switch',
    title: 'Save this File before switching?',
  },
};

export function UnsavedFileDialog({
  filePath,
  intent,
  onCancel,
  onDiscard,
  onSave,
  saving,
}: {
  filePath: string;
  intent: UnsavedFileIntent;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  saving: boolean;
}): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copy = COPY[intent];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      aria-describedby="unsaved-file-description"
      aria-labelledby="unsaved-file-title"
      className="workspace-switch-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <div aria-hidden="true" className="dialog-file-glyph">{'{·}'}</div>
      <h2 id="unsaved-file-title">{copy.title}</h2>
      <p id="unsaved-file-description">
        <strong>{filePath}</strong> has changes that are not saved. {copy.description}
      </p>
      <div className="dialog-actions">
        <button disabled={saving} onClick={onCancel} type="button">Cancel</button>
        <button disabled={saving} onClick={onDiscard} type="button">Don&apos;t Save</button>
        <button autoFocus className="dialog-primary" disabled={saving} onClick={onSave} type="button">
          {saving ? 'Saving…' : copy.primary}
        </button>
      </div>
    </dialog>
  );
}
