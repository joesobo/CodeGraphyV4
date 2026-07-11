import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isRecentSavedDocumentPath,
  isRecentWorkspaceMutationPath,
  rememberRecentSavedDocumentPath,
  rememberRecentWorkspaceMutationPaths,
} from '../../../../src/extension/workspaceFiles/refresh/recentSaves';

describe('workspaceFiles/refresh/recentSaves', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('suppresses every watcher event in the recent-save window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T00:00:00.000Z'));
    rememberRecentSavedDocumentPath('C:\\workspace\\src\\atomic-save.ts');

    expect(isRecentSavedDocumentPath('C:/workspace/src/other.ts')).toBe(false);
    expect(isRecentSavedDocumentPath('C:/workspace/src/atomic-save.ts')).toBe(true);
    expect(isRecentSavedDocumentPath('C:/workspace/src/atomic-save.ts')).toBe(true);

    vi.advanceTimersByTime(1_000);

    expect(isRecentSavedDocumentPath('C:/workspace/src/atomic-save.ts')).toBe(true);

    vi.advanceTimersByTime(1);

    expect(isRecentSavedDocumentPath('C:/workspace/src/atomic-save.ts')).toBe(false);
  });

  it('suppresses raw watcher duplicates for every affected mutation path', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T00:00:00.000Z'));
    rememberRecentWorkspaceMutationPaths(['src/old.ts', 'src/new.ts']);

    expect(isRecentWorkspaceMutationPath('src/old.ts')).toBe(true);
    expect(isRecentWorkspaceMutationPath('src/new.ts')).toBe(true);
    expect(isRecentWorkspaceMutationPath('src/other.ts')).toBe(false);

    vi.advanceTimersByTime(30_001);
    expect(isRecentWorkspaceMutationPath('src/old.ts')).toBe(false);
  });
});
