import * as fs from 'fs';
import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/types';
import { getCacheDir, getCachePath } from './paths';

type GraphCacheFs = Pick<
  typeof fs.promises,
  'access' | 'mkdir' | 'readFile' | 'rm' | 'writeFile'
>;

function emptyGraphData(): IGraphData {
  return { nodes: [], edges: [] };
}

export async function readCachedGraphData(
  storageUri: vscode.Uri | undefined,
  sha: string,
  fsPromises: GraphCacheFs = fs.promises
): Promise<IGraphData> {
  const cachePath = getCachePath(storageUri, sha);
  if (!cachePath) {
    return emptyGraphData();
  }

  try {
    await fsPromises.access(cachePath);
    const raw = await fsPromises.readFile(cachePath, 'utf-8');
    return JSON.parse(raw) as IGraphData;
  } catch {
    return emptyGraphData();
  }
}

export async function writeCachedGraphData(
  storageUri: vscode.Uri | undefined,
  sha: string,
  graphData: IGraphData,
  fsPromises: GraphCacheFs = fs.promises
): Promise<void> {
  const cachePath = getCachePath(storageUri, sha);
  const cacheDir = getCacheDir(storageUri);
  if (!cachePath || !cacheDir) {
    return;
  }

  await fsPromises.mkdir(cacheDir, { recursive: true });
  await fsPromises.writeFile(cachePath, JSON.stringify(graphData), 'utf-8');
}

export async function removeGitCacheDir(
  storageUri: vscode.Uri | undefined,
  fsPromises: GraphCacheFs = fs.promises
): Promise<void> {
  const cacheDir = getCacheDir(storageUri);
  if (!cacheDir) {
    return;
  }

  try {
    await fsPromises.rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Directory may not exist; ignore cache cleanup failures.
  }
}
