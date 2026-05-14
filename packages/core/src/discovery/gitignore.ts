/**
 * @fileoverview Gitignore loading helpers for file discovery.
 * @module core/discovery/gitignore
 */

import * as fs from 'fs';
import * as path from 'path';
import ignore, { Ignore } from 'ignore';

type WarnFn = typeof console.warn;

export function loadGitignore(rootPath: string, warn: WarnFn = console.warn): Ignore | null {
  const gitignorePath = path.join(rootPath, '.gitignore');

  try {
    if (!fs.existsSync(gitignorePath)) {
      return null;
    }

    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const gitignore = ignore();
    gitignore.add(content);
    return gitignore;
  } catch (error) {
    warn('[CodeGraphy] Failed to load .gitignore:', error);
    return null;
  }
}
