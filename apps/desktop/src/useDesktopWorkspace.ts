import {
  DEFAULT_GRAPH_PHYSICS_SETTINGS,
  normalizeGraphPhysicsSetting,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-visuals';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  chooseWorkspace,
  clearRecentWorkspaces,
  closeWorkspace,
  initialWorkspace,
  listRecentWorkspaces,
  listenToDesktopMenu,
  loadWorkspaceGraph,
  readDesktopGraphSettings,
  readWorkspaceFile,
  saveWorkspaceFile,
  writeDesktopGraphSettings,
  type FileDocument,
  type RecentWorkspace,
} from './bridge';
import { buildFileTree, countFiles, type WorkspaceGraphResult } from './model';

type AppStatus =
  | { kind: 'idle'; message: string }
  | { kind: 'busy'; message: string }
  | { kind: 'ready'; message: string }
  | { kind: 'error'; message: string };

type WorkspaceAction =
  | { kind: 'choose' }
  | { kind: 'close' }
  | { kind: 'open'; path: string };

interface FileSwitchMetrics {
  lastPath: string;
  samples: number[];
}

interface DesktopWorkspaceState {
  document?: FileDocument;
  draft: string;
  fileSwitchMetrics?: FileSwitchMetrics;
  graphRevision: number;
  graphResult?: WorkspaceGraphResult;
  graphSettings: GraphPhysicsSettings;
  pendingFilePath?: string;
  pendingWorkspaceAction?: WorkspaceAction;
  recentWorkspaces: RecentWorkspace[];
  saving: boolean;
  selectedGraphNodeId?: string;
  status: AppStatus;
  workspaceRoot?: string;
}

type DesktopWorkspaceEvent =
  | { type: 'close_workspace' }
  | { type: 'file_metrics'; elapsed: number; path: string }
  | { type: 'file_closed' }
  | { type: 'file_opened'; document: FileDocument }
  | { type: 'file_pending'; path?: string }
  | { type: 'file_saved'; document: FileDocument }
  | { type: 'graph_settings'; settings: GraphPhysicsSettings }
  | { type: 'graph_selected'; id?: string }
  | { type: 'recent_workspaces'; workspaces: RecentWorkspace[] }
  | { type: 'saving'; saving: boolean }
  | { type: 'set_draft'; draft: string }
  | { type: 'status'; status: AppStatus }
  | { type: 'workspace_action'; action?: WorkspaceAction }
  | { type: 'workspace_loaded'; changed: boolean; result: WorkspaceGraphResult };

const initialState: DesktopWorkspaceState = {
  draft: '',
  graphRevision: 0,
  graphSettings: DEFAULT_GRAPH_PHYSICS_SETTINGS,
  recentWorkspaces: [],
  saving: false,
  status: { kind: 'idle', message: 'Open a local workspace to begin.' },
};

