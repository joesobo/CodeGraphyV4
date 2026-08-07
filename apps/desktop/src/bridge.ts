import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  DEFAULT_GRAPH_PHYSICS_SETTINGS,
  normalizeGraphPhysicsSettings,
  type GraphPhysicsSettings,
} from '@codegraphy-dev/graph-renderer/visuals';
import { parseWorkspaceGraphResult, type WorkspaceGraphResult } from './model';

export interface FileDocument {
  path: string;
  content: string;
  revision: string;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  available: boolean;
}

export interface DesktopMenuHandlers {
  closeFile(this: void): void;
  closeWorkspace(this: void): void;
  openRecent(this: void, path: string): void;
  openWorkspace(this: void): void;
  recentWorkspacesChanged(this: void): void;
  save(this: void): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFileDocument(value: unknown): FileDocument {
  if (!isRecord(value)
    || typeof value.path !== 'string'
    || typeof value.content !== 'string'
    || typeof value.revision !== 'string') {
    throw new Error('The desktop host returned an invalid File.');
  }
  return { path: value.path, content: value.content, revision: value.revision };
}

function parseRecentWorkspace(value: unknown): RecentWorkspace {
  if (!isRecord(value)
    || typeof value.path !== 'string'
    || typeof value.name !== 'string'
    || typeof value.available !== 'boolean') {
    throw new Error('The desktop host returned an invalid recent workspace.');
  }
  return { path: value.path, name: value.name, available: value.available };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function parseDesktopGraphSettings(value: unknown): GraphPhysicsSettings {
  if (value === null) return { ...DEFAULT_GRAPH_PHYSICS_SETTINGS };
  const expectedKeys = ['centerForce', 'damping', 'linkDistance', 'linkForce', 'repelForce'];
  if (!isRecord(value)
    || Object.keys(value).sort().join(',') !== expectedKeys.join(',')
    || !isFiniteNumber(value.repelForce)
    || !isFiniteNumber(value.centerForce)
    || !isFiniteNumber(value.linkDistance)
    || !isFiniteNumber(value.linkForce)
    || !isFiniteNumber(value.damping)) {
    throw new Error('Core returned invalid desktop Graph Settings.');
  }
  return normalizeGraphPhysicsSettings({
    repelForce: value.repelForce,
    centerForce: value.centerForce,
    linkDistance: value.linkDistance,
    linkForce: value.linkForce,
    damping: value.damping,
  });
}

export async function chooseWorkspace(): Promise<string | undefined> {
  const result = await invoke<unknown>('choose_workspace');
  if (result === null) return undefined;
  if (typeof result !== 'string') throw new Error('The desktop host returned an invalid workspace.');
  return result;
}

export async function initialWorkspace(): Promise<string | undefined> {
  const result = await invoke<unknown>('initial_workspace');
  if (result === null) return undefined;
  if (typeof result !== 'string') throw new Error('The desktop host returned an invalid workspace.');
  return result;
}

export async function loadWorkspaceGraph(input: {
  workspaceRoot: string;
  reindex: boolean;
  changedPath?: string;
}): Promise<WorkspaceGraphResult> {
  const result = await invoke<unknown>('load_workspace_graph', input);
  return parseWorkspaceGraphResult(result);
}

export async function listRecentWorkspaces(): Promise<RecentWorkspace[]> {
  const result = await invoke<unknown>('recent_workspaces');
  if (!Array.isArray(result)) throw new Error('The desktop host returned invalid recent workspaces.');
  return result.map(parseRecentWorkspace);
}

export async function clearRecentWorkspaces(): Promise<void> {
  await invoke('clear_recent_workspaces');
}

export async function closeWorkspace(): Promise<void> {
  await invoke('close_workspace');
}

export async function readDesktopGraphSettings(): Promise<GraphPhysicsSettings> {
  return parseDesktopGraphSettings(await invoke<unknown>('read_graph_settings'));
}

export async function writeDesktopGraphSettings(
  settings: GraphPhysicsSettings,
): Promise<GraphPhysicsSettings> {
  return parseDesktopGraphSettings(await invoke<unknown>('write_graph_settings', { settings }));
}

export async function listenToDesktopMenu(handlers: DesktopMenuHandlers): Promise<UnlistenFn> {
  const unlisten = await Promise.all([
    listen('desktop-open-workspace', handlers.openWorkspace),
    listen<unknown>('desktop-open-recent', (event) => {
      if (typeof event.payload === 'string') handlers.openRecent(event.payload);
    }),
    listen('desktop-recent-workspaces-changed', handlers.recentWorkspacesChanged),
    listen('desktop-close-file', handlers.closeFile),
    listen('desktop-close-workspace', handlers.closeWorkspace),
    listen('desktop-save', handlers.save),
  ]);
  return () => {
    for (const stop of unlisten) stop();
  };
}

export async function readWorkspaceFile(relativePath: string): Promise<FileDocument> {
  return parseFileDocument(await invoke<unknown>('read_workspace_file', { relativePath }));
}

export async function saveWorkspaceFile(input: {
  relativePath: string;
  content: string;
  expectedRevision: string;
}): Promise<FileDocument> {
  return parseFileDocument(await invoke<unknown>('save_workspace_file', input));
}
