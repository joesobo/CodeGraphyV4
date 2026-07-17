import * as fs from 'node:fs';
import Database from 'libsql';
import type { FileAnalysisRow } from '../records/contracts';
import { ensureSchema } from './schema';

export type SQLiteConnection = Database.Database;
export type SQLiteStatement = Database.Statement;
export type SQLiteValue = string | number | bigint | Buffer | null;

export function runStatementSync(connection: SQLiteConnection, statement: string): void {
  connection.exec(statement);
}

export async function runStatementAsync(
  connection: SQLiteConnection,
  statement: string,
): Promise<void> {
  runStatementSync(connection, statement);
}

export function prepareStatementSync(
  connection: SQLiteConnection,
  statement: string,
): SQLiteStatement {
  return connection.prepare(statement);
}

export async function prepareStatementAsync(
  connection: SQLiteConnection,
  statement: string,
): Promise<SQLiteStatement> {
  return prepareStatementSync(connection, statement);
}

export function executeStatementSync(
  _connection: SQLiteConnection,
  preparedStatement: SQLiteStatement,
  params: Record<string, SQLiteValue>,
): void {
  preparedStatement.run(params);
}

export async function executeStatementAsync(
  connection: SQLiteConnection,
  preparedStatement: SQLiteStatement,
  params: Record<string, SQLiteValue>,
): Promise<void> {
  executeStatementSync(connection, preparedStatement, params);
}

export function readRowsSync(
  connection: SQLiteConnection,
  statement: string,
): FileAnalysisRow[] {
  return connection.prepare(statement).all() as FileAnalysisRow[];
}

export async function readRowsAsync(
  connection: SQLiteConnection,
  statement: string,
): Promise<FileAnalysisRow[]> {
  return readRowsSync(connection, statement);
}

const DATABASE_SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'];

export function isInvalidDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return false;
  }
  return error.code === 'SQLITE_NOTADB' || error.code === 'SQLITE_CORRUPT';
}

function resetInvalidDatabase(databasePath: string): void {
  fs.truncateSync(databasePath, 0);
  for (const suffix of DATABASE_SIDECAR_SUFFIXES) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
}

export function recreateInvalidDatabase(
  databasePath: string,
  error: unknown,
  reset: (path: string) => void = resetInvalidDatabase,
): boolean {
  if (!isInvalidDatabaseError(error)) {
    return false;
  }
  try {
    reset(databasePath);
  } catch {
    throw error;
  }
  return true;
}

function openConnection(databasePath: string): SQLiteConnection {
  const connection = new Database(databasePath);
  try {
    connection.pragma('journal_mode = DELETE');
    connection.pragma('synchronous = NORMAL');
    ensureSchema(connection);
    return connection;
  } catch (error) {
    try {
      connection.close();
    } catch {
      // Preserve the original connection failure.
    }
    throw error;
  }
}

export function withConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
): T {
  const connection = openConnection(databasePath);

  try {
    return callback(connection);
  } finally {
    connection.close();
  }
}

export async function withConnectionAsync<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => Promise<T>,
): Promise<T> {
  const connection = openConnection(databasePath);

  try {
    return await callback(connection);
  } finally {
    connection.close();
  }
}
