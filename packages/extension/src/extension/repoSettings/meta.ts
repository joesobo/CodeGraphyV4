import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ICodeGraphyRepoMeta {
  version: 1;
  lastIndexedAt: string | null;
  lastIndexedCommit: string | null;
  pluginSignature: string | null;
  settingsSignature: string | null;
}

const META_FILE_NAME = 'meta.json';

export function createDefaultCodeGraphyRepoMeta(): ICodeGraphyRepoMeta {
  return {
    version: 1,
    lastIndexedAt: null,
    lastIndexedCommit: null,
    pluginSignature: null,
    settingsSignature: null,
  };
}

export function getCodeGraphyRepoMetaPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.codegraphy', META_FILE_NAME);
}

export function readCodeGraphyRepoMeta(workspaceRoot: string): ICodeGraphyRepoMeta {
  const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);

  try {
    const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as Partial<ICodeGraphyRepoMeta>;
    return {
      ...createDefaultCodeGraphyRepoMeta(),
      ...parsed,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return createDefaultCodeGraphyRepoMeta();
    }

    return createDefaultCodeGraphyRepoMeta();
  }
}

export function writeCodeGraphyRepoMeta(
  workspaceRoot: string,
  meta: ICodeGraphyRepoMeta,
): void {
  if (!fs.existsSync(workspaceRoot)) {
    return;
  }

  const metaPath = getCodeGraphyRepoMetaPath(workspaceRoot);
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
}
