import brandIconUrl from '../../../assets/icon-dark.svg?url';
import { CodeEditor } from './components/CodeEditor';
import { FileTree } from './components/FileTree';
import { GraphPanel } from './components/GraphPanel';
import { GraphSettingsPopover } from './components/GraphSettingsPopover';
import { WorkspaceSwitchDialog } from './components/WorkspaceSwitchDialog';
import { WorkspaceSwitcher } from './components/WorkspaceSwitcher';
import { useDesktopWorkspace } from './useDesktopWorkspace';

export function App(): React.ReactElement {
  const workspace = useDesktopWorkspace();

  return (
    <main className="desktop-shell">
      <header className="app-toolbar" data-tauri-drag-region>
        <div className="window-drag-space" data-tauri-drag-region />
        <div className="brand-lockup" data-tauri-drag-region>
          <img alt="" aria-hidden="true" className="brand-symbol" src={brandIconUrl} />
          <span className="brand-copy">
            <strong>CodeGraphy</strong>
            <span>Relationship Graph</span>
          </span>
        </div>
        <WorkspaceSwitcher
          onClearRecent={() => void workspace.clearRecent()}
          onOpenRecent={workspace.openRecentWorkspace}
          onOpenWorkspace={workspace.openWorkspace}
          recentWorkspaces={workspace.recentWorkspaces}
          workspaceRoot={workspace.workspaceRoot}
        />
        <div className="toolbar-actions">
          <button
            className="toolbar-button"
            disabled={!workspace.workspaceRoot || workspace.status.kind === 'busy'}
            onClick={workspace.reindex}
            type="button"
          >
            Re-index
          </button>
        </div>
      </header>

      {workspace.graph ? (
        <div className="workspace-grid">
          <aside aria-label="Workspace Files" className="files-pane">
            <div className="pane-heading"><span>Files</span><span>{workspace.fileCount}</span></div>
            <FileTree entries={workspace.tree} onSelect={path => void workspace.selectFile(path)} selectedPath={workspace.selectedPath} />
          </aside>

          <section aria-label="File editor" className="editor-pane">
            <div className="pane-heading editor-heading">
              <span>{workspace.document?.path ?? 'Editor'}</span>
              <button
                aria-label={workspace.dirty ? `Save ${workspace.document?.path ?? 'File'}` : 'File is saved'}
                className={`save-button ${workspace.dirty ? 'has-changes' : ''}`}
                disabled={!workspace.dirty || workspace.saving}
                onClick={() => void workspace.saveCurrentDocument()}
                type="button"
              >
                {workspace.saving ? 'Saving…' : workspace.dirty ? 'Save ⌘S' : 'Saved'}
              </button>
            </div>
            {workspace.document ? (
              <CodeEditor document={workspace.document} onChange={workspace.setDraft} onSave={() => void workspace.saveCurrentDocument()} />
            ) : (
              <div className="empty-editor">
                <span aria-hidden="true" className="empty-glyph">{`{ }`}</span>
                <h2>Choose a File</h2>
                <p>Browse the workspace hierarchy, make a lightweight edit, and save it back to the source File.</p>
              </div>
            )}
          </section>

          <aside aria-label="Relationship Graph" className="graph-pane">
            <div className="pane-heading">
              <span>Relationship Graph</span>
              <div className="graph-heading-actions">
                <span>Files + Folders</span>
                <GraphSettingsPopover
                  onChange={workspace.updateGraphSetting}
                  onCommit={() => void workspace.flushGraphSettings()}
                  onReset={workspace.resetGraphSettings}
                  settings={workspace.graphSettings}
                />
              </div>
            </div>
            <GraphPanel
              graph={workspace.graph}
              onSelect={id => void workspace.selectFile(id)}
              physicsSettings={workspace.graphSettings}
              revision={workspace.graphRevision}
              selectedId={workspace.selectedPath}
            />
          </aside>
        </div>
      ) : (
        <section className="welcome-state">
          <div aria-hidden="true" className="welcome-mark">
            <img alt="" src={brandIconUrl} />
          </div>
          <p className="eyebrow">MACOS · LOCAL · FAST</p>
          <h1>Trace the relationships<br />inside your workspace.</h1>
          <p>Open a local folder. CodeGraphy keeps the Graph Cache beside your source and puts Files, editing, and the Relationship Graph in one window.</p>
          <button onClick={workspace.openWorkspace} type="button">Open Workspace…</button>
        </section>
      )}

      <footer aria-live="polite" className={`status-bar status-${workspace.status.kind}`} role="status">
        <span aria-hidden="true" className="status-dot" />
        <span>{workspace.status.message}</span>
        {workspace.metricsSummary ? <span className="status-performance" title={`Last opened ${workspace.fileSwitchMetrics?.lastPath}`}>{workspace.metricsSummary}</span> : null}
        <span className="status-local">Local only · macOS 26+</span>
      </footer>

      {workspace.pendingWorkspaceAction && workspace.document ? (
        <WorkspaceSwitchDialog
          filePath={workspace.document.path}
          onCancel={workspace.cancelPendingWorkspaceAction}
          onDiscard={() => void workspace.finishPendingWorkspaceAction(false)}
          onSave={() => void workspace.finishPendingWorkspaceAction(true)}
          saving={workspace.saving}
        />
      ) : null}
    </main>
  );
}
