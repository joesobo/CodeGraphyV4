import type { FileTreeEntry } from '../model';

function Entry({
  entry,
  selectedPath,
  onSelect,
}: {
  entry: FileTreeEntry;
  selectedPath?: string;
  onSelect: (path: string) => void;
}): React.ReactElement {
  if (entry.kind === 'file') {
    return (
      <button
        className={`tree-file ${selectedPath === entry.path ? 'is-selected' : ''}`}
        onClick={() => onSelect(entry.path)}
        title={entry.path}
        type="button"
      >
        <span className="file-mark" />
        <span>{entry.name}</span>
      </button>
    );
  }
  return (
    <details className="tree-folder" open>
      <summary><span className="folder-caret">›</span>{entry.name}</summary>
      <div className="tree-children">
        {entry.children.map(child => (
          <Entry entry={child} key={child.path} onSelect={onSelect} selectedPath={selectedPath} />
        ))}
      </div>
    </details>
  );
}

export function FileTree({
  entries,
  selectedPath,
  onSelect,
}: {
  entries: FileTreeEntry[];
  selectedPath?: string;
  onSelect: (path: string) => void;
}): React.ReactElement {
  return (
    <nav aria-label="Workspace Files" className="file-tree">
      {entries.map(entry => (
        <Entry entry={entry} key={entry.path} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </nav>
  );
}
