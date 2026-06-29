const CREATE_PATH_VALIDATION_MESSAGES = {
  file: 'Enter a relative file path inside the workspace.',
  folder: 'Enter a relative folder path inside the workspace.',
};

export function resolveWorkspaceCreatePath(input: string, kind: 'file' | 'folder'): string {
  const value = input.trim();
  if (!isSafeWorkspaceCreatePath(value)) {
    throw new Error(CREATE_PATH_VALIDATION_MESSAGES[kind]);
  }

  return value;
}

function isSafeWorkspaceCreatePath(value: string): boolean {
  if (!value || value.startsWith('/') || value.includes('\\') || /^[A-Za-z]:($|\/)/.test(value)) {
    return false;
  }

  return value.split('/').every(isSafePathSegment);
}

function isSafePathSegment(segment: string): boolean {
  return Boolean(segment) && segment !== '.' && segment !== '..';
}
