import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  DocumentRecordType,
  PageRecordType,
  TLDOCUMENT_ID,
  type TLPageId,
  type TLRecord,
} from '@tldraw/tlschema';
import type { IndexKey } from '@tldraw/utils';
import { describe, expect, it } from 'vitest';
import { readTldrawArchive, writeTldrawArchive } from '../../src/document/archive';

describe('tldraw archive', () => {
  it('writes and reads the versioned archive metadata, SQLite records, and document script', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-archive-'));
    const targetPath = path.join(directory, 'graph.tldraw');
    const records = [
      DocumentRecordType.create({ id: TLDOCUMENT_ID, name: 'graph' }),
      PageRecordType.create({
        id: 'page:page' as TLPageId,
        name: 'Page 1',
        index: 'a1' as IndexKey,
        meta: {},
      }),
    ] satisfies TLRecord[];

    await writeTldrawArchive({
      assetFiles: { 'user/photo.png': Buffer.from('user image bytes') },
      displayName: 'graph',
      records,
      scriptFiles: { 'main.js': 'export default function main() {}\n' },
      targetPath,
    });

    const archive = await readTldrawArchive(targetPath);
    expect(archive.records).toEqual(records);
    expect(archive.assetFiles).toEqual({
      'user/photo.png': Buffer.from('user image bytes'),
    });
    expect(archive.scriptFiles).toEqual({
      'main.js': Buffer.from('export default function main() {}\n'),
    });
    expect(archive.metadata).toMatchObject({
      createdWith: '@codegraphy-dev/tldraw',
      displayName: 'graph',
      documentClock: 1,
      formatVersion: 1,
    });
    expect(archive.metadata.script.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
