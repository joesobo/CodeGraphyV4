import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DocumentRecordType,
  PageRecordType,
  TLDOCUMENT_ID,
  createTLSchema,
  type TLPageId,
  type TLRecord,
} from '@tldraw/tlschema';
import type { IndexKey } from '@tldraw/utils';
import { describe, expect, it } from 'vitest';
import { readDocumentDatabase, writeDocumentDatabase } from './database';

describe('tldraw document database', () => {
  it('stores native records with the matching serialized schema and document clock', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-db-'));
    const databasePath = path.join(directory, 'db.sqlite');
    const records = [
      DocumentRecordType.create({ id: TLDOCUMENT_ID, name: 'CodeGraphy' }),
      PageRecordType.create({
        id: 'page:page' as TLPageId,
        name: 'Page 1',
        index: 'a1' as IndexKey,
        meta: {},
      }),
    ] satisfies TLRecord[];

    await writeDocumentDatabase(databasePath, records);

    expect((await readFile(databasePath)).subarray(0, 16).toString()).toBe('SQLite format 3\0');
    await expect(readDocumentDatabase(databasePath)).resolves.toEqual({
      documentClock: 1,
      records,
      schema: createTLSchema().serialize(),
    });
  });
});
