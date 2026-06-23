import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { GraphViewPrimaryMessageResult } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import { dispatchGraphViewPrimaryMessage } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import { createPrimaryMessageContext } from '../context';

const primaryDispatchMocks = vi.hoisted(() => ({
  route: vi.fn(),
  stateful: vi.fn(),
}));
const performanceMocks = vi.hoisted(() => ({
  record: vi.fn(),
}));

vi.mock('../../../../../../src/extension/graphView/webview/dispatch/routed', () => ({
  dispatchGraphViewPrimaryRouteMessage: primaryDispatchMocks.route,
}));

vi.mock('../../../../../../src/extension/graphView/webview/dispatch/stateful', () => ({
  dispatchGraphViewPrimaryStateMessage: primaryDispatchMocks.stateful,
}));

vi.mock('../../../../../../src/extension/performance/marks', () => ({
  recordExtensionPerformanceEvent: performanceMocks.record,
}));

describe('graph view primary message dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primaryDispatchMocks.route.mockReset();
    primaryDispatchMocks.stateful.mockReset();
    performanceMocks.record.mockReset();
    delete process.env.CODEGRAPHY_ACCEPTANCE;
  });

  it('returns the routed result when the routed handlers handle the message', async () => {
    const context = createPrimaryMessageContext();
    const routedResult: GraphViewPrimaryMessageResult = { handled: true };
    primaryDispatchMocks.route.mockResolvedValue(routedResult);

    await expect(
      dispatchGraphViewPrimaryMessage({ type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } }, context),
    ).resolves.toBe(routedResult);

    expect(primaryDispatchMocks.route).toHaveBeenCalledWith(
      { type: 'NODE_SELECTED', payload: { nodeId: 'src/app.ts' } },
      context,
    );
    expect(primaryDispatchMocks.stateful).not.toHaveBeenCalled();
  });

  it('falls through to the stateful handlers when routed handlers do not handle the message', async () => {
    const context = createPrimaryMessageContext();
    primaryDispatchMocks.route.mockResolvedValue({ handled: false });
    primaryDispatchMocks.stateful.mockResolvedValue({
      handled: true,
      filterPatterns: ['dist/**'],
    });

    await expect(
      dispatchGraphViewPrimaryMessage(
        { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
        context,
      ),
    ).resolves.toEqual({
      handled: true,
      filterPatterns: ['dist/**'],
    });

    expect(primaryDispatchMocks.stateful).toHaveBeenCalledWith(
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
      context,
    );
  });

  it('saves the requested file through VS Code when the acceptance live-update perf message is enabled', async () => {
    process.env.CODEGRAPHY_ACCEPTANCE = '1';
    const context = createPrimaryMessageContext();
    const insert = vi.fn();
    const edit = vi.fn(async (callback: (builder: { insert: typeof insert }) => void) => {
      callback({ insert });
      return true;
    });
    const save = vi.fn(async () => true);
    const document = {
      lineCount: 7,
      save,
    };
    const editor = { edit };
    (vscode.workspace as unknown as { openTextDocument: ReturnType<typeof vi.fn> })
      .openTextDocument = vi.fn(async () => document);
    (vscode.window as unknown as { showTextDocument: ReturnType<typeof vi.fn> })
      .showTextDocument = vi.fn(async () => editor);

    await expect(
      dispatchGraphViewPrimaryMessage(
        {
          type: 'PERF_SAVE_LIVE_UPDATE_FILE',
          payload: { path: '/workspace/src/app.ts' },
        },
        context,
      ),
    ).resolves.toEqual({ handled: true });

    expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(
      vscode.Uri.file('/workspace/src/app.ts'),
    );
    expect(vscode.window.showTextDocument).toHaveBeenCalledWith(document, {
      preserveFocus: true,
      preview: false,
    });
    expect(insert).toHaveBeenCalledWith(
      new vscode.Position(7, 0),
      expect.stringContaining('CodeGraphy live update perf marker'),
    );
    expect(save).toHaveBeenCalledOnce();
    expect(performanceMocks.record.mock.calls.map(([name]) => name)).toEqual([
      'graphWebview.acceptanceLiveUpdateSave.start',
      'graphWebview.acceptanceLiveUpdateSave.openDocument',
      'graphWebview.acceptanceLiveUpdateSave.showDocument',
      'graphWebview.acceptanceLiveUpdateSave.edit',
      'graphWebview.acceptanceLiveUpdateSave.save',
      'graphWebview.acceptanceLiveUpdateSave.completed',
    ]);
    expect(performanceMocks.record).toHaveBeenCalledWith(
      'graphWebview.acceptanceLiveUpdateSave.completed',
      expect.objectContaining({
        durationMs: expect.any(Number),
        filePath: '/workspace/src/app.ts',
      }),
    );
    expect(primaryDispatchMocks.route).not.toHaveBeenCalled();
    expect(primaryDispatchMocks.stateful).not.toHaveBeenCalled();
  });
});
