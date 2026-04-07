import { describe, expect, it } from 'vitest';
import { isConventionalEntryFile } from '../../../src/organize/metric/pathRedundancyConventional';

describe('isConventionalEntryFile', () => {
  it('treats index files as conventional', () => {
    expect(isConventionalEntryFile('webview/settings/index.ts', ['webview', 'settings'])).toBe(true);
  });

  it('treats app and export entry files as conventional only in matching folders', () => {
    expect(isConventionalEntryFile('webview/app/App.tsx', ['webview', 'app'])).toBe(true);
    expect(isConventionalEntryFile('webview/export/export.ts', ['webview', 'export'])).toBe(true);
    expect(isConventionalEntryFile('webview/export/export.ts', ['webview', 'reports'])).toBe(false);
    expect(isConventionalEntryFile('webview/app/router.ts', ['webview', 'app'])).toBe(false);
    expect(isConventionalEntryFile('webview/export/report.ts', ['webview', 'export'])).toBe(false);
  });

  it('treats matching hook-style files as conventional', () => {
    expect(isConventionalEntryFile('features/editor/useEditorState.ts', ['features', 'editor'])).toBe(true);
  });

  it('rejects non-matching hook-style files', () => {
    expect(isConventionalEntryFile('features/theme/useEditorState.ts', ['features', 'theme'])).toBe(false);
    expect(isConventionalEntryFile('features/theme/use.ts', ['features', 'theme'])).toBe(false);
    expect(isConventionalEntryFile('features/editorPanel/getEditorState.ts', ['features', 'editorPanel'])).toBe(false);
    expect(isConventionalEntryFile('features/use/useEditorState.ts', ['features', 'use'])).toBe(false);
  });

  it('treats a hook file as conventional when any folder token matches', () => {
    expect(isConventionalEntryFile('features/editor-panel/useEditorState.ts', ['features', 'editorPanel'])).toBe(true);
  });

  it('rejects export files outside export folders even when another folder token matches', () => {
    expect(isConventionalEntryFile('reports/export.ts', ['reports', 'editor'])).toBe(false);
  });
});
