import { createTLSchema, type TLRecord } from '@tldraw/tlschema';
import Database from 'libsql';

interface MetadataRow {
  documentClock: number;
  schema: string;
}

interface DocumentRow {
  state: Uint8Array;
}

export interface TldrawDocumentDatabase {
  documentClock: number;
  records: TLRecord[];
  schema: ReturnType<ReturnType<typeof createTLSchema>['serialize']>;
}

const CREATE_SCHEMA_SQL = `
  CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    state BLOB NOT NULL,
    lastChangedClock INTEGER NOT NULL
  );
  CREATE INDEX idx_documents_lastChangedClock ON documents(lastChangedClock);
  CREATE TABLE tombstones (
    id TEXT PRIMARY KEY,
    clock INTEGER NOT NULL
  );
  CREATE INDEX idx_tombstones_clock ON tombstones(clock);
  CREATE TABLE metadata (
    migrationVersion INTEGER NOT NULL,
    documentClock INTEGER NOT NULL,
    tombstoneHistoryStartsAtClock INTEGER NOT NULL,
    schema TEXT NOT NULL
  );
`;

export async function writeDocumentDatabase(
  databasePath: string,
  records: readonly TLRecord[],
): Promise<void> {
  const database = new Database(databasePath);
  try {
    database.exec(CREATE_SCHEMA_SQL);
    const insertRecord = database.prepare(
      'INSERT INTO documents (id, state, lastChangedClock) VALUES (?, ?, ?)',
    );
    database.exec('BEGIN IMMEDIATE');
    for (const [clock, record] of records.entries()) {
      insertRecord.run(record.id, Buffer.from(JSON.stringify(record)), clock);
    }
    const documentClock = Math.max(0, records.length - 1);
    database.prepare(`
      INSERT INTO metadata (
        migrationVersion,
        documentClock,
        tombstoneHistoryStartsAtClock,
        schema
      ) VALUES (?, ?, ?, ?)
    `).run(2, documentClock, 0, JSON.stringify(createTLSchema().serialize()));
    database.exec('COMMIT');
  } catch (error) {
    if (database.inTransaction) database.exec('ROLLBACK');
    throw error;
  } finally {
    database.close();
  }
}

export async function readDocumentDatabase(
  databasePath: string,
): Promise<TldrawDocumentDatabase> {
  const database = new Database(databasePath);
  try {
    const metadata = database.prepare(
      'SELECT documentClock, schema FROM metadata LIMIT 1',
    ).get() as MetadataRow | undefined;
    if (!metadata) throw new Error('The tldraw database has no metadata row');
    const rows = database.prepare(
      'SELECT state FROM documents ORDER BY lastChangedClock, id',
    ).all() as unknown as DocumentRow[];
    const records = rows.map(row => JSON.parse(Buffer.from(row.state).toString('utf8')) as TLRecord);
    return {
      documentClock: metadata.documentClock,
      records,
      schema: JSON.parse(metadata.schema) as TldrawDocumentDatabase['schema'],
    };
  } finally {
    database.close();
  }
}
