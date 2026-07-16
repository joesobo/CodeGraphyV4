import { mdiPlus } from '@mdi/js';
import { useState, type KeyboardEvent, type ReactElement } from 'react';
import { MdiIcon } from '../../icons/MdiIcon';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export function CssSnippetDraft({ onAdd }: { onAdd: (path: string) => void }): ReactElement {
  const [path, setPath] = useState('');
  const trimmedPath = path.trim();
  const submit = (): void => {
    if (!trimmedPath) return;
    onAdd(trimmedPath);
    setPath('');
  };
  const submitOnEnter = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || !trimmedPath) return;
    event.preventDefault();
    submit();
  };
  return <div className="flex items-center gap-2 rounded-md border border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] px-3 py-2">
    <Input aria-label="CSS snippet path" className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
      placeholder=".codegraphy/snippets/custom.css" value={path}
      onChange={event => setPath(event.target.value)} onKeyDown={submitOnEnter} />
    <Button variant="outline" size="icon"
      className="h-7 w-7 shrink-0 border-[var(--cg-border-subtle)] bg-[var(--cg-surface-subtle)] p-0 text-muted-foreground hover:bg-[var(--cg-accent-subtle)] hover:text-foreground"
      disabled={!trimmedPath} onClick={submit} title="Add CSS snippet">
      <MdiIcon path={mdiPlus} size={14} />
    </Button>
  </div>;
}
