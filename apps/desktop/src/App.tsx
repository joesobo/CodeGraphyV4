import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  chooseWorkspace,
  initialWorkspace,
  loadWorkspaceGraph,
  readWorkspaceFile,
  saveWorkspaceFile,
  type FileDocument,
} from './bridge';
import { CodeEditor } from './components/CodeEditor';
import { FileTree } from './components/FileTree';
import { GraphPanel } from './components/GraphPanel';
import { buildFileTree, type WorkspaceGraphResult } from './model';

type AppStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'busy'; message: string }
  | { kind: 'ready'; message: string }
  | { kind: 'error'; message: string };

function displayWorkspaceName(workspaceRoot: string): string {
  return workspaceRoot.split('/').filter(Boolean).at(-1) ?? workspaceRoot;
}

export function App(): React.ReactElement {
  const [workspaceRoot, setWorkspaceRoot] = useState<string>();
  const [graphResult, setGraphResult] = useState<WorkspaceGraphResult>();
  const [status, setStatus] = useState<AppStatus>({
    kind: 'idle',
    message: 'Open a local workspace to begin.',
  });
  const [includeSymbols, setIncludeSymbols] = useState(false);
  const [document, setDocument] = useState<FileDocument>();
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const graph = graphResult?.kind === 'ready' ? graphResult.graph : undefined;
  const tree = useMemo(() => graph ? buildFileTree(graph) : [], [graph]);
  const dirty = document !== undefined && draft !== document.content;

  const openGraph = useCallback(async (
    root: string,
    options: { reindex: boolean; symbols: boolean },
  ): Promise<void> => {
    setStatus({
      kind: 'busy',
      message: options.reindex ? 'Core is re-indexing the workspace…' : 'Loading the Graph Cache…',
    });
    try {
      const result = await loadWorkspaceGraph({
        workspaceRoot: root,
        reindex: options.reindex,
        includeSymbols: options.symbols,
      });
      setWorkspaceRoot(result.workspaceRoot);
      setGraphResult(result);
      if (result.kind === 'unreadable') {
        setStatus({ kind: 'error', message: result.message });
        return;
      }
      const indexing = result.indexing
        ? `${result.indexing.mode} Indexing · ${result.indexing.analyzedFiles} analyzed · ${result.indexing.reusedFiles} reused`
        : result.cacheStatus.state === 'stale' ? 'Graph Cache is stale · Re-index when ready' : 'Graph Cache is current';
      setStatus({ kind: 'ready', message: indexing });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  useEffect(() => {
    void initialWorkspace().then((root) => {
      if (root) void openGraph(root, { reindex: false, symbols: false });
    }).catch(error => setStatus({
      kind: 'error',
      message: error instanceof Error ? error.message : String(error),
    }));
  }, [openGraph]);

  const handleOpenWorkspace = async (): Promise<void> => {
    try {
      const root = await chooseWorkspace();
      if (!root) return;
      setDocument(undefined);
      setDraft('');
      await openGraph(root, { reindex: false, symbols: includeSymbols });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleSelectFile = async (path: string): Promise<void> => {
    if (document?.path === path) return;
    if (dirty && !window.confirm('Discard the unsaved edit and open another File?')) return;
    try {
      const next = await readWorkspaceFile(path);
      setDocument(next);
      setDraft(next.content);
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleSave = async (): Promise<void> => {
    if (!document || !dirty || saving || !workspaceRoot) return;
    setSaving(true);
    try {
      const saved = await saveWorkspaceFile({
        relativePath: document.path,
        content: draft,
        expectedRevision: document.revision,
      });
      setDocument(saved);
      setDraft(saved.content);
      await openGraph(workspaceRoot, { reindex: true, symbols: includeSymbols });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleSymbolToggle = async (): Promise<void> => {
    const next = !includeSymbols;
    setIncludeSymbols(next);
    if (workspaceRoot) await openGraph(workspaceRoot, { reindex: false, symbols: next });
  };

  return (
    <main className="desktop-shell">
      <header className="app-toolbar" data-tauri-drag-region>
        <div className="window-drag-space" data-tauri-drag-region />
        <div className="brand-lockup" data-tauri-drag-region>
          <span className="brand-symbol">⌁</span>
          <strong>CodeGraphy</strong>
          {workspaceRoot ? <span className="workspace-name">/ {displayWorkspaceName(workspaceRoot)}</span> : null}
        </div>
        <div className="toolbar-actions">
          <button className="toolbar-button" onClick={() => void handleOpenWorkspace()} type="button">Open workspace</button>
          <button
            className={`toolbar-button ${includeSymbols ? 'is-active' : ''}`}
            disabled={!workspaceRoot}
            onClick={() => void handleSymbolToggle()}
            type="button"
          >
            Symbols
          </button>
          <button
            className="toolbar-button"
            disabled={!workspaceRoot || status.kind === 'busy'}
            onClick={() => workspaceRoot && void openGraph(workspaceRoot, { reindex: true, symbols: includeSymbols })}
            type="button"
          >
            Re-index
          </button>
        </div>
      </header>

      {graph ? (
        <div className="workspace-grid">
          <aside className="files-pane">
            <div className="pane-heading"><span>Files</span><span>{tree.length}</span></div>
            <FileTree entries={tree} onSelect={path => void handleSelectFile(path)} selectedPath={document?.path} />
          </aside>

          <section className="editor-pane">
            <div className="pane-heading editor-heading">
              <span>{document?.path ?? 'Editor'}</span>
              <button
                className={`save-button ${dirty ? 'has-changes' : ''}`}
                disabled={!dirty || saving}
                onClick={() => void handleSave()}
                type="button"
              >
                {saving ? 'Saving…' : dirty ? 'Save ⌘S' : 'Saved'}
              </button>
            </div>
            {document ? (
              <CodeEditor document={document} onChange={setDraft} onSave={() => void handleSave()} />
            ) : (
              <div className="empty-editor">
                <span className="empty-glyph">{`{ }`}</span>
                <h1>Choose a File</h1>
                <p>Browse the workspace hierarchy, make a lightweight edit, and save it back to the source File.</p>
              </div>
            )}
          </section>

          <aside className="graph-pane">
            <div className="pane-heading">
              <span>Relationship Graph</span>
              <span>{includeSymbols ? 'Files + Symbols' : 'Files'}</span>
            </div>
            <GraphPanel graph={graph} onSelect={id => void handleSelectFile(id)} selectedId={document?.path} />
          </aside>
        </div>
      ) : (
        <section className="welcome-state">
          <div className="welcome-orbit"><span>⌁</span></div>
          <p className="eyebrow">MACOS-FIRST · LOCAL BY DESIGN</p>
          <h1>See how your code<br /><em>fits together.</em></h1>
          <p>Open any local folder. CodeGraphy will build a workspace-owned Graph Cache, then put its Files, editor, and Relationships in one focused view.</p>
          <button onClick={() => void handleOpenWorkspace()} type="button">Open a workspace</button>
        </section>
      )}

      <footer className={`status-bar status-${status.kind}`}>
        <span className="status-dot" />
        <span>{status.message}</span>
        <span className="status-local">Local only · macOS 26+</span>
      </footer>
    </main>
  );
}
