import * as fs from 'node:fs';
import Database from 'libsql';
import { ensureSchema } from './schema';
import {
  withWorkspaceCacheWriteLock,
  withWorkspaceCacheWriteLockAsync,
} from '../writeCoordination/model';

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
): Record<string, unknown>[] {
  return connection.prepare(statement).all() as Record<string, unknown>[];
}

export async function readRowsAsync(
  connection: SQLiteConnection,
  statement: string,
): Promise<Record<string, unknown>[]> {
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

function resetDatabaseOrThrowOriginal(
  databasePath: string,
  error: unknown,
  reset: (path: string) => void,
): void {
  if (!isInvalidDatabaseError(error)) throw error;
  try {
    reset(databasePath);
  } catch {
    throw error;
  }
}

function openConnection(databasePath: string): SQLiteConnection {
  const connection = new Database(databasePath);
  try {
    connection.pragma('busy_timeout = 5000');
    connection.pragma('foreign_keys = ON');
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

function openReadOnlyConnection(databasePath: string): SQLiteConnection {
  const connection = new Database(databasePath, { readonly: true, fileMustExist: true });
  connection.pragma('busy_timeout = 5000');
  return connection;
}

function useConnection<T>(
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

async function useConnectionAsync<T>(
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

export function withOwnedConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
): T {
  return useConnection(databasePath, callback);
}

export function withConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
): T {
  return withWorkspaceCacheWriteLock(
    databasePath,
    () => withOwnedConnection(databasePath, callback),
  );
}

export function withConnectionAsync<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => Promise<T>,
): Promise<T> {
  return withWorkspaceCacheWriteLockAsync(
    databasePath,
    () => useConnectionAsync(databasePath, callback),
  );
}

export function withOwnedRecreatedConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
  reset: (path: string) => void = resetInvalidDatabase,
): T {
  try {
    return useConnection(databasePath, callback);
  } catch (error) {
    resetDatabaseOrThrowOriginal(databasePath, error, reset);
    return useConnection(databasePath, callback);
  }
}

export function withRecreatedConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
  reset: (path: string) => void = resetInvalidDatabase,
): T {
  return withWorkspaceCacheWriteLock(
    databasePath,
    () => withOwnedRecreatedConnection(databasePath, callback, reset),
  );
}

export function withRecreatedConnectionAsync<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => Promise<T>,
  reset: (path: string) => void = resetInvalidDatabase,
): Promise<T> {
  return withWorkspaceCacheWriteLockAsync(databasePath, async () => {
    try {
      return await useConnectionAsync(databasePath, callback);
    } catch (error) {
      resetDatabaseOrThrowOriginal(databasePath, error, reset);
      return useConnectionAsync(databasePath, callback);
    }
  });
}

export function withReadOnlyConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
): T {
  const connection = openReadOnlyConnection(databasePath);

  try {
    return callback(connection);
  } finally {
    connection.close();
  }
}
