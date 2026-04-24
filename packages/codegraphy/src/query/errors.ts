export class MissingDatabaseError extends Error {
  readonly workspaceRoot: string;
  readonly databasePath: string;

  constructor(workspaceRoot: string, databasePath: string, message: string) {
    super(message);
    this.name = 'MissingDatabaseError';
    this.workspaceRoot = workspaceRoot;
    this.databasePath = databasePath;
  }
}
