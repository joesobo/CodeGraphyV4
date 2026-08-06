import { invoke } from '@tauri-apps/api/core';
import { parseWorkspaceGraphResult, type WorkspaceGraphResult } from './model';

export interface FileDocument {
  path: string;
  content: string;
  revision: string;
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
  includeSymbols: boolean;
}): Promise<WorkspaceGraphResult> {
  const result = await invoke<unknown>('load_workspace_graph', input);
  return parseWorkspaceGraphResult(result);
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
