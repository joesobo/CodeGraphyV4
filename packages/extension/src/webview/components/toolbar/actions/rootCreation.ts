import { postMessage } from '../../../vscodeApi';

export function postRootFileCreation(): void {
  postMessage({ type: 'CREATE_FILE', payload: { directory: '.' } });
}

export function postRootFolderCreation(): void {
  postMessage({ type: 'CREATE_FOLDER', payload: { directory: '.' } });
}
