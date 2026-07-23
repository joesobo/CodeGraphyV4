import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { IGraphData } from '@codegraphy-dev/core';
import {
  DocumentRecordType,
  PageRecordType,
  TLDOCUMENT_ID,
  type TLPageId,
  type TLRecord,
} from '@tldraw/tlschema';
import type { IndexKey } from '@tldraw/utils';
import { projectDefaultFileGraph } from '../graph/projection';
import { DEFAULT_FORCE_SETTINGS } from '../documentRuntime/forceControls/model';
import { readTldrawArchive, writeTldrawArchive } from './archive';
import { reconcileGraphRecords } from './records';

export interface WriteGraphDocumentInput {
  graph: IGraphData;
  scriptFiles: Readonly<Record<string, Buffer | string>>;
  targetPath: string;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function createBaseRecords(displayName: string): TLRecord[] {
  return [
    DocumentRecordType.create({ id: TLDOCUMENT_ID, name: displayName }),
    PageRecordType.create({
      id: 'page:page' as TLPageId,
      name: 'Page 1',
      index: 'a1' as IndexKey,
      meta: { codegraphyPhysics: DEFAULT_FORCE_SETTINGS },
    }),
  ];
}

export async function writeGraphDocument(input: WriteGraphDocumentInput): Promise<void> {
  const displayName = path.basename(input.targetPath, path.extname(input.targetPath));
  const existingArchive = await fileExists(input.targetPath)
    ? await readTldrawArchive(input.targetPath)
    : undefined;
  const existingRecords = existingArchive?.records ?? createBaseRecords(displayName);
  const records = reconcileGraphRecords(
    existingRecords,
    projectDefaultFileGraph(input.graph),
  );
  await writeTldrawArchive({
    assetFiles: existingArchive?.assetFiles,
    displayName,
    records,
    scriptFiles: input.scriptFiles,
    targetPath: input.targetPath,
  });
}
