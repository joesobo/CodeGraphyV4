import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
} from '../../../../src/extension/graphView/analysis/lifecycle';
import { createDefaultGraphViewProviderAnalysisMethodDependencies } from '../../../../src/extension/graphView/provider/analysis';

describe('graphView/provider/analysis default dependencies', () => {
  afterEach(() => {
    vscode.workspace.workspaceFolders = undefined;
    vi.restoreAllMocks();
  });

  it('returns the analysis lifecycle delegates', () => {
    const dependencies = createDefaultGraphViewProviderAnalysisMethodDependencies();

    expect(dependencies.runAnalysisRequest).toBe(runGraphViewProviderAnalysisRequest);
    expect(dependencies.executeAnalysis).toBe(executeGraphViewProviderAnalysis);
    expect(dependencies.markWorkspaceReady).toBe(markGraphViewWorkspaceReady);
    expect(dependencies.isAnalysisStale).toBe(isGraphViewAnalysisStale);
    expect(dependencies.isAbortError).toBe(isGraphViewAbortError);
  });

  it('reports that a workspace exists when folders are present', () => {
    vscode.workspace.workspaceFolders = [{ uri: { fsPath: '/workspace' } }] as never;
    const dependencies = createDefaultGraphViewProviderAnalysisMethodDependencies();

    expect(dependencies.hasWorkspace()).toBe(true);
  });

  it('reports that no workspace exists when folders are absent', () => {
    vscode.workspace.workspaceFolders = undefined;
    const dependencies = createDefaultGraphViewProviderAnalysisMethodDependencies();

    expect(dependencies.hasWorkspace()).toBe(false);
  });

  it('logs analysis errors to the console', () => {
    const error = new Error('analysis failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const dependencies = createDefaultGraphViewProviderAnalysisMethodDependencies();

    dependencies.logError('analysis failed', error);

    expect(consoleError).toHaveBeenCalledWith('analysis failed', error);
  });
});
