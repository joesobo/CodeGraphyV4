import Database from 'better-sqlite3';
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

export function withConnection<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => T,
): T {
  const connection = new Database(databasePath);

  try {
    connection.pragma('journal_mode = DELETE');
    connection.pragma('synchronous = NORMAL');
    ensureSchema(connection);
    return callback(connection);
  } finally {
    connection.close();
  }
}

export async function withConnectionAsync<T>(
  databasePath: string,
  callback: (connection: SQLiteConnection) => Promise<T>,
): Promise<T> {
  const connection = new Database(databasePath);

  try {
    connection.pragma('journal_mode = DELETE');
    connection.pragma('synchronous = NORMAL');
    ensureSchema(connection);
    return await callback(connection);
  } finally {
    connection.close();
  }
}
