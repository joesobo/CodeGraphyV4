import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export type GraphInlineEditSession =
  | {
      kind: 'rename';
      anchorNodeId: string;
      directory: string;
      originalPath: string;
      selection: [number, number];
      value: string;
      error: string | null;
      pending: boolean;
    }
  | {
      kind: 'createFile' | 'createFolder';
      anchorNodeId: string;
      directory: string;
      selection: [number, number];
      value: string;
      error: string | null;
      pending: boolean;
    };

export type GraphInlineEditPlan =
  | { kind: 'unchanged' }
  | { kind: 'invalid'; message: string }
  | { kind: 'commit'; message: WebviewToExtensionMessage };

export function createInlineRenameSession(path: string): GraphInlineEditSession {
  const value = path.split('/').pop() || path;
  const extensionIndex = value.lastIndexOf('.');
  return {
    kind: 'rename',
    anchorNodeId: path,
    directory: parentDirectory(path),
    originalPath: path,
    selection: [0, extensionIndex > 0 ? extensionIndex : value.length],
    value,
    error: null,
    pending: false,
  };
}

export function createInlineCreateSession(
  kind: 'file' | 'folder',
  directory: string,
): GraphInlineEditSession {
  return {
    kind: kind === 'file' ? 'createFile' : 'createFolder',
    anchorNodeId: directory === '.' ? '(root)' : directory,
    directory,
    selection: [0, 0],
    value: '',
    error: null,
    pending: false,
  };
}

export function planInlineFileEdit(
  session: GraphInlineEditSession,
  input: string,
): GraphInlineEditPlan {
  const value = input.trim();
  if (session.kind === 'rename') {
    const currentName = session.originalPath.split('/').pop() || session.originalPath;
    if (value === currentName) return { kind: 'unchanged' };
    if (!isSafeBasename(value)) {
      return { kind: 'invalid', message: 'Enter a file name without folder separators.' };
    }
    return {
      kind: 'commit',
      message: {
        type: 'RENAME_FILE',
        payload: { path: session.originalPath, newName: value },
      },
    };
  }

  if (!isSafeChildPath(value)) {
    return {
      kind: 'invalid',
      message: session.kind === 'createFile'
        ? 'Enter a relative file path inside this folder.'
        : 'Enter a relative folder path inside this folder.',
    };
  }
  return {
    kind: 'commit',
    message: {
      type: session.kind === 'createFile' ? 'CREATE_FILE' : 'CREATE_FOLDER',
      payload: { directory: session.directory, name: value },
    },
  };
}

function parentDirectory(path: string): string {
  const separator = path.lastIndexOf('/');
  return separator < 0 ? '.' : path.slice(0, separator);
}

function isSafeBasename(value: string): boolean {
  return isSafePathSegment(value) && !value.includes('/') && !value.includes('\\');
}

function isSafeChildPath(value: string): boolean {
  return Boolean(value)
    && !value.startsWith('/')
    && !value.includes('\\')
    && !/^[A-Za-z]:($|\/)/.test(value)
    && value.split('/').every(isSafePathSegment);
}

function isSafePathSegment(value: string): boolean {
  if (!value || value === '.' || value === '..') return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return false;
  }
  return true;
}
