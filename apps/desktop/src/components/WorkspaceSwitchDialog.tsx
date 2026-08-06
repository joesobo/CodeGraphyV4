import { useEffect, useRef } from 'react';

export function WorkspaceSwitchDialog({
  filePath,
  onCancel,
  onDiscard,
  onSave,
  saving,
}: {
  filePath: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
  saving: boolean;
}): React.ReactElement {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      aria-describedby="workspace-switch-description"
      aria-labelledby="workspace-switch-title"
      className="workspace-switch-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      ref={dialogRef}
    >
      <div aria-hidden="true" className="dialog-file-glyph">{`{·}`}</div>
      <h2 id="workspace-switch-title">Save this File before switching?</h2>
      <p id="workspace-switch-description">
        <strong>{filePath}</strong> has changes that are not saved. Cancel keeps the current workspace open.
      </p>
      <div className="dialog-actions">
        <button disabled={saving} onClick={onCancel} type="button">Cancel</button>
        <button disabled={saving} onClick={onDiscard} type="button">Don&apos;t Save</button>
        <button autoFocus className="dialog-primary" disabled={saving} onClick={onSave} type="button">
          {saving ? 'Saving…' : 'Save and Switch'}
        </button>
      </div>
    </dialog>
  );
}