function desktopWorkspaceReducer(
  state: DesktopWorkspaceState,
  event: DesktopWorkspaceEvent,
): DesktopWorkspaceState {
  switch (event.type) {
    case 'close_workspace':
      return {
        ...initialState,
        recentWorkspaces: state.recentWorkspaces,
        status: { kind: 'idle', message: 'Workspace closed. Open a local workspace to continue.' },
      };
    case 'file_metrics':
      return {
        ...state,
        fileSwitchMetrics: {
          lastPath: event.path,
          samples: [...(state.fileSwitchMetrics?.samples ?? []), event.elapsed].slice(-24),
        },
      };
    case 'file_closed':
      return {
        ...state,
        document: undefined,
        draft: '',
        pendingFilePath: undefined,
      };
    case 'file_opened':
      return {
        ...state,
        document: event.document,
        draft: event.document.content,
        pendingFilePath: undefined,
      };
    case 'file_pending':
      return { ...state, pendingFilePath: event.path };
    case 'file_saved':
      return { ...state, document: event.document, draft: event.document.content };
    case 'graph_settings':
      return { ...state, graphSettings: event.settings };
    case 'graph_selected':
      return { ...state, selectedGraphNodeId: event.id };
    case 'recent_workspaces':
      return { ...state, recentWorkspaces: event.workspaces };
    case 'saving':
      return { ...state, saving: event.saving };
    case 'set_draft':
      return { ...state, draft: event.draft };
    case 'status':
      return { ...state, status: event.status };
    case 'workspace_action':
      return { ...state, pendingWorkspaceAction: event.action };
    case 'workspace_loaded':
      return {
        ...state,
        graphRevision: state.graphRevision + 1,
        workspaceRoot: event.result.workspaceRoot,
        graphResult: event.result,
        selectedGraphNodeId: !event.changed
          && event.result.kind === 'ready'
          && state.selectedGraphNodeId
          && event.result.graph.nodes.some(node => node.id === state.selectedGraphNodeId)
          ? state.selectedGraphNodeId
          : undefined,
        ...(event.changed
          ? {
              document: undefined,
              draft: '',
              fileSwitchMetrics: undefined,
              graphSettings: DEFAULT_GRAPH_PHYSICS_SETTINGS,
              pendingFilePath: undefined,
            }
          : {}),
      };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function percentile(samples: readonly number[], amount: number): number {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((sorted.length - 1) * amount));
  return sorted[index] ?? 0;
}

function formatFileSwitchMetrics(metrics: FileSwitchMetrics | undefined): string | undefined {
  if (!metrics || metrics.samples.length === 0) return undefined;
  const last = metrics.samples.at(-1) ?? 0;
  const median = percentile(metrics.samples, 0.5);
  const p95 = percentile(metrics.samples, 0.95);
  return `File open ${last.toFixed(1)} ms · median ${median.toFixed(1)} · p95 ${p95.toFixed(1)} · n=${metrics.samples.length}`;
}

export function useDesktopWorkspace() {
  const [state, dispatch] = useReducer(desktopWorkspaceReducer, initialState);
  const workspaceRequestRef = useRef(0);
  const fileRequestRef = useRef(0);
  const graphSettingsDirtyRef = useRef(false);
  const graphSettingsRef = useRef<GraphPhysicsSettings>(DEFAULT_GRAPH_PHYSICS_SETTINGS);
  const graphSettingsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const workspaceRootRef = useRef<string>();
  const graph = state.graphResult?.kind === 'ready' ? state.graphResult.graph : undefined;
  const tree = useMemo(() => graph ? buildFileTree(graph) : [], [graph]);
  const fileCount = graph ? countFiles(graph) : 0;
  const dirty = state.document !== undefined && state.draft !== state.document.content;
  const selectedPath = state.pendingFilePath ?? state.document?.path;
  const metricsSummary = formatFileSwitchMetrics(state.fileSwitchMetrics);

  const reportError = useCallback((error: unknown): void => {
    dispatch({ type: 'status', status: { kind: 'error', message: errorMessage(error) } });
  }, []);

  const refreshRecentWorkspaces = useCallback(async (showError = true): Promise<void> => {
    try {
      dispatch({ type: 'recent_workspaces', workspaces: await listRecentWorkspaces() });
    } catch (error) {
      if (showError) reportError(error);
    }
  }, [reportError]);

  const openGraph = useCallback(async (
    root: string,
    options: { reindex: boolean; changedPath?: string },
  ): Promise<boolean> => {
    const requestId = ++workspaceRequestRef.current;
    dispatch({
      type: 'status',
      status: {
        kind: 'busy',
        message: options.changedPath
          ? `Core is updating ${options.changedPath}…`
          : options.reindex ? 'Core is re-indexing the workspace…' : 'Loading the Graph Cache…',
      },
    });
    try {
      const result = await loadWorkspaceGraph({
        workspaceRoot: root,
        reindex: options.reindex,
        changedPath: options.changedPath,
      });
      if (requestId !== workspaceRequestRef.current) return false;
      const changed = workspaceRootRef.current !== result.workspaceRoot;
      workspaceRootRef.current = result.workspaceRoot;
      if (changed) fileRequestRef.current += 1;
      dispatch({ type: 'workspace_loaded', changed, result });
      if (changed) {
        const settings = await readDesktopGraphSettings();
        if (requestId !== workspaceRequestRef.current) return false;
        graphSettingsRef.current = settings;
        graphSettingsDirtyRef.current = false;
        dispatch({ type: 'graph_settings', settings });
      }
      void refreshRecentWorkspaces(false);
      if (result.kind === 'unreadable') {
        dispatch({ type: 'status', status: { kind: 'error', message: result.message } });
        return true;
      }
      const indexing = result.indexing
        ? `${result.indexing.mode} Indexing · ${result.indexing.analyzedFiles} analyzed · ${result.indexing.reusedFiles} reused`
        : result.cacheStatus.state === 'stale'
          ? 'Graph Cache is stale · Re-index when ready'
          : 'Graph Cache is current';
      dispatch({ type: 'status', status: { kind: 'ready', message: indexing } });
      return true;
    } catch (error) {
      if (requestId === workspaceRequestRef.current) reportError(error);
      return false;
    }
  }, [refreshRecentWorkspaces, reportError]);

  const persistGraphSettings = useCallback(async (): Promise<void> => {
    if (!graphSettingsDirtyRef.current || !workspaceRootRef.current) return;
    graphSettingsDirtyRef.current = false;
    try {
      await writeDesktopGraphSettings(graphSettingsRef.current);
    } catch (error) {
      graphSettingsDirtyRef.current = true;
      reportError(error);
    }
  }, [reportError]);

  const flushGraphSettings = useCallback(async (): Promise<void> => {
    if (graphSettingsTimerRef.current) {
      clearTimeout(graphSettingsTimerRef.current);
      graphSettingsTimerRef.current = undefined;
    }
    await persistGraphSettings();
  }, [persistGraphSettings]);

  const updateGraphSetting = useCallback((
    key: keyof GraphPhysicsSettings,
    value: number,
  ): void => {
    const settings = {
      ...graphSettingsRef.current,
      [key]: normalizeGraphPhysicsSetting(key, value),
    };
    graphSettingsRef.current = settings;
    graphSettingsDirtyRef.current = true;
    dispatch({ type: 'graph_settings', settings });
    if (graphSettingsTimerRef.current) clearTimeout(graphSettingsTimerRef.current);
    graphSettingsTimerRef.current = setTimeout(() => {
      graphSettingsTimerRef.current = undefined;
      void persistGraphSettings();
    }, 350);
  }, [persistGraphSettings]);

  const resetGraphSettings = useCallback((): void => {
    graphSettingsRef.current = { ...DEFAULT_GRAPH_PHYSICS_SETTINGS };
    graphSettingsDirtyRef.current = true;
    dispatch({ type: 'graph_settings', settings: graphSettingsRef.current });
    void flushGraphSettings();
  }, [flushGraphSettings]);

  useEffect(() => {
    void refreshRecentWorkspaces();
    void initialWorkspace()
      .then((root) => { if (root) void openGraph(root, { reindex: false }); })
      .catch(reportError);
  }, [openGraph, refreshRecentWorkspaces, reportError]);

  const selectFile = useCallback(async (path: string): Promise<void> => {
    if (state.document?.path === path || state.pendingFilePath === path) return;
    if (dirty && !window.confirm('Discard the unsaved edit and open another File?')) return;
    const requestId = ++fileRequestRef.current;
    const startedAt = performance.now();
    dispatch({ type: 'file_pending', path });
    try {
      const document = await readWorkspaceFile(path);
      if (requestId !== fileRequestRef.current) return;
      dispatch({ type: 'file_opened', document });
      dispatch({ type: 'graph_selected', id: path });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (requestId !== fileRequestRef.current) return;
        dispatch({ type: 'file_metrics', elapsed: performance.now() - startedAt, path });
      }));
    } catch (error) {
      if (requestId !== fileRequestRef.current) return;
      dispatch({ type: 'file_pending' });
      reportError(error);
    }
  }, [dirty, reportError, state.document?.path, state.pendingFilePath]);

  const selectGraphNode = useCallback((id: string | undefined): void => {
    dispatch({ type: 'graph_selected', id });
    if (!id) return;
    const node = graph?.nodes.find(candidate => candidate.id === id);
    if (node && node.nodeType !== 'folder') void selectFile(id);
  }, [graph?.nodes, selectFile]);

  const closeCurrentDocument = useCallback((): void => {
    if ((!state.document && !state.pendingFilePath) || state.saving) return;
    if (dirty && !window.confirm('Discard the unsaved edit and close this File?')) return;
    fileRequestRef.current += 1;
    dispatch({ type: 'file_closed' });
  }, [dirty, state.document, state.pendingFilePath, state.saving]);

  const saveCurrentDocument = useCallback(async (): Promise<boolean> => {
    if (!state.document || !dirty || state.saving || !workspaceRootRef.current) return !dirty;
    const root = workspaceRootRef.current;
    dispatch({ type: 'saving', saving: true });
    try {
      const document = await saveWorkspaceFile({
        relativePath: state.document.path,
        content: state.draft,
        expectedRevision: state.document.revision,
      });
      dispatch({ type: 'file_saved', document });
      await openGraph(root, { reindex: false, changedPath: document.path });
      return true;
    } catch (error) {
      reportError(error);
      return false;
    } finally {
      dispatch({ type: 'saving', saving: false });
    }
  }, [dirty, openGraph, reportError, state.document, state.draft, state.saving]);

  const closeCurrentWorkspace = useCallback(async (): Promise<void> => {
    await flushGraphSettings();
    workspaceRequestRef.current += 1;
    fileRequestRef.current += 1;
    try {
      await closeWorkspace();
      workspaceRootRef.current = undefined;
      graphSettingsRef.current = DEFAULT_GRAPH_PHYSICS_SETTINGS;
      graphSettingsDirtyRef.current = false;
      dispatch({ type: 'close_workspace' });
    } catch (error) {
      reportError(error);
    }
  }, [flushGraphSettings, reportError]);

  const executeWorkspaceAction = useCallback(async (action: WorkspaceAction): Promise<void> => {
    await flushGraphSettings();
    if (action.kind === 'close') {
      await closeCurrentWorkspace();
      return;
    }
    if (action.kind === 'open') {
      await openGraph(action.path, { reindex: false });
      return;
    }
    try {
      const root = await chooseWorkspace();
      if (root) await openGraph(root, { reindex: false });
    } catch (error) {
      reportError(error);
    }
  }, [closeCurrentWorkspace, flushGraphSettings, openGraph, reportError]);

  const requestWorkspaceAction = useCallback((action: WorkspaceAction): void => {
    if (dirty) {
      dispatch({ type: 'workspace_action', action });
      return;
    }
    void executeWorkspaceAction(action);
  }, [dirty, executeWorkspaceAction]);

  const requestWorkspaceActionRef = useRef(requestWorkspaceAction);
  const closeCurrentDocumentRef = useRef(closeCurrentDocument);
  const saveCurrentDocumentRef = useRef(saveCurrentDocument);

  useEffect(() => {
    requestWorkspaceActionRef.current = requestWorkspaceAction;
    closeCurrentDocumentRef.current = closeCurrentDocument;
    saveCurrentDocumentRef.current = saveCurrentDocument;
  }, [closeCurrentDocument, requestWorkspaceAction, saveCurrentDocument]);

  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    void listenToDesktopMenu({
      closeFile: () => closeCurrentDocumentRef.current(),
      closeWorkspace: () => requestWorkspaceActionRef.current({ kind: 'close' }),
      openRecent: path => requestWorkspaceActionRef.current({ kind: 'open', path }),
      openWorkspace: () => requestWorkspaceActionRef.current({ kind: 'choose' }),
      recentWorkspacesChanged: () => void refreshRecentWorkspaces(),
      save: () => void saveCurrentDocumentRef.current(),
    }).then((unlisten) => {
      if (active) stop = unlisten;
      else unlisten();
    }).catch(reportError);
    return () => {
      active = false;
      stop?.();
    };
  }, [refreshRecentWorkspaces, reportError]);

  useEffect(() => () => {
    if (graphSettingsTimerRef.current) clearTimeout(graphSettingsTimerRef.current);
  }, []);

  const clearRecent = useCallback(async (): Promise<void> => {
    try {
      await clearRecentWorkspaces();
      await refreshRecentWorkspaces();
    } catch (error) {
      reportError(error);
    }
  }, [refreshRecentWorkspaces, reportError]);

  const finishPendingWorkspaceAction = useCallback(async (save: boolean): Promise<void> => {
    const action = state.pendingWorkspaceAction;
    if (!action) return;
    if (save && !await saveCurrentDocument()) return;
    dispatch({ type: 'workspace_action' });
    await executeWorkspaceAction(action);
  }, [executeWorkspaceAction, saveCurrentDocument, state.pendingWorkspaceAction]);

  return {
    ...state,
    dirty,
    fileCount,
    graph,
    metricsSummary,
    selectedPath,
    tree,
    cancelPendingWorkspaceAction: () => dispatch({ type: 'workspace_action' }),
    clearRecent,
    clearGraphSelection: () => dispatch({ type: 'graph_selected' }),
    closeCurrentDocument,
    finishPendingWorkspaceAction,
    flushGraphSettings,
    openRecentWorkspace: (path: string) => requestWorkspaceAction({ kind: 'open', path }),
    openWorkspace: () => requestWorkspaceAction({ kind: 'choose' }),
    reindex: () => state.workspaceRoot && void openGraph(state.workspaceRoot, { reindex: true }),
    resetGraphSettings,
    saveCurrentDocument,
    selectFile,
    selectGraphNode,
    setDraft: (draft: string) => dispatch({ type: 'set_draft', draft }),
    updateGraphSetting,
  };
}
