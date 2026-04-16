import { describe, expect, it, vi } from 'vitest';
import {
  addFilterPattern,
  deleteFilterPattern,
  editFilterPattern,
} from '../../../../src/webview/components/settingsPanel/filters/patternActions';

const sentMessages: unknown[] = [];
vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('filters patternActions', () => {
  it('adds normalized patterns and clears the draft value', () => {
    const setFilterPatterns = vi.fn();
    const setNewFilterPattern = vi.fn();

    addFilterPattern(
      ['**/*.tmp'],
      '  **/*.cache  ',
      setFilterPatterns,
      setNewFilterPattern
    );

    expect(setFilterPatterns).toHaveBeenCalledWith(['**/*.tmp', '**/*.cache']);
    expect(setNewFilterPattern).toHaveBeenCalledWith('');
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.tmp', '**/*.cache'] },
    });
  });

  it('ignores invalid draft patterns', () => {
    const setFilterPatterns = vi.fn();
    const setNewFilterPattern = vi.fn();

    addFilterPattern([], '   ', setFilterPatterns, setNewFilterPattern);

    expect(setFilterPatterns).not.toHaveBeenCalled();
    expect(setNewFilterPattern).not.toHaveBeenCalled();
  });

  it('removes a pattern and emits the update', () => {
    const setFilterPatterns = vi.fn();

    deleteFilterPattern(['**/*.tmp', '**/*.cache'], '**/*.tmp', setFilterPatterns);

    expect(setFilterPatterns).toHaveBeenCalledWith(['**/*.cache']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.cache'] },
    });
  });

  it('edits an existing pattern and emits the update', () => {
    const setFilterPatterns = vi.fn();

    editFilterPattern(
      ['**/*.tmp', '**/*.cache'],
      '**/*.tmp',
      '  **/*.log  ',
      setFilterPatterns,
    );

    expect(setFilterPatterns).toHaveBeenCalledWith(['**/*.log', '**/*.cache']);
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['**/*.log', '**/*.cache'] },
    });
  });

  it('ignores invalid edited patterns', () => {
    const setFilterPatterns = vi.fn();

    editFilterPattern(
      ['**/*.tmp', '**/*.cache'],
      '**/*.tmp',
      '   ',
      setFilterPatterns,
    );

    expect(setFilterPatterns).not.toHaveBeenCalled();
  });

  it('skips edits that normalize back to the previous pattern', () => {
    const setFilterPatterns = vi.fn();

    editFilterPattern(
      ['**/*.tmp', '**/*.cache'],
      '**/*.tmp',
      '  **/*.tmp  ',
      setFilterPatterns,
    );

    expect(setFilterPatterns).not.toHaveBeenCalled();
  });
});
