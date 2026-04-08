import { basename } from 'path';
import { tokenize } from '../tokenize';
import { stripExtension } from './nameStrip';

export function isConventionalEntryFile(filePath: string, ancestorFolders: string[]): boolean {
  const fileStem = stripExtension(basename(filePath));
  const lowerStem = fileStem.toLowerCase();
  const lowerAncestors = ancestorFolders.map((folder) => folder.toLowerCase());

  if (lowerStem === 'index') {
    return true;
  }

  if (lowerStem === 'app') {
    return lowerAncestors.includes('app');
  }

  if (lowerStem === 'export') {
    return lowerAncestors.includes('export');
  }

  if (!lowerStem.startsWith('use')) {
    return false;
  }

  const hookName = fileStem.slice(3);
  if (hookName.length === 0) {
    return false;
  }

  const hookTokens = tokenize(hookName);
  return hookTokens.some((hookToken) => ancestorFolders.some((folder) => {
    const folderTokens = tokenize(folder);
    return folderTokens.includes(hookToken);
  }));
}
