import { describe, expect, it, vi } from 'vitest';
import {
  addFilterPattern,
  deleteFilterPattern,
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
});
