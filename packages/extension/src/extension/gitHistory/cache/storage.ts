import * as fs from 'fs';
import * as vscode from 'vscode';
import { z } from 'zod';
import type { IGraphData } from '../../../shared/graph/contracts';
import { getCacheDir, getCachePath } from './paths';

type GraphCacheFs = Pick<
  typeof fs.promises,
  'access' | 'mkdir' | 'readFile' | 'rm' | 'writeFile'
>;

function emptyGraphData(): IGraphData {
  return { nodes: [], edges: [] };
}

const cachedGraphNodeSchema = z.looseObject({
  id: z.string(),
  label: z.string(),
  color: z.string(),
}).transform((node): IGraphData['nodes'][number] => node as IGraphData['nodes'][number]);

const cachedGraphEdgeSourceSchema = z.looseObject({
  id: z.string(),
  pluginId: z.string(),
  sourceId: z.string(),
  label: z.string(),
}).transform((source): IGraphData['edges'][number]['sources'][number] =>
  source as IGraphData['edges'][number]['sources'][number]
);

const cachedGraphEdgeSourcesSchema = z
  .array(z.unknown())
  .catch([])
  .transform((sources): IGraphData['edges'][number]['sources'] => sources.flatMap((source) => {
    const parsed = cachedGraphEdgeSourceSchema.safeParse(source);
    return parsed.success ? [parsed.data] : [];
  }));

const cachedGraphEdgeSchema = z.looseObject({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  kind: z.string(),
  sources: cachedGraphEdgeSourcesSchema,
}).transform((edge): IGraphData['edges'][number] => edge as IGraphData['edges'][number]);

const cachedGraphDataSchema = z.looseObject({
  nodes: z.array(cachedGraphNodeSchema),
  edges: z.array(cachedGraphEdgeSchema),
}).transform(({ nodes, edges }): IGraphData => ({ nodes, edges }));

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
    const parsed = cachedGraphDataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyGraphData();
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
