export function isWorkspaceAnalysisAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function isMissingFileError(error: unknown): boolean {
  return error instanceof Error
    && 'code' in error
    && (error as { code?: unknown }).code === 'ENOENT';
}
