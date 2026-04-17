import { describe, expect, it } from 'vitest';
import { createGraphViewProviderFileTimelineMethodDelegates } from '../../../../../../src/extension/graphView/provider/source/delegates/fileTimeline';
import { createMethodSourceOwnerStub } from '../fakes';

describe('source/delegates/fileTimeline', () => {
  it('forwards file and timeline delegates with their arguments', async () => {
    const owner = createMethodSourceOwnerStub();
    owner._viewContext.focusedFile = 'src/focused.ts';
    const delegates = createGraphViewProviderFileTimelineMethodDelegates(owner);
    const behavior = { preview: true, preserveFocus: true };

    await delegates._openFile('src/app.ts', behavior);
    await delegates._revealInExplorer('src/app.ts');
    await delegates._copyToClipboard('src/app.ts');
    await delegates._deleteFiles(['src/app.ts']);
    await delegates._renameFile('src/app.ts');
    await delegates._createFile('src');
    delegates._toggleFavorites(['src/app.ts']);
    delegates._setFocusedFile('src/app.ts');
    expect(delegates._getFocusedFile!()).toBe('src/focused.ts');
    expect(delegates._getFileInfo!('src/app.ts')).toEqual({ filePath: 'src/app.ts' });
    expect(delegates._getVisitCount!('src/app.ts')).toBe(3);
    delegates._incrementVisitCount!('src/app.ts');
    await delegates._addToExclude(['dist/**']);
    await delegates._indexRepository();
    await delegates._jumpToCommit('abc123');
    await delegates._resetTimeline();
    delegates._invalidateTimelineCache!();
    await delegates._openSelectedNode('src/app.ts');
    await delegates._activateNode('src/app.ts');
    await delegates._previewFileAtCommit!('abc123', 'src/app.ts', behavior);
    delegates._sendCachedTimeline!();

    expect(owner._fileActionMethods._openFile).toHaveBeenCalledWith('src/app.ts', behavior);
    expect(owner._fileActionMethods._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._fileActionMethods._renameFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._createFile).toHaveBeenCalledWith('src');
    expect(owner._fileActionMethods._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._viewSelectionMethods.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._getFileInfo).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._getVisitCount).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._incrementVisitCount).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._addToExclude).toHaveBeenCalledWith(['dist/**']);
    expect(owner._timelineMethods._indexRepository).toHaveBeenCalledTimes(1);
    expect(owner._timelineMethods._jumpToCommit).toHaveBeenCalledWith('abc123');
    expect(owner._timelineMethods._resetTimeline).toHaveBeenCalledTimes(1);
    expect(owner._timelineMethods.invalidateTimelineCache).toHaveBeenCalledTimes(1);
    expect(owner._timelineMethods._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(owner._timelineMethods._activateNode).toHaveBeenCalledWith('src/app.ts');
    expect(owner._timelineMethods._previewFileAtCommit).toHaveBeenCalledWith(
      'abc123',
      'src/app.ts',
      behavior,
    );
    expect(owner._timelineMethods._sendCachedTimeline).toHaveBeenCalledTimes(1);
  });
});
