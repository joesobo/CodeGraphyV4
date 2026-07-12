export type ChurnCounts = Record<string, number>;

const CACHE_VERSION = 1;
const CACHE_KEY = 'codegraphy.churn.index';

interface StoredChurnIndex {
  version: number;
  head: string;
  fileSet: string;
  counts: ChurnCounts;
}

export interface ChurnWorkspaceState {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void>;
}

export function readCachedChurn(
  workspaceState: Pick<ChurnWorkspaceState, 'get'>,
  head?: string,
  fileSet?: string,
): ChurnCounts | null {
  const index = workspaceState.get<StoredChurnIndex>(CACHE_KEY);
  if (index?.version !== CACHE_VERSION) return null;
  if (head !== undefined && index.head !== head) return null;
  if (fileSet !== undefined && index.fileSet !== fileSet) return null;
  return index.counts;
}

export async function writeCachedChurn(
  workspaceState: ChurnWorkspaceState,
  head: string,
  fileSet: string,
  counts: ChurnCounts,
): Promise<void> {
  await workspaceState.update(CACHE_KEY, {
    version: CACHE_VERSION,
    head,
    fileSet,
    counts,
  } satisfies StoredChurnIndex);
}
