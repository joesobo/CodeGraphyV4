import { describe, expect, it } from 'vitest';
import { createGraphViewProviderFileMethodDelegates } from '../../../../../../src/extension/graphView/provider/source/delegates/file';
import { createMethodSourceOwnerStub } from '../fakes';

describe('source/delegates/file', () => {
  it('forwards file delegates with their arguments', async () => {
    const owner = createMethodSourceOwnerStub();
    owner._viewContext.focusedFile = 'src/focused.ts';
    const delegates = createGraphViewProviderFileMethodDelegates(owner);
    const behavior = { preview: true, preserveFocus: true };

    await delegates._openFile('src/app.ts', behavior);
    await delegates._revealInExplorer('src/app.ts');
    await delegates._copyToClipboard('src/app.ts');
    await delegates._deleteFiles(['src/app.ts']);
    await delegates._renameFile('src/app.ts');
    await delegates._createFile('src');
    await delegates._createFolder('src');
    delegates._toggleFavorites(['src/app.ts']);
    delegates._setFocusedFile('src/app.ts');
    expect(delegates._getFocusedFile!()).toBe('src/focused.ts');
    expect(delegates._getFileInfo!('src/app.ts')).toEqual({ filePath: 'src/app.ts' });
    await delegates._addToExclude(['dist/**']);
    await delegates._openSelectedNode('src/app.ts');
    await delegates._activateNode('src/app.ts');

    expect(owner._fileActionMethods._openFile).toHaveBeenCalledWith('src/app.ts', behavior);
    expect(owner._fileActionMethods._revealInExplorer).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._copyToClipboard).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._deleteFiles).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._fileActionMethods._renameFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._createFile).toHaveBeenCalledWith('src');
    expect(owner._fileActionMethods._createFolder).toHaveBeenCalledWith('src');
    expect(owner._fileActionMethods._toggleFavorites).toHaveBeenCalledWith(['src/app.ts']);
    expect(owner._viewSelectionMethods.setFocusedFile).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileInfoMethods._getFileInfo).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileInfoMethods._addToExclude).toHaveBeenCalledWith(['dist/**']);
    expect(owner._fileActionMethods._openSelectedNode).toHaveBeenCalledWith('src/app.ts');
    expect(owner._fileActionMethods._activateNode).toHaveBeenCalledWith('src/app.ts');
  });
});
