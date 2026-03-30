import { describe, expect, it } from 'vitest';
import { createGraphViewProviderFileTimelineMethodDelegates } from '../../../../../src/extension/graphView/provider/source/fileTimelineDelegates';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/fileTimelineDelegates', () => {
  it('forwards file and timeline delegates with their arguments', async () => {
    const owner = createMethodSourceOwnerStub();
    const delegates = createGraphViewProviderFileTimelineMethodDelegates(owner);
    const behavior = { preview: true, preserveFocus: true };

    await delegates._openFile('src/app.ts', behavior);
    await delegates._revealInExplorer('src/app.ts');
    await delegates._copyToClipboard('src/app.ts');
    await delegates._deleteFiles(['src/app.ts']);
    await delegates._renameFile('src/app.ts');
    await delegates._createFile('src');
    delegates._toggleFavorites(['src/app.ts']);
    delegates._getFileInfo!('src/app.ts');
    delegates._getVisitCount!('src/app.ts');
    delegates._incrementVisitCount!('src/app.ts');
    await delegates._addToExclude(['dist/**']);
    await delegates._indexRepository();
    await delegates._jumpToCommit('abc123');
    await delegates._openSelectedNode('src/app.ts');
    await delegates._activateNode('src/app.ts');
    await (
      delegates._previewFileAtCommit as unknown as (
        sha: string,
        filePath: string,
        behavior?: { preview: boolean; preserveFocus: boolean },
      ) => Promise<void>
    )('abc123', 'src/app.ts', undefined);
    delegates._sendCachedTimeline!();

    expect(owner._fileActionMethods._openFile).toHaveBeenCalledWith('src/app.ts', behavior);
    expect(owner._fileActionMethods._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._fileActionMethods._renameFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._createFile).toHaveBeenCalledWith('src');
    expect(owner._fileActionMethods._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._fileVisitMethods._getFileInfo).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._getVisitCount).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._incrementVisitCount).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileVisitMethods._addToExclude).toHaveBeenCalledWith(['dist/**']);
    expect(owner._timelineMethods._indexRepository).toHaveBeenCalledTimes(1);
    expect(owner._timelineMethods._jumpToCommit).toHaveBeenCalledWith('abc123');
    expect(owner._timelineMethods._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(owner._timelineMethods._activateNode).toHaveBeenCalledWith('src/app.ts');
    expect(owner._timelineMethods._previewFileAtCommit).toHaveBeenCalledWith(
      'abc123',
      'src/app.ts',
      undefined,
    );
    expect(owner._timelineMethods._sendCachedTimeline).toHaveBeenCalledTimes(1);
  });
});
