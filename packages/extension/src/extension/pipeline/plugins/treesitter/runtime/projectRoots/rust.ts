import { findNearestProjectRoot } from './rootSearch';

export function getRustCrateRoot(filePath: string, workspaceRoot: string): string {
  return findNearestProjectRoot(filePath, ['Cargo.toml'], workspaceRoot) ?? workspaceRoot;
}
